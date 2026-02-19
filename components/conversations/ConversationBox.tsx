"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { IConversation } from "@/app/models/Conversation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { IMessage } from "@/app/models/Message";

interface ConversationBoxProps {
  data: IConversation;
  selected?: boolean;
}

const ConversationBox: React.FC<ConversationBoxProps> = ({
  data,
  selected,
}) => {
  const otherUser = useMemo(() => {
    // Logic to get other user if not group
    // Assuming data.users includes current user
    return data.users[0]; // Simplified
  }, [data.users]);

  const session = useSession();
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push(`/conversations/${data._id}`);
  }, [data._id, router]);

  const lastMessage = useMemo(() => {
    const messages = data.messagesIds || [];
    return messages[messages.length - 1]; // This is ID, need populated data
  }, [data.messagesIds]);
  
  // Actually data.lastMessage is populated in getConversations action
  const lastMessageText = useMemo(() => {
    const lastMsg = data.lastMessage as unknown as IMessage;
    if (lastMsg?.image) {
      return "Sent an image";
    }
    if (lastMsg?.body) {
      return lastMsg.body;
    }
    return "Started a conversation";
  }, [data.lastMessage]);

  return (
    <div
      onClick={handleClick}
      className={clsx(
        `
        w-full 
        relative 
        flex 
        items-center 
        space-x-3 
        p-3 
        hover:bg-neutral-100
        rounded-lg
        transition
        cursor-pointer
        `,
        selected ? "bg-neutral-100" : "bg-white"
      )}
    >
      <Avatar>
        <AvatarImage
          src={otherUser?.image || "/images/placeholder.jpg"}
        />
        <AvatarFallback>{otherUser?.name?.[0]}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="focus:outline-none">
          <span className="absolute inset-0" aria-hidden="true" />
          <div className="flex justify-between items-center mb-1">
            <p className="text-md font-medium text-gray-900">
              {data.name || otherUser?.name}
            </p>
            {data.lastMessageAt && (
              <p className="text-xs text-gray-400 font-light">
                {format(new Date(data.lastMessageAt), "p")}
              </p>
            )}
          </div>
          <p
            className={clsx(
              `
              truncate 
              text-sm
              `,
              // hasSeen ? 'text-gray-500' : 'text-black font-medium'
              "text-gray-500"
            )}
          >
            {lastMessageText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConversationBox;
