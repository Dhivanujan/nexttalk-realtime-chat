import { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api, uploadFile } from "../lib/api";
import { getSocket } from "../lib/socket";


function getConversationTitle(conversation, currentUserId) {
  if (conversation.type === "channel") {
    return `#${conversation.name || "channel"}`;
  }

  if (conversation.isGroup || conversation.type === "group") {
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
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);
  const isAtBottomRef = useRef(true);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchDeltaRef = useRef({ x: 0, y: 0 });
  const [bumpConversationId, setBumpConversationId] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelMembers, setChannelMembers] = useState([]);
  const [channelDescription, setChannelDescription] = useState("");
  const [channelImageFile, setChannelImageFile] = useState(null);
  const [channelReadOnly, setChannelReadOnly] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [reactionPickerId, setReactionPickerId] = useState(null);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [channelSettingsName, setChannelSettingsName] = useState("");
  const [channelSettingsMembers, setChannelSettingsMembers] = useState([]);
  const [channelSettingsAdmins, setChannelSettingsAdmins] = useState([]);
  const [channelSettingsDescription, setChannelSettingsDescription] = useState("");
  const [channelSettingsImage, setChannelSettingsImage] = useState("");
  const [channelSettingsImageFile, setChannelSettingsImageFile] = useState(null);
  const [channelSettingsReadOnly, setChannelSettingsReadOnly] = useState(false);
  const [channelSettingsOwnerId, setChannelSettingsOwnerId] = useState("");
  const [channelAuditLog, setChannelAuditLog] = useState([]);
  const [showAvatarCropper, setShowAvatarCropper] = useState(false);
  const [avatarCropTarget, setAvatarCropTarget] = useState(null);
  const [avatarCropImageUrl, setAvatarCropImageUrl] = useState("");
  const [avatarCropZoom, setAvatarCropZoom] = useState(1);
  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    const stored = localStorage.getItem("chat-haptics");
    return stored === null ? true : stored === "true";
  });

  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_URL?.replace(/\/api$/, "") || "http://localhost:5000",
    [],
  );

  const resolveMediaUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) return path;
    return `${baseUrl}${path}`;
  };

  const stickerOptions = useMemo(
    () => [
      "/stickers/star.svg",
      "/stickers/heart.svg",
      "/stickers/smile.svg",
      "/stickers/rocket.svg",
      "/stickers/wave.svg",
      "/stickers/spark.svg",
    ],
    [],
  );

  const emojiOptions = useMemo(
    () => [
      "😀", "😁", "😂", "🤣", "😅", "😊", "😍", "😘", "😎", "🤩",
      "🤝", "👍", "👏", "🙌", "🙏", "🔥", "✨", "🎉", "💯", "❤️",
      "💙", "💚", "💛", "💜", "🧡", "🤍", "🤔", "😴", "🤯", "🥳",
      "😇", "🤗", "😮", "😢", "😡", "👀", "👋", "🤖", "🐱", "🐶",
    ],
    [],
  );

  // Theme State
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("chat-theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("chat-theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 900) {
        setIsMobileChatOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const messageStream = messageStreamRef.current;
    if (!messageStream) return;

    const handleScroll = () => {
      const nearBottom = messageStream.scrollHeight - messageStream.scrollTop - messageStream.clientHeight < 120;
      isAtBottomRef.current = nearBottom;
      if (nearBottom) {
        setShowNewMessagePill(false);
      }
    };

    messageStream.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => messageStream.removeEventListener("scroll", handleScroll);
  }, [activeConversation?._id]);

  const toggleTheme = () => {
    setStickerPickerOpen(false);
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const triggerHaptic = (pattern = 10) => {
    if (hapticsEnabled && window.innerWidth < 900 && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  useEffect(() => {
    localStorage.setItem("chat-haptics", String(hapticsEnabled));
  }, [hapticsEnabled]);

  const bumpConversation = (conversationId) => {
    setBumpConversationId(conversationId);
    setTimeout(() => {
      setBumpConversationId((current) => (current === conversationId ? null : current));
    }, 420);
  };
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
      const shouldAutoScroll = isAtBottomRef.current;
      if (message.conversationId === activeConversation?._id) {
        setStickerPickerOpen(false);
        setReactionPickerId(null);
        setMessages((current) => {
          // Prevent duplicates if already there
          if (current.some(m => m._id === message._id)) return current;
          
          setTimeout(() => {
            if (messageStreamRef.current) {
              if (shouldAutoScroll) {
                messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
              } else {
                setShowNewMessagePill(true);
              }
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
          const updatedList = [conversation, ...next];
          bumpConversation(conversation._id);
          if (window.innerWidth < 900 && !isMobileChatOpen && message.senderId._id !== user.id) {
            setActiveConversation(conversation);
            setIsMobileChatOpen(true);
          }
          return updatedList;
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

    socket.on("message-reaction-updated", (updatedMessage) => {
      setMessages((current) =>
        current.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)),
      );

      setConversations((current) =>
        current.map((conv) =>
          conv.lastMessage?._id === updatedMessage._id
            ? { ...conv, lastMessage: updatedMessage }
            : conv,
        ),
      );
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
      socket.off("message-reaction-updated");
    };
  }, [socket, user, activeConversation?._id, isMobileChatOpen]);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      setCursor(null);
      setHasMore(false);
      setShowNewMessagePill(false);
      setPinnedMessages([]);
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

  useEffect(() => {
    if (!isChannel || !activeConversation) {
      setChannelSettingsName("");
      setChannelSettingsMembers([]);
      setChannelSettingsAdmins([]);
      setChannelSettingsDescription("");
      setChannelSettingsImage("");
      setChannelSettingsImageFile(null);
      setChannelSettingsReadOnly(false);
      setChannelSettingsOwnerId("");
      setChannelAuditLog([]);
      return;
    }

    api.get(`/conversations/${activeConversation._id}/channel-settings`)
      .then((response) => {
        setChannelSettingsName(response.data.name || "");
        const memberIds = response.data.users?.map((member) => member._id?.toString?.() || member._id) || [];
        setChannelSettingsMembers(memberIds);
        const adminIds = response.data.channelAdminIds?.map((id) => id?.toString?.() || id) || [];
        setChannelSettingsAdmins(adminIds);
        setChannelSettingsDescription(response.data.description || "");
        setChannelSettingsImage(response.data.image || "");
        setChannelSettingsReadOnly(Boolean(response.data.isReadOnly));
        setChannelSettingsOwnerId(response.data.channelOwnerId?.toString?.() || response.data.channelOwnerId || "");
      })
      .catch(() => {
        setChannelSettingsName(activeConversation.name || "");
        setChannelSettingsMembers(
          activeConversation.users?.map((member) => member._id?.toString?.() || member.id || member._id) || [],
        );
        setChannelSettingsAdmins(
          activeConversation.channelAdminIds?.map((id) => id?._id || id) || [],
        );
        setChannelSettingsDescription(activeConversation.description || "");
        setChannelSettingsImage(activeConversation.image || "");
        setChannelSettingsReadOnly(Boolean(activeConversation.isReadOnly));
        setChannelSettingsOwnerId(activeConversation.channelOwnerId?._id || activeConversation.channelOwnerId || "");
      });
  }, [activeConversation, isChannel]);

  useEffect(() => {
    if (!showChannelSettings || !isChannel || !activeConversation) {
      return;
    }

    api.get(`/conversations/${activeConversation._id}/channel-audit`)
      .then((response) => setChannelAuditLog(response.data))
      .catch(() => setChannelAuditLog([]));
  }, [showChannelSettings, isChannel, activeConversation]);

  useEffect(() => {
    if (!activeConversation) {
      return;
    }

    api.get(`/conversations/${activeConversation._id}/pins`)
      .then((response) => setPinnedMessages(response.data))
      .catch(() => setPinnedMessages([]));
  }, [activeConversation?._id]);

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
    if (!canPostInChannel) {
      return;
    }
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

  const appendMessage = (newMessage) => {
    setMessages((current) => {
      if (current.some((m) => m._id === newMessage._id)) return current;
      setTimeout(() => {
        if (messageStreamRef.current) {
          messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
        }
      }, 50);
      return [...current, newMessage];
    });

    setConversations((current) => {
      const next = [...current];
      const index = next.findIndex((c) => c._id === newMessage.conversationId);
      if (index >= 0) {
        const conversation = { ...next[index], lastMessage: newMessage };
        next.splice(index, 1);
        bumpConversation(conversation._id);
        return [conversation, ...next];
      }
      return current;
    });
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      const response = await api.post(`/messages/${messageId}/reactions`, { emoji });
      const updatedMessage = response.data;
      setMessages((current) => current.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg)));
      setReactionPickerId(null);
    } catch (error) {
      console.error("Failed to update reaction", error);
    }
  };

  const handlePinMessage = async (messageId) => {
    if (!activeConversation) return;
    try {
      const response = await api.post(`/conversations/${activeConversation._id}/pin`, { messageId });
      setPinnedMessages(response.data);
    } catch (error) {
      console.error("Failed to pin message", error);
    }
  };

  const handleUnpinMessage = async (messageId) => {
    if (!activeConversation) return;
    try {
      const response = await api.delete(`/conversations/${activeConversation._id}/pin/${messageId}`);
      setPinnedMessages(response.data);
    } catch (error) {
      console.error("Failed to unpin message", error);
    }
  };

  const handleCreateChannel = async (event) => {
    event.preventDefault();
    if (!channelName.trim()) return;

    try {
      let uploadedImage = "";
      if (channelImageFile) {
        uploadedImage = await uploadFile(channelImageFile);
      }

      const response = await api.post("/conversations", {
        type: "channel",
        name: channelName.trim(),
        description: channelDescription.trim(),
        image: uploadedImage,
        isReadOnly: channelReadOnly,
        members: channelMembers,
      });
      setConversations((current) => [response.data, ...current]);
      setActiveConversation(response.data);
      setChannelName("");
      setChannelMembers([]);
      setChannelDescription("");
      setChannelImageFile(null);
      setChannelReadOnly(false);
      setShowChannelModal(false);
    } catch (error) {
      console.error("Failed to create channel", error);
    }
  };

  const handleSaveChannelSettings = async (event) => {
    event.preventDefault();
    if (!activeConversation) return;

    try {
      let nextImage = channelSettingsImage;
      if (channelSettingsImageFile) {
        nextImage = await uploadFile(channelSettingsImageFile);
      }

      const response = await api.patch(`/conversations/${activeConversation._id}/channel-settings`, {
        name: channelSettingsName.trim(),
        description: channelSettingsDescription.trim(),
        image: nextImage,
        isReadOnly: channelSettingsReadOnly,
        memberIds: channelSettingsMembers,
        adminIds: channelSettingsAdmins,
        ownerId: channelSettingsOwnerId || undefined,
      });

      setConversations((current) =>
        current.map((conversation) =>
          conversation._id === response.data._id ? response.data : conversation,
        ),
      );
      setActiveConversation(response.data);
      setShowChannelSettings(false);
      setChannelSettingsImageFile(null);
    } catch (error) {
      console.error("Failed to update channel settings", error);
    }
  };

  const openAvatarCropper = (file, target) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarCropImageUrl(reader.result);
      setAvatarCropZoom(1);
      setAvatarCropTarget(target);
      setShowAvatarCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const applyAvatarCrop = async () => {
    if (!avatarCropImageUrl) return;

    const image = new Image();
    image.src = avatarCropImageUrl;
    await image.decode();

    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = avatarCropZoom;
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    const dx = (size - scaledWidth) / 2;
    const dy = (size - scaledHeight) / 2;

    ctx.drawImage(image, dx, dy, scaledWidth, scaledHeight);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;

    const croppedFile = new File([blob], "channel-avatar.png", { type: "image/png" });
    if (avatarCropTarget === "create") {
      setChannelImageFile(croppedFile);
    } else {
      setChannelSettingsImageFile(croppedFile);
      setChannelSettingsImage(URL.createObjectURL(blob));
    }

    setShowAvatarCropper(false);
  };

  const sendSticker = async (stickerPath) => {
    if (!activeConversation || sending || !canPostInChannel) return;
    setSending(true);
    setStickerPickerOpen(false);

    try {
      const response = await api.post("/messages", {
        sticker: stickerPath,
        conversationId: activeConversation._id,
      });
      appendMessage(response.data);
    } catch (error) {
      console.error("Failed to send sticker", error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (messageStreamRef.current) {
      messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
      setShowNewMessagePill(false);
      triggerHaptic(12);
    }
  };

  const handleTouchStart = (event) => {
    if (window.innerWidth >= 900) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchDeltaRef.current = { x: 0, y: 0 };
  };

  const handleTouchMove = (event) => {
    if (window.innerWidth >= 900) return;
    const touch = event.touches[0];
    touchDeltaRef.current = {
      x: touch.clientX - touchStartRef.current.x,
      y: touch.clientY - touchStartRef.current.y,
    };
  };

  const handleTouchEnd = () => {
    if (window.innerWidth >= 900) return;
    const { x, y } = touchDeltaRef.current;
    if (x > 80 && Math.abs(x) > Math.abs(y) * 1.2) {
      setIsMobileChatOpen(false);
      triggerHaptic(12);
    }
  };

  async function sendMessage(event) {
    if (event) event.preventDefault();
    if ((!draft.trim() && !imageFile && !audioBlob) || !activeConversation || !canPostInChannel) {
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
    setShowNewMessagePill(false);

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
          bumpConversation(conversation._id);
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
    if (e) {
      e.preventDefault();
    }
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
    if (window.innerWidth < 900) {
      setIsMobileChatOpen(true);
    }
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
      return <span className="message-status read">✓✓</span>;
    }
    if (message.status === 'delivered') {
      return <span className="message-status delivered">✓✓</span>;
    }
    return <span className="message-status sent">✓</span>;
  };

  const handleOpenConversation = (conversation) => {
    setActiveConversation(conversation);
    if (window.innerWidth < 900) {
      setIsMobileChatOpen(true);
      triggerHaptic(12);
    }
  };

  const unreadIndex = useMemo(() => {
    if (!activeConversation || !messages.length) return -1;

    return messages.findIndex((message) => {
      const senderId = message.senderId?._id || message.senderId?.id;
      if (!senderId || senderId === user.id || senderId === user._id) return false;
      if (message.isDeleted) return false;

      const seenIds = message.seenIds || [];
      return !seenIds.some((id) => id?.toString?.() === user.id || id === user.id || id === user._id);
    });
  }, [activeConversation, messages, user.id, user._id]);

  const pinnedMessageIds = useMemo(
    () => new Set(pinnedMessages.map((message) => message._id)),
    [pinnedMessages],
  );

  const channelMemberOptions = useMemo(
    () => (contacts.length ? contacts : allUsers),
    [contacts, allUsers],
  );

  const isChannel = activeConversation?.type === "channel";
  const isChannelOwner = useMemo(() => {
    const ownerId = activeConversation?.channelOwnerId?._id || activeConversation?.channelOwnerId;
    return ownerId?.toString?.() === user.id || ownerId === user.id;
  }, [activeConversation?.channelOwnerId, user.id]);

  const isChannelAdmin = useMemo(() => {
    const adminIds = activeConversation?.channelAdminIds || [];
    return adminIds.some((id) => {
      const normalized = id?._id || id;
      return normalized?.toString?.() === user.id || normalized === user.id;
    });
  }, [activeConversation?.channelAdminIds, user.id]);

  const canPostInChannel = !isChannel || !activeConversation?.isReadOnly || isChannelOwner || isChannelAdmin;

  if (!user) {
    return null;
  }

  return (
    <div className={`chat-shell ${isMobileChatOpen ? "chat-active" : ""}`}>
      <aside className="left-panel">
        <div className="panel-header">
          <div
            className="panel-header-content"
            onClick={() => setIsEditingProfile(true)}
            title="Edit Profile"
          >
            {user.image ? (
              <img
                src={resolveMediaUrl(user.image)}
                alt="avatar"
                className="avatar"
              />
            ) : (
              <div className="avatar avatar-fallback primary">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2>NextTalk</h2>
              <small>{user.name}</small>
            </div>
          </div>

          <div className="panel-header-actions">
            <button
              className="ghost theme-toggle"
              onClick={toggleTheme}
              type="button"
              title="Toggle Dark Mode"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="ghost" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </div>

        <section>
          <h3 className="section-header">
            Conversations
            <button
              className="ghost"
              type="button"
              onClick={() => setShowChannelModal(true)}
            >
              New channel
            </button>
          </h3>
          <div className="list">
            {conversations.map((conversation) => {
              const isOtherUserOnline = conversation.isGroup
                ? false
                : conversation.users.some(
                    (u) => (u._id !== user.id && u.id !== user.id) && onlineUserIds.has(u._id || u.id),
                  );

              return (
                <button
                  key={conversation._id}
                  className={`list-item${conversation._id === activeConversation?._id ? " active" : ""}${bumpConversationId === conversation._id ? " bump" : ""}`}
                  type="button"
                  onClick={() => handleOpenConversation(conversation)}
                >
                  <div className="list-item-title">
                    <strong>{getConversationTitle(conversation, user.id)}</strong>
                    {isOtherUserOnline && (
                      <div className="presence-dot" title="Online" />
                    )}
                  </div>
                  <span>
                    {conversation.lastMessage?.isDeleted ? "🚫 This message was deleted" : 
                     conversation.lastMessage?.audio ? "🎤 Audio message" : 
                     conversation.lastMessage?.image ? "📷 Image" : 
                     conversation.lastMessage?.sticker ? "✨ Sticker" : 
                     conversation.lastMessage?.body || "No messages yet"}
                  </span>
                  {conversation.unreadCount > 0 && (
                    <div className="unread-count">
                      {conversation.unreadCount}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="section-header">
            Connections
            <button
              className="ghost"
              onClick={() => setShowDirectory(!showDirectory)}
              type="button"
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
                type="search"
              />
              <div className="list compact">
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
                    <div className="list-item-content">
                      {targetUser.image ? (
                        <img
                          src={resolveMediaUrl(targetUser.image)}
                          alt="avatar"
                          className="avatar sm"
                        />
                      ) : (
                        <div className="avatar sm avatar-fallback accent">
                          {targetUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="list-item-meta">
                        <strong>{targetUser.name}</strong>
                        <span className="list-item-subtitle">{targetUser.email}</span>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="list-empty">
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
                type="search"
              />
              <div className="list compact">
                {filteredContacts.map((targetUser) => (
                  <button
                    className="list-item"
                    key={targetUser.id || targetUser._id}
                    type="button"
                    onClick={() => startConversation(targetUser)}
                  >
                    <div className="list-item-content">
                      {targetUser.image ? (
                        <img
                          src={resolveMediaUrl(targetUser.image)}
                          alt="avatar"
                          className="avatar sm"
                        />
                      ) : (
                        <div className="avatar sm avatar-fallback primary">
                          {targetUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="list-item-meta">
                        <strong>{targetUser.name}</strong>
                        <span className="list-item-subtitle">{targetUser.email}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </aside>

      <main
        className="chat-panel"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <header className="chat-header">
          <button
            className="ghost back-button"
            type="button"
            onClick={() => {
              setIsMobileChatOpen(false);
              triggerHaptic(12);
            }}
            aria-label="Back to conversations"
          >
            ←
          </button>
          <h3>
            {activeConversation ? getConversationTitle(activeConversation, user.id) : "Select a conversation"}
          </h3>
          {isChannel && (isChannelOwner || isChannelAdmin) && (
            <button
              type="button"
              className="ghost channel-settings-button"
              onClick={() => setShowChannelSettings(true)}
              title="Channel settings"
            >
              ⚙️
            </button>
          )}
        </header>

        <div className="chat-body">
          {isChannel && (activeConversation.description || activeConversation.image || activeConversation.isReadOnly) && (
            <div className="channel-info">
              {activeConversation.image && (
                <img
                  src={resolveMediaUrl(activeConversation.image)}
                  alt="channel"
                  className="channel-avatar"
                />
              )}
              <div className="channel-info-body">
                {activeConversation.description && (
                  <p className="channel-description">{activeConversation.description}</p>
                )}
                {activeConversation.isReadOnly && !canPostInChannel && (
                  <span className="channel-readonly">Read-only: only admins can post</span>
                )}
              </div>
            </div>
          )}

          {pinnedMessages.length > 0 && (
            <div className="pinned-bar">
              <div className="pinned-title">Pinned</div>
              <div className="pinned-list">
                {pinnedMessages.map((message) => (
                  <div key={message._id} className="pinned-item">
                    <span className="pinned-text">
                      {message.body || (message.sticker ? "Sticker" : message.image ? "Image" : message.audio ? "Audio" : "Message")}
                    </span>
                    <button
                      type="button"
                      className="pinned-action"
                      onClick={() => handleUnpinMessage(message._id)}
                      title="Unpin"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="message-stream" ref={messageStreamRef}>
            <div ref={observerTarget} className="observer-target" />
            {loadingMore && <div className="message-loading">Loading older messages...</div>}
            
            {messages.map((message, index) => (
            <Fragment key={message._id}>
              {index === unreadIndex && (
                <div className="unread-divider">
                  <span>Unread messages</span>
                </div>
              )}
              <div
                className={
                  (message.senderId.id || message.senderId._id) === user.id ? "message own" : "message"
                }
              >
                <div className="message-meta message-meta-row">
                  <div>{message.senderId.name}</div>
                  <div className="message-meta-actions">
                    {!message.isDeleted && (
                      <button
                        type="button"
                        className={pinnedMessageIds.has(message._id) ? "message-pin active" : "message-pin"}
                        onClick={() => {
                          triggerHaptic(10);
                          if (pinnedMessageIds.has(message._id)) {
                            handleUnpinMessage(message._id);
                          } else {
                            handlePinMessage(message._id);
                          }
                        }}
                        title={pinnedMessageIds.has(message._id) ? "Unpin" : "Pin"}
                      >
                        📌
                      </button>
                    )}
                    {(message.senderId.id || message.senderId._id) === user.id && !message.isDeleted && (
                      <button 
                        type="button"
                        onClick={() => {
                          triggerHaptic(10);
                          if (window.confirm("Delete this message for everyone?")) {
                              api.delete(`/messages/${message._id}`).catch(err => console.error(err));
                          }
                        }}
                        className="message-delete"
                        title="Delete message"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
                {message.isDeleted ? (
                  <div className="message-deleted">
                    🚫 {message.body}
                  </div>
                ) : (
                  <>
                    {message.sticker && (
                      <div className="message-media">
                        <img
                          src={resolveMediaUrl(message.sticker)}
                          alt="sticker"
                          className="message-sticker"
                        />
                      </div>
                    )}
                    {message.image && (
                      <div className="message-media">
                        <img
                            src={resolveMediaUrl(message.image)}
                          alt="attachment"
                            onClick={() => {
                            triggerHaptic(8);
                              setZoomedImage(resolveMediaUrl(message.image));
                          }}
                          className="message-image"
                        />
                      </div>
                    )}
                    {message.body && <div className="message-body">{message.body}</div>}
                    {message.audio && (
                      <div className="message-audio">
                        <audio
                          controls
                          src={resolveMediaUrl(message.audio)}
                        />
                      </div>
                    )}
                    {message.reactions?.length > 0 && (
                      <div className="message-reactions">
                        {message.reactions.map((reaction) => {
                          const hasReacted = reaction.userIds?.some((id) => id?.toString?.() === user.id || id === user.id);
                          return (
                            <button
                              key={`${message._id}-${reaction.emoji}`}
                              type="button"
                              className={hasReacted ? "reaction-chip active" : "reaction-chip"}
                              onClick={() => handleToggleReaction(message._id, reaction.emoji)}
                            >
                              <span>{reaction.emoji}</span>
                              <small>{reaction.userIds.length}</small>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                <div className="message-footer">
                  <small className="message-time-text">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                  {!message.isDeleted && (
                    <button
                      type="button"
                      className="reaction-button"
                      onClick={() => setReactionPickerId((current) => (current === message._id ? null : message._id))}
                      title="Add reaction"
                    >
                      😊
                    </button>
                  )}
                  {renderMessageStatus(message)}
                </div>
                {reactionPickerId === message._id && (
                  <div className="reaction-picker">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={`${message._id}-${emoji}`}
                        type="button"
                        onClick={() => handleToggleReaction(message._id, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Fragment>
          ))}
            {activeConversation && Array.from(typingUsers).filter(id => activeConversation.users.some(u => (u._id || u.id) === id)).length > 0 && (
              <div className="message typing-indicator">
                Someone is typing...
              </div>
            )}
          </div>

          {showNewMessagePill && (
            <button type="button" className="new-message-pill" onClick={scrollToBottom}>
              New messages ↓
            </button>
          )}
        </div>

        <form className="composer composer-stack" onSubmit={sendMessage}>
          {stickerPickerOpen && (
            <div className="sticker-panel">
              {stickerOptions.map((sticker) => (
                <button
                  key={sticker}
                  type="button"
                  className="sticker-item"
                  onClick={() => sendSticker(sticker)}
                >
                  <img src={resolveMediaUrl(sticker)} alt="sticker" />
                </button>
              ))}
            </div>
          )}
          {imageFile && (
            <div className="composer-preview">
              <img src={URL.createObjectURL(imageFile)} alt="preview" />
              <span>
                {imageFile.name}
              </span>
              <button 
                type="button" 
                onClick={() => setImageFile(null)}
                disabled={sending}
                className="composer-preview-remove"
              >
                X
              </button>
            </div>
          )}
          {audioUrl && (
            <div className="composer-preview">
              <audio controls src={audioUrl} />
              <button 
                type="button" 
                onClick={cancelRecording}
                disabled={sending}
                className="composer-preview-remove"
              >
                X
              </button>
            </div>
          )}
          <div className="composer-row">
            <input
              type="file"
              accept="image/*"
              id="file-upload"
              className="composer-file-input"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            <label 
              htmlFor="file-upload" 
              className={`composer-icon ${(!activeConversation || sending || !canPostInChannel) ? "disabled" : ""}`}
              onClick={() => triggerHaptic(8)}
              title="Attach image"
            >
              📷
            </label>
            <button
              type="button"
              className={`composer-icon ${(!activeConversation || sending || !canPostInChannel) ? "disabled" : ""}`}
              onClick={() => {
                if (!activeConversation || sending || !canPostInChannel) return;
                triggerHaptic(8);
                setStickerPickerOpen((current) => !current);
              }}
              title="Stickers"
            >
              ✨
            </button>
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={!activeConversation || sending || !canPostInChannel}
                className={`composer-icon ${(!activeConversation || sending || !canPostInChannel) ? "disabled" : ""}`}
                title="Record audio"
              >
                🎤
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="composer-icon recording"
                title="Stop recording"
              >
                ⏹
              </button>
            )}
            <input
              value={draft}
              onChange={handleTyping}
              placeholder="Write a message"
              disabled={!activeConversation || sending || isRecording || !canPostInChannel}
              className={isRecording ? "composer-input disabled" : "composer-input"}
            />
            <button
              type="submit"
              onClick={() => triggerHaptic(10)}
              disabled={!activeConversation || sending || isRecording || !canPostInChannel || (!draft.trim() && !imageFile && !audioBlob)}
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </form>
      </main>

      {zoomedImage && (
        <div className="overlay overlay-image" onClick={() => setZoomedImage(null)}>
          <button className="overlay-close" onClick={() => {
            triggerHaptic(10);
            setZoomedImage(null);
          }}>
            &times;
          </button>
          <img src={zoomedImage} alt="zoomed" className="overlay-img" />
        </div>
      )}

      {isEditingProfile && (
        <div className="overlay" onClick={() => setIsEditingProfile(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3 className="modal-title">Edit Profile</h3>
            <div className="modal-field">
              <label>Name</label>
              <input
                className="modal-input"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label>Bio</label>
              <textarea
                className="modal-textarea"
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
              />
            </div>
            <div className="modal-field">
              <label>Avatar image</label>
              <input type="file" accept="image/*" onChange={(e) => setProfileImageFile(e.target.files?.[0])} />
            </div>
            <div className="modal-field toggle-row">
              <div>
                <label className="toggle-label">Haptics</label>
                <span className="toggle-hint">Vibrate on taps and gestures</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={hapticsEnabled}
                  onChange={(event) => setHapticsEnabled(event.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-button"
                onClick={() => {
                  triggerHaptic(10);
                  setIsEditingProfile(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-button primary"
                onClick={() => {
                  triggerHaptic(12);
                  handleUpdateProfile();
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showChannelModal && (
        <div className="overlay" onClick={() => setShowChannelModal(false)}>
          <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={handleCreateChannel}>
            <h3 className="modal-title">Create Channel</h3>
            <div className="modal-field">
              <label>Channel name</label>
              <input
                className="modal-input"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Design updates"
                required
              />
            </div>
            <div className="modal-field">
              <label>Description</label>
              <textarea
                className="modal-textarea"
                value={channelDescription}
                onChange={(e) => setChannelDescription(e.target.value)}
                placeholder="Channel purpose"
              />
            </div>
            <div className="modal-field">
              <label>Channel avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => openAvatarCropper(e.target.files?.[0] || null, "create")}
              />
              {channelImageFile && (
                <span className="helper-text">Avatar ready</span>
              )}
            </div>
            <div className="modal-field toggle-row">
              <div>
                <label className="toggle-label">Read-only</label>
                <span className="toggle-hint">Only admins can post</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={channelReadOnly}
                  onChange={(event) => setChannelReadOnly(event.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="modal-field">
              <label>Add members</label>
              <div className="member-list">
                {channelMemberOptions.map((member) => {
                  const id = member._id || member.id;
                  const isSelected = channelMembers.includes(id);
                  return (
                    <label key={id} className="member-item">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setChannelMembers((current) =>
                            current.includes(id)
                              ? current.filter((memberId) => memberId !== id)
                              : [...current, id],
                          );
                        }}
                      />
                      <span>{member.name}</span>
                    </label>
                  );
                })}
                {channelMemberOptions.length === 0 && (
                  <div className="list-empty">No contacts found.</div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-button"
                onClick={() => setShowChannelModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="modal-button primary">
                Create channel
              </button>
            </div>
          </form>
        </div>
      )}

      {showChannelSettings && isChannel && (
        <div className="overlay" onClick={() => setShowChannelSettings(false)}>
          <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={handleSaveChannelSettings}>
            <h3 className="modal-title">Channel Settings</h3>
            <div className="modal-field">
              <label>Channel name</label>
              <input
                className="modal-input"
                value={channelSettingsName}
                onChange={(event) => setChannelSettingsName(event.target.value)}
                required
              />
            </div>
            <div className="modal-field">
              <label>Description</label>
              <textarea
                className="modal-textarea"
                value={channelSettingsDescription}
                onChange={(event) => setChannelSettingsDescription(event.target.value)}
              />
            </div>
            <div className="modal-field">
              <label>Channel avatar</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => openAvatarCropper(event.target.files?.[0] || null, "settings")}
              />
              {channelSettingsImage && (
                <img src={resolveMediaUrl(channelSettingsImage)} alt="channel" className="channel-avatar-preview" />
              )}
            </div>
            <div className="modal-field toggle-row">
              <div>
                <label className="toggle-label">Read-only</label>
                <span className="toggle-hint">Only admins can post</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={channelSettingsReadOnly}
                  onChange={(event) => setChannelSettingsReadOnly(event.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="modal-field">
              <label>Owner</label>
              <select
                className="modal-select"
                value={channelSettingsOwnerId}
                onChange={(event) => setChannelSettingsOwnerId(event.target.value)}
                disabled={!isChannelOwner}
              >
                {channelSettingsMembers.map((memberId) => {
                  const member = channelMemberOptions.find((userItem) => (userItem._id || userItem.id) === memberId);
                  return (
                    <option key={memberId} value={memberId}>
                      {member?.name || "Member"}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="modal-field">
              <label>Members</label>
              <div className="member-list">
                {allUsers.map((member) => {
                  const id = member._id?.toString?.() || member._id || member.id;
                  const isMember = channelSettingsMembers.includes(id);
                  const isAdmin = channelSettingsAdmins.includes(id);
                  const isOwner = channelSettingsOwnerId === id;

                  return (
                    <div key={id} className="member-row">
                      <label className="member-item">
                        <input
                          type="checkbox"
                          checked={isMember}
                          disabled={isOwner}
                          onChange={() => {
                            setChannelSettingsMembers((current) =>
                              current.includes(id)
                                ? current.filter((memberId) => memberId !== id)
                                : [...current, id],
                            );
                          }}
                        />
                        <span>{member.name}</span>
                      </label>
                      <label className="admin-toggle">
                        <input
                          type="checkbox"
                          checked={isAdmin}
                          disabled={!isMember || isOwner}
                          onChange={() => {
                            setChannelSettingsAdmins((current) =>
                              current.includes(id)
                                ? current.filter((adminId) => adminId !== id)
                                : [...current, id],
                            );
                          }}
                        />
                        <span>Admin</span>
                      </label>
                      {!isOwner && isMember && (isChannelOwner || isChannelAdmin) && (
                        <button
                          type="button"
                          className="member-remove"
                          onClick={() => {
                            if (window.confirm(`Remove ${member.name} from this channel?`)) {
                              setChannelSettingsMembers((current) => current.filter((memberId) => memberId !== id));
                              setChannelSettingsAdmins((current) => current.filter((adminId) => adminId !== id));
                            }
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-field">
              <label>Audit log</label>
              <div className="audit-list">
                {channelAuditLog.map((entry) => (
                  <div key={`${entry._id || entry.createdAt}`} className="audit-item">
                    <span className="audit-action">{entry.action.replace(/_/g, " ")}</span>
                    <span className="audit-meta">
                      {entry.actorId?.name || "System"}
                      {entry.targetId?.name ? ` → ${entry.targetId.name}` : ""}
                    </span>
                    <span className="audit-time">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
                {channelAuditLog.length === 0 && (
                  <div className="list-empty">No recent changes.</div>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-button"
                onClick={() => setShowChannelSettings(false)}
              >
                Cancel
              </button>
              <button type="submit" className="modal-button primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {showAvatarCropper && (
        <div className="overlay" onClick={() => setShowAvatarCropper(false)}>
          <div className="modal avatar-cropper" onClick={(event) => event.stopPropagation()}>
            <h3 className="modal-title">Crop Avatar</h3>
            <div className="avatar-crop-preview">
              <img
                src={avatarCropImageUrl}
                alt="crop"
                style={{ transform: `scale(${avatarCropZoom})` }}
              />
            </div>
            <label className="modal-field">
              <span>Zoom</span>
              <input
                type="range"
                min="1"
                max="2"
                step="0.05"
                value={avatarCropZoom}
                onChange={(event) => setAvatarCropZoom(Number(event.target.value))}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="modal-button" onClick={() => setShowAvatarCropper(false)}>
                Cancel
              </button>
              <button type="button" className="modal-button primary" onClick={applyAvatarCrop}>
                Use avatar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




