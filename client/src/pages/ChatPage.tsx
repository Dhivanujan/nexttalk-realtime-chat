import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { AppUser, Conversation, Message } from "../types";

function getConversationTitle(conversation: Conversation, currentUserId: string): string {
  if (conversation.isGroup) {
    return conversation.name || "Group";
  }

  const otherUser = conversation.users.find((user) => user.id !== currentUserId && (user as any)._id !== currentUserId);
  return otherUser?.name || "Direct Chat";
}

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    if (!user) {
      return;
    }

    (async () => {
      const [userResponse, conversationResponse] = await Promise.all([
        api.get<AppUser[]>("/users"),
        api.get<Conversation[]>("/conversations"),
      ]);

      setUsers(userResponse.data);
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

    socket.on("receive-message", (message: Message) => {
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

    socket.on("new-conversation", (conversation: Conversation) => {
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

    api.get<Message[]>(`/messages/${activeConversation._id}`).then((response) => {
      setMessages(response.data);
    });

    api.post(`/conversations/${activeConversation._id}/seen`).catch(() => {
      // Non-critical for primary chat experience.
    });
  }, [activeConversation, socket]);

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !activeConversation) {
      return;
    }

    setSending(true);
    const text = draft;
    setDraft("");

    try {
      await api.post("/messages", {
        message: text,
        conversationId: activeConversation._id,
      });
    } finally {
      setSending(false);
    }
  }

  async function startConversation(targetUser: AppUser) {
    const response = await api.post<Conversation>("/conversations", {
      userId: targetUser.id || (targetUser as any)._id,
      isGroup: false,
    });

    setConversations((current) => {
      const withoutExisting = current.filter((item) => item._id !== response.data._id);
      return [response.data, ...withoutExisting];
    });

    setActiveConversation(response.data);
  }

  const filteredUsers = users.filter((entry) =>
    entry.name.toLowerCase().includes(search.toLowerCase()) || entry.email.toLowerCase().includes(search.toLowerCase()),
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
          <h3>Start Chat</h3>
          <input
            className="search-input"
            placeholder="Search users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="list compact">
            {filteredUsers.map((targetUser) => (
              <button
                className="list-item"
                key={targetUser.id || (targetUser as any)._id}
                type="button"
                onClick={() => startConversation(targetUser)}
              >
                <strong>{targetUser.name}</strong>
                <span>{targetUser.email}</span>
              </button>
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
                (message.senderId.id || (message.senderId as any)._id) === user.id ? "message own" : "message"
              }
            >
              <div className="message-meta">{message.senderId.name}</div>
              <div>{message.body}</div>
            </div>
          ))}
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write a message"
            disabled={!activeConversation || sending}
          />
          <button type="submit" disabled={!activeConversation || sending}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
