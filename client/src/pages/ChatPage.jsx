import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api, uploadFile } from "../lib/api";
import { getSocket } from "../lib/socket";


function getConversationTitle(conversation, currentUserId) {
  if (conversation.isGroup) {
    return conversation.name || "Group";
  }

  const otherUser = conversation.users.find((user) => user.id !== currentUserId && user._id !== currentUserId);
  return otherUser?.name || "Direct Chat";
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // All registered users
  const [showDirectory, setShowDirectory] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  
  // Voice Notes
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // Pagination & Load More State
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messageStreamRef = useRef(null);
  const observerTarget = useRef(null);

  // Search state
  const [contactSearch, setContactSearch] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState("");
  const [addContactSuccess, setAddContactSuccess] = useState("");

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileBio, setProfileBio] = useState(user?.bio || "");
  const [profileImageFile, setProfileImageFile] = useState(null);

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("chat-theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("chat-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    if (!user) {
      return;
    }

    (async () => {
      const [contactsResponse, conversationResponse, allUsersResponse] = await Promise.all([
        api.get("/users/contacts"),
        api.get("/conversations"),
        api.get("/users"),
      ]);

      setContacts(contactsResponse.data);
      setConversations(conversationResponse.data);
      setAllUsers(allUsersResponse.data);

      if (!socket.connected) socket.connect();

      // Join rooms for all existing conversations to receive background messages
      conversationResponse.data.forEach((conv) => {
        socket.emit("join-room", conv._id);
      });

      if (conversationResponse.data.length > 0) {
        setActiveConversation(conversationResponse.data[0]);
      }
    })().catch(() => {
      // Keep UI stable on fetch failures; user can retry by refresh.
    });

    // Request Push Notification Subscription
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/service-worker.js').then(async (registration) => {
        try {
          const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (!publicVapidKey) return;
          
          // Helper to convert base64 to Uint8Array
          const urlBase64ToUint8Array = (base64String) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
          };

          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
          });
          
          await api.post('/users/push/subscribe', { subscription });
        } catch (err) {
          console.log("Could not subscribe to push notifications", err);
        }
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("register-user", user.id);

    socket.on("receive-message", (message) => {
      if (message.conversationId === activeConversation?._id) {
        setMessages((current) => {
          // Prevent duplicates if already there
          if (current.some(m => m._id === message._id)) return current;
          
          setTimeout(() => {
            if (messageStreamRef.current) {
              messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
            }
          }, 50);

          return [...current, message];
        });
        
        // Notify sender it was delivered (or read if window is active)
        if (message.senderId._id !== user.id) {
           api.post(`/conversations/${message.conversationId}/seen`);
           socket.emit("message-seen", { messageId: message._id, conversationId: message.conversationId, userId: user.id });
        }
      }

      setConversations((current) => {
        const next = [...current];
        const index = next.findIndex((conversation) => conversation._id === message.conversationId);

        if (index >= 0) {
          const conversation = { ...next[index], lastMessage: message };
          // Increment unread count if we are not actively in this format
          if (message.conversationId !== activeConversation?._id && message.senderId._id !== user.id) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
          next.splice(index, 1);
          return [conversation, ...next];
        }

        return current;
      });
    });

    socket.on("new-conversation", (conversation) => {
      setConversations((current) => {
        const existing = current.filter((item) => item._id !== conversation._id);
        return [conversation, ...existing];
      });
    });

    socket.on("user-typing", ({ userId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    });

    socket.on("user-stop-typing", ({ userId }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on("online-users", (userIds) => {
      setOnlineUserIds(new Set(userIds));
    });

    socket.on("message-status-update", ({ messageId, status, conversationId }) => {
      if (conversationId === activeConversation?._id) {
        setMessages(current => current.map(msg => 
          msg._id === messageId || msg.status === 'sent' // Optimistically update previous as well
            ? { ...msg, status } 
            : msg
        ));
      }
    });

    socket.on("message-deleted", ({ messageId, conversationId, body }) => {
      if (conversationId === activeConversation?._id) {
        setMessages((current) => current.map(msg => 
          msg._id === messageId 
            ? { ...msg, isDeleted: true, body, image: undefined, audio: undefined } 
            : msg
        ));
      }

      setConversations((current) => {
        const next = [...current];
        const index = next.findIndex((c) => c._id === conversationId);
        if (index >= 0 && next[index].lastMessage?._id === messageId) {
          next[index] = { 
            ...next[index], 
            lastMessage: { ...next[index].lastMessage, isDeleted: true, body, image: undefined, audio: undefined } 
          };
        }
        return next;
      });
    });

    return () => {
      socket.off("receive-message");
      socket.off("new-conversation");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("online-users");
      socket.off("message-status-update");
      socket.off("message-deleted");
    };
  }, [socket, user, activeConversation?._id]);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      setCursor(null);
      setHasMore(false);
      return;
    }

    setCursor(null);
    setHasMore(false);

    // Clear unread count locally when opened
    setConversations(current => 
      current.map(c => c._id === activeConversation._id ? { ...c, unreadCount: 0 } : c)
    );

    socket.emit("join-room", activeConversation._id);

    api.get(`/messages/${activeConversation._id}?limit=20`).then((response) => {
      setMessages(response.data.messages);
      setCursor(response.data.nextCursor);
      setHasMore(response.data.hasMore);
      
      // Scroll bottom initially
      setTimeout(() => {
         if (messageStreamRef.current) {
           messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
         }
      }, 50);
    });

    api.post(`/conversations/${activeConversation._id}/seen`).catch(() => {
      // Non-critical for primary chat experience.
    });
  }, [activeConversation, socket]);

  const loadMoreMessages = async () => {
    if (!cursor || !activeConversation || loadingMore) return;
    setLoadingMore(true);
    try {
      const prevHeight = messageStreamRef.current?.scrollHeight;
      const res = await api.get(`/messages/${activeConversation._id}?cursor=${cursor}&limit=20`);
      
      setMessages(prev => [...res.data.messages, ...prev]);
      setCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);

      // Restore scroll position so user isn't snapped to the top
      setTimeout(() => {
        if (messageStreamRef.current) {
           const newHeight = messageStreamRef.current.scrollHeight;
           messageStreamRef.current.scrollTop = newHeight - prevHeight;
        }
      }, 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreMessages();
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loadingMore, cursor, activeConversation]);

  const handleTyping = (event) => {
    setDraft(event.target.value);
    
    if (!socket.connected || !activeConversation) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", { roomId: activeConversation._id, userId: user.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing", { roomId: activeConversation._id, userId: user.id });
      setIsTyping(false);
    }, 2000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlobObj = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlobObj);
        setAudioUrl(URL.createObjectURL(audioBlobObj));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  async function sendMessage(event) {
    if (event) event.preventDefault();
    if ((!draft.trim() && !imageFile && !audioBlob) || !activeConversation) {
      return;
    }

    setSending(true);
    socket.emit("stop-typing", { roomId: activeConversation._id, userId: user.id });
    setIsTyping(false);
    
    const text = draft;
    const file = imageFile;
    const audio = audioBlob;
    setDraft("");
    setImageFile(null);
    setAudioBlob(null);
    setAudioUrl(null);

    try {
      let imageUrl = undefined;
      if (file) {
        imageUrl = await uploadFile(file); // assuming we renamed and exported uploadFile
      }
      
      let uploadedAudioUrl = undefined;
      if (audio) {
        // We'll rename uploadImage to uploadFile in api.js and use it here
        const audioFile = new File([audio], "audio.webm", { type: "audio/webm" });
        uploadedAudioUrl = await uploadFile(audioFile);
      }

      const response = await api.post("/messages", {
        message: text.trim() ? text : undefined,
        image: imageUrl,
        audio: uploadedAudioUrl,
        conversationId: activeConversation._id,
      });

      const newMessage = response.data;

      // Optimistically update the message stream
      setMessages((current) => {
        if (current.some(m => m._id === newMessage._id)) return current;
        setTimeout(() => {
          if (messageStreamRef.current) {
            messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
          }
        }, 50);
        return [...current, newMessage];
      });

      // BUMP conversation to top locally immediately
      setConversations((current) => {
        const next = [...current];
        const index = next.findIndex((c) => c._id === newMessage.conversationId);
        if (index >= 0) {
          const conversation = { ...next[index], lastMessage: newMessage };
          next.splice(index, 1);
          return [conversation, ...next];
        }
        return current;
      });

    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    try {
      let imageUrl = user.image;
      if (profileImageFile) {
        imageUrl = await uploadFile(profileImageFile);
      }
      
      await api.put("/users/profile", {
        name: profileName,
        bio: profileBio,
        image: imageUrl
      });

      // Simple refresh to get new context
      window.location.reload(); 
    } catch (err) {
      console.error("Failed to update profile", err);
    }
  }

  async function startConversation(targetUser) {
    const response = await api.post("/conversations", {
      userId: targetUser.id || targetUser._id,
      isGroup: false,
    });

    setConversations((current) => {
      const withoutExisting = current.filter((item) => item._id !== response.data._id);
      return [response.data, ...withoutExisting];
    });

    setActiveConversation(response.data);
  }

  async function handleAddContactByEmail(e) {
    e.preventDefault();
    if (!newContactEmail.trim()) return;
    
    setAddingContact(true);
    setAddContactError("");
    setAddContactSuccess("");
    
    try {
      await api.post("/users/contacts", { email: newContactEmail.trim() });
      setAddContactSuccess("Contact added!");
      setNewContactEmail("");
      
      // Refresh contacts
      const res = await api.get("/users/contacts");
      setContacts(res.data);
      
      setTimeout(() => setAddContactSuccess(""), 3000);
    } catch (err) {
      setAddContactError(err.response?.data?.message || "Failed to add contact");
    } finally {
      setAddingContact(false);
    }
  }

  const filteredContacts = contacts.filter((entry) =>
    entry.name.toLowerCase().includes(contactSearch.toLowerCase()) || entry.email.toLowerCase().includes(contactSearch.toLowerCase()),
  );

  const filteredUsers = allUsers.filter((entry) =>
    entry.name.toLowerCase().includes(newContactEmail.toLowerCase()) || entry.email.toLowerCase().includes(newContactEmail.toLowerCase()),
  );

  const renderMessageStatus = (message) => {
    if ((message.senderId.id || message.senderId._id) !== user.id) return null;
    
    // Status can be accessed optionally if mapped, but if seenIds is populated correctly we can fall back to checking that
    // If the conversation's other user is in seenIds, it's read.
    const isRead = message.status === 'read' || (message.seenIds && message.seenIds.some(id => id !== user.id && id !== user._id));
    if (isRead) {
      return <span style={{ color: '#4ade80', fontSize: '12px', marginLeft: '5px' }}>✓✓</span>;
    }
    if (message.status === 'delivered') {
      return <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '5px' }}>✓✓</span>;
    }
    // Default sent
    return <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '5px' }}>✓</span>;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="chat-shell">
      <aside className="left-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => setIsEditingProfile(true)}
            title="Edit Profile"
          >
            {user.image ? (
              <img src={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000"}${user.image}`} alt="avatar" style={{width: 40, height: 40, borderRadius: '50%', objectFit: 'cover'}} />
            ) : (
              <div style={{width: 40, height: 40, borderRadius: '50%', backgroundColor: '#007bff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'}}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2>NextTalk</h2>
              <small>{user.name}</small>
            </div>
          </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="ghost" 
                onClick={toggleTheme} 
                type="button" 
                title="Toggle Dark Mode"
                style={{ padding: '0.4rem' }}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button className="ghost" onClick={logout} type="button">
                Logout
              </button>
            </div>
              const isOtherUserOnline = conversation.isGroup ? false : conversation.users.some(u => (u._id !== user.id && u.id !== user.id) && onlineUserIds.has(u._id || u.id));
              return (
              <button
                key={conversation._id}
                className={conversation._id === activeConversation?._id ? "list-item active" : "list-item"}
                type="button"
                onClick={() => setActiveConversation(conversation)}
                style={{ position: 'relative' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <strong>{getConversationTitle(conversation, user.id)}</strong>
                  {isOtherUserOnline && <div style={{width: 8, height: 8, borderRadius: '50%', background: '#4ade80'}} title="Online" />}
                </div>
                <span>
                  {conversation.lastMessage?.isDeleted ? "🚫 This message was deleted" : 
                   conversation.lastMessage?.audio ? "🎤 Audio message" : 
                   conversation.lastMessage?.image ? "📷 Image" : 
                   conversation.lastMessage?.body || "No messages yet"}
                </span>
                {conversation.unreadCount > 0 && (
                  <div style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    background: '#25D366', color: 'white', borderRadius: '50%', padding: '2px 6px',
                    fontSize: '10px', fontWeight: 'bold', minWidth: '18px', textAlign: 'center'
                  }}>
                    {conversation.unreadCount}
                  </div>
                )}
              </button>
            )})}
          </div>
        </section>

        <section>
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Connections
            <button
              className="ghost"
              onClick={() => setShowDirectory(!showDirectory)}
              style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
            >
              {showDirectory ? "Hide Global Directory" : "Global Directory"}
            </button>
          </h3>
          
          {showDirectory ? (
            <>
              <input
                className="search-input"
                placeholder="Search registered users..."
                value={newContactEmail}
                onChange={(event) => setNewContactEmail(event.target.value)}
                style={{ marginBottom: '10px' }}
              />
              <div className="list compact" style={{ maxHeight: "250px", overflowY: "auto" }}>
                {filteredUsers.map((targetUser) => (
                  <button
                    className="list-item"
                    key={targetUser._id}
                    type="button"
                    onClick={() => {
                      startConversation(targetUser);
                      setShowDirectory(false);
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {targetUser.image ? (
                        <img src={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000"}${targetUser.image}`} alt="avatar" style={{width: 30, height: 30, borderRadius: '50%', objectFit: 'cover'}} />
                      ) : (
                        <div style={{width: 30, height: 30, borderRadius: '50%', backgroundColor: '#00a884', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px'}}>
                          {targetUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{targetUser.name}</strong>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{targetUser.email}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No registered users found.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <input
                className="search-input"
                placeholder="Search existing contacts..."
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                style={{ marginBottom: '10px' }}
              />
              <div className="list compact" style={{ maxHeight: "250px", overflowY: "auto" }}>
                {filteredContacts.map((targetUser) => (
                  <button
                    className="list-item"
                    key={targetUser.id || targetUser._id}
                    type="button"
                    onClick={() => startConversation(targetUser)}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {targetUser.image ? (
                        <img src={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000"}${targetUser.image}`} alt="avatar" style={{width: 30, height: 30, borderRadius: '50%', objectFit: 'cover'}} />
                      ) : (
                        <div style={{width: 30, height: 30, borderRadius: '50%', backgroundColor: '#007bff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px'}}>
                          {targetUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong>{targetUser.name}</strong>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{targetUser.email}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <h3>
            {activeConversation ? getConversationTitle(activeConversation, user.id) : "Select a conversation"}
          </h3>
        </header>

        <div className="message-stream" ref={messageStreamRef}>
          <div ref={observerTarget} style={{ height: "1px", visibility: "hidden" }} />
          {loadingMore && <div style={{ textAlign: "center", padding: "10px", fontSize: "12px", color: "#888" }}>Loading older messages...</div>}
          
          {messages.map((message) => (
            <div
              key={message._id}
              className={
                (message.senderId.id || message.senderId._id) === user.id ? "message own" : "message"
              }
            >
              <div className="message-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {message.senderId.name} 
                </div>
                {(message.senderId.id || message.senderId._id) === user.id && !message.isDeleted && (
                  <button 
                    onClick={() => {
                       if (window.confirm("Delete this message for everyone?")) {
                          api.delete(`/messages/${message._id}`).catch(err => console.error(err));
                       }
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '12px' }}
                    title="Delete message"
                  >
                    🗑
                  </button>
                )}
              </div>
              {message.isDeleted ? (
                <div style={{ fontStyle: "italic", color: "#888", display: "flex", alignItems: "center", gap: "5px" }}>
                  🚫 {message.body}
                </div>
              ) : (
                <>
                  {message.image && (
                    <div style={{ marginBottom: "5px" }}>
                      <img
                        src={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000"}${message.image}`}
                        alt="attachment"
                        onClick={() => setZoomedImage(`${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000"}${message.image}`)}
                        style={{ maxWidth: "250px", borderRadius: "8px", display: "block", cursor: "pointer", transition: "opacity 0.2s" }}
                        onMouseOver={e => e.currentTarget.style.opacity = 0.8}
                        onMouseOut={e => e.currentTarget.style.opacity = 1}
                      />
                    </div>
                  )}
                  {message.body && <div>{message.body}</div>}
                  {message.audio && (
                    <div style={{ marginTop: "5px" }}>
                      <audio controls src={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000"}${message.audio}`} style={{ width: "250px", height: "40px" }} />
                    </div>
                  )}
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2, alignItems: 'center', gap: '5px' }}>
                <small style={{ fontSize: '10px', color: '#9ca3af' }}>
                  {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
                {renderMessageStatus(message)}
              </div>
            </div>
          ))}
          {activeConversation && Array.from(typingUsers).filter(id => activeConversation.users.some(u => (u._id || u.id) === id)).length > 0 && (
            <div className="message" style={{ background: "transparent", fontStyle: "italic", color: "#888" }}>
              Someone is typing...
            </div>
          )}
        </div>

        <form className="composer" onSubmit={sendMessage} style={{ flexDirection: "column", gap: "10px" }}>
          {imageFile && (
            <div className="image-preview" style={{ padding: "8px", background: "#f0f0f0", borderRadius: "4px", alignSelf: "flex-start", display: "flex", gap: "10px", alignItems: "center" }}>
              <img src={URL.createObjectURL(imageFile)} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
              <span style={{ fontSize: "14px", color: "#333", maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {imageFile.name}
              </span>
              <button 
                type="button" 
                onClick={() => setImageFile(null)}
                disabled={sending}
                style={{ padding: "2px 6px", background: "#ff4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: sending ? 0.5 : 1 }}
              >
                X
              </button>
            </div>
          )}
          {audioUrl && (
            <div className="audio-preview" style={{ padding: "8px", background: "#f0f0f0", borderRadius: "4px", alignSelf: "flex-start", display: "flex", gap: "10px", alignItems: "center" }}>
              <audio controls src={audioUrl} style={{ height: "30px" }} />
              <button 
                type="button" 
                onClick={cancelRecording}
                disabled={sending}
                style={{ padding: "2px 6px", background: "#ff4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", opacity: sending ? 0.5 : 1 }}
              >
                X
              </button>
            </div>
          )}
          <div style={{ display: "flex", width: "100%", gap: "10px", alignItems: "center" }}>
            <input
              type="file"
              accept="image/*"
              id="file-upload"
              style={{ display: "none" }}
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            <label 
              htmlFor="file-upload" 
              style={{ cursor: "pointer", fontSize: "24px", opacity: (!activeConversation || sending) ? 0.5 : 1, pointerEvents: (!activeConversation || sending) ? "none" : "auto" }}
              title="Attach image"
            >
              📷
            </label>
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={!activeConversation || sending}
                style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "24px", padding: 0, opacity: (!activeConversation || sending) ? 0.5 : 1 }}
                title="Record audio"
              >
                🎤
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                style={{ background: "#ff4444", color: "white", border: "none", borderRadius: "50%", cursor: "pointer", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Stop recording"
              >
                ⏹
              </button>
            )}
            <input
              value={draft}
              onChange={handleTyping}
              placeholder="Write a message"
              disabled={!activeConversation || sending || isRecording}
              style={{ flex: 1, padding: '10px', opacity: isRecording ? 0.5 : 1 }}
            />
            <button type="submit" disabled={!activeConversation || sending || isRecording || (!draft.trim() && !imageFile && !audioBlob)}>
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </form>
      </main>

      {zoomedImage && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onClick={() => setZoomedImage(null)}
        >
          <button 
            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'white', fontSize: 30, cursor: 'pointer' }}
            onClick={() => setZoomedImage(null)}
          >
            &times;
          </button>
          <img src={zoomedImage} alt="zoomed" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}

      {isEditingProfile && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3>Edit Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label>Name</label>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label>Bio</label>
              <textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', minHeight: '60px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label>Avatar image</label>
              <input type="file" accept="image/*" onChange={(e) => setProfileImageFile(e.target.files?.[0])} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={() => setIsEditingProfile(false)} style={{ background: '#eee', color: '#333', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleUpdateProfile} style={{ background: '#007bff', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




