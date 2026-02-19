"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { find } from "lodash";
import { useSession } from "next-auth/react";
import { IMessage } from "@/app/models/Message";
import MessageBox from "./MessageBox";
import { getSocket } from "@/app/lib/socket";

interface ChatBodyProps {
  initialMessages: IMessage[];
  conversationId: string;
}

const ChatBody: React.FC<ChatBodyProps> = ({ initialMessages, conversationId }) => {
  const [messages, setMessages] = useState(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();
  const session = useSession();

  // Scroll to bottom
  useEffect(() => {
    bottomRef?.current?.scrollIntoView();
  }, [messages]);

  // Handle new messages and seen
  useEffect(() => {
    socket.emit("join-room", conversationId);
    
    // Seen tracking
    const markSeen = async () => {
      try {
        await axios.post(`/api/conversations/${conversationId}/seen`);
      } catch (error) {
        console.error(error);
      }
    };
    markSeen();

    const messageHandler = (message: IMessage) => {
      setMessages((current) => {
        if (find(current, { _id: message._id })) {
          return current;
        }
        return [...current, message];
      });
      bottomRef?.current?.scrollIntoView();
    };

    socket.on("receive-message", messageHandler);

    return () => {
      socket.off("receive-message", messageHandler);
    };
  }, [conversationId, socket]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message, i) => (
        <MessageBox
          isLast={i === messages.length - 1}
          key={(message._id as any).toString()}
          data={message}
        />
      ))}
      <div ref={bottomRef} className="pt-24" />
    </div>
  );
};
export default ChatBody;
