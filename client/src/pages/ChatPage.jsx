import { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api, uploadImage } from "../lib/api";
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

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    if (!user) {
      return;
    }

    (async () => {
      const [contactsResponse, conversationResponse] = await Promise.all([
        api.get("/users/contacts"),
        api.get("/conversations"),
      ]);

      setContacts(contactsResponse.data);
      setConversations(conversationResponse.data);

      if (conversationResponse.data.length > 0) {
        setActiveConversation(conversationResponse.data[0]);
      }
    })().catch(() => {
      // Keep UI stable on fetch failures; user can retry by refresh.
    });
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

    return () => {
      socket.off("receive-message");
      socket.off("new-conversation");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("online-users");
      socket.off("message-status-update");
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

  async function sendMessage(event) {
    event.preventDefault();
    if ((!draft.trim() && !imageFile) || !activeConversation) {
      return;
    }

    setSending(true);
    socket.emit("stop-typing", { roomId: activeConversation._id, userId: user.id });
    setIsTyping(false);
    
    const text = draft;
    const file = imageFile;
    setDraft("");
    setImageFile(null);

    try {
      let imageUrl = undefined;
      if (file) {
        imageUrl = await uploadImage(file);
      }

      await api.post("/messages", {
        message: text.trim() ? text : undefined,
        image: imageUrl,
        conversationId: activeConversation._id,
      });
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
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
        <div className="panel-header">
          <div>
            <h2>NextTalk MERN</h2>
            <small>{user.name}</small>
          </div>
          <button className="ghost" onClick={logout} type="button">
            Logout
          </button>
        </div>

        <section>
          <h3>Conversations</h3>
          <div className="list">
            {conversations.map((conversation) => {
              const isOtherUserOnline = conversation.isGroup ? false : conversation.users.some(u => (u._id !== user.id && u.id !== user.id) && onlineUserIds.has(u._id || u.id));
              return (
              <button
                key={conversation._id}
                className={conversation._id === activeConversation?._id ? "list-item active" : "list-item"}
                type="button"
                onClick={() => setActiveConversation(conversation)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <strong>{getConversationTitle(conversation, user.id)}</strong>
                  {isOtherUserOnline && <div style={{width: 8, height: 8, borderRadius: '50%', background: '#4ade80'}} title="Online" />}
                </div>
                <span>{conversation.lastMessage?.body || "No messages yet"}</span>
              </button>
            )})}
          </div>
        </section>

        <section>
          <h3>Contacts</h3>
          <input
            className="search-input"
            placeholder="Search contacts"
            value={contactSearch}
            onChange={(event) => setContactSearch(event.target.value)}
          />
          <div className="list compact" style={{ maxHeight: "200px", overflowY: "auto" }}>
            {filteredContacts.map((targetUser) => (
              <button
                className="list-item"
                key={targetUser.id || targetUser._id}
                type="button"
                onClick={() => startConversation(targetUser)}
              >
                <strong>{targetUser.name}</strong>
                <span>{targetUser.email}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Add New Contact</h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }} onSubmit={handleAddContactByEmail}>
            <div style={{ display: 'flex', gap: '5px' }}>
              <input
                className="search-input"
                style={{ margin: 0, flex: 1 }}
                type="email"
                placeholder="Enter user email"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
              />
              <button type="submit" disabled={addingContact}>Add</button>
            </div>
            {addContactError && <span style={{ color: 'red', fontSize: '12px' }}>{addContactError}</span>}
            {addContactSuccess && <span style={{ color: 'green', fontSize: '12px' }}>{addContactSuccess}</span>}
          </form>
        </section>
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
              <div className="message-meta">{message.senderId.name}</div>
              {message.image && (
                <div style={{ marginBottom: "5px" }}>
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000"}${message.image}`}
                    alt="attachment"
                    style={{ maxWidth: "250px", borderRadius: "8px", display: "block" }}
                  />
                </div>
              )}
              {message.body && <div>{message.body}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
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
              <span style={{ fontSize: "14px", color: "#333" }}>{imageFile.name}</span>
              <button 
                type="button" 
                onClick={() => setImageFile(null)}
                style={{ padding: "2px 6px", background: "#ff4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
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
              ðŸ“·
            </label>
            <input
              value={draft}
              onChange={handleTyping}
              placeholder="Write a message"
              disabled={!activeConversation || sending}
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={!activeConversation || sending}>
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}




