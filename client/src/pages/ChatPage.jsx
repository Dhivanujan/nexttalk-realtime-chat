import { useEffect, useMemo, useState } from "react";
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
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [sending, setSending] = useState(false);
  
  // Search state
  const [contactSearch, setContactSearch] = useState("");
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

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
        setMessages((current) => [...current, message]);
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

    return () => {
      socket.off("receive-message");
      socket.off("new-conversation");
    };
  }, [socket, user, activeConversation?._id]);

  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    socket.emit("join-room", activeConversation._id);

    api.get(`/messages/${activeConversation._id}`).then((response) => {
      setMessages(response.data);
    });

    api.post(`/conversations/${activeConversation._id}/seen`).catch(() => {
      // Non-critical for primary chat experience.
    });
  }, [activeConversation, socket]);

  async function sendMessage(event) {
    event.preventDefault();
    if ((!draft.trim() && !imageFile) || !activeConversation) {
      return;
    }

    setSending(true);
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

  async function searchGlobalUsers(e) {
    e.preventDefault();
    if (!globalSearchQuery.trim()) return;
    setSearchingGlobal(true);
    try {
      const res = await api.get(`/users/search?query=${encodeURIComponent(globalSearchQuery)}`);
      setGlobalSearchResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingGlobal(false);
    }
  }

  async function addToContacts(targetUser) {
    try {
      await api.post("/users/contacts", { contactId: targetUser._id || targetUser.id });
      // Refresh contacts
      const res = await api.get("/users/contacts");
      setContacts(res.data);
      // Remove from search results just to clean up UI (optional)
      setGlobalSearchResults(prev => prev.filter(u => u._id !== targetUser._id && u.id !== targetUser.id));
    } catch (err) {
      console.error(err);
    }
  }

  const filteredContacts = contacts.filter((entry) =>
    entry.name.toLowerCase().includes(contactSearch.toLowerCase()) || entry.email.toLowerCase().includes(contactSearch.toLowerCase()),
  );

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
            {conversations.map((conversation) => (
              <button
                key={conversation._id}
                className={conversation._id === activeConversation?._id ? "list-item active" : "list-item"}
                type="button"
                onClick={() => setActiveConversation(conversation)}
              >
                <strong>{getConversationTitle(conversation, user.id)}</strong>
                <span>{conversation.lastMessage?.body || "No messages yet"}</span>
              </button>
            ))}
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
          <h3>Find New Users</h3>
          <form style={{ display: 'flex', gap: '5px', marginBottom: '10px' }} onSubmit={searchGlobalUsers}>
            <input
              className="search-input"
              style={{ margin: 0, flex: 1 }}
              placeholder="Search name/email"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
            />
            <button type="submit" disabled={searchingGlobal}>Search</button>
          </form>
          <div className="list compact" style={{ maxHeight: "150px", overflowY: "auto" }}>
            {globalSearchResults.map((u) => (
               <div key={u._id || u.id} className="list-item" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <div style={{textAlign: 'left'}}>
                   <strong>{u.name}</strong><br/>
                   <span style={{fontSize: '12px'}}>{u.email}</span>
                 </div>
                 {contacts.some(c => (c._id || c.id) === (u._id || u.id)) ? (
                   <span style={{ fontSize: '12px', color: 'green' }}>Added</span>
                 ) : (
                   <button onClick={() => addToContacts(u)} style={{padding: '4px 8px'}}>+</button>
                 )}
               </div>
            ))}
          </div>
        </section>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <h3>
            {activeConversation ? getConversationTitle(activeConversation, user.id) : "Select a conversation"}
          </h3>
        </header>

        <div className="message-stream">
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
            </div>
          ))}
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
              onChange={(event) => setDraft(event.target.value)}
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




