"use client";

import { useCallback, useMemo, memo } from "react";
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

const ConversationBox: React.FC<ConversationBoxProps> = memo(({
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
  const hasSeen = useMemo(() => {
    if (!lastMessage) {
      return false;
    }

    const seenArray = (lastMessage as any).seenIds || [];

    if (!session.data?.user?.email) {
      return false;
    }

    // Adjust logic if populated
    return seenArray.filter((user: any) => user.email === session.data?.user?.email).length !== 0;
  }, [lastMessage, session.data?.user?.email]);

  const lastMessageText = useMemo(() => {
    // Handling populated or unpopulated lastMessage
    const lastMsg = data.lastMessage as any;
    
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
        hover:bg-muted/50
        rounded-lg
        transition
        cursor-pointer
        `,
        selected ? "bg-muted" : "bg-card"
      )}
    >
      <div className="relative">
        <Avatar>
          <AvatarImage src={(otherUser as any)?.image} />
          <AvatarFallback>{(otherUser as any)?.name?.[0]}</AvatarFallback>
        </Avatar>
        {/* Placeholder for active status dot */}
      </div>
      <div className="min-w-0 flex-1">
        <div className="focus:outline-none">
          <div className="flex justify-between items-center mb-1">
            <p className="text-md font-medium text-gray-900 dark:text-gray-100 truncate">
              {data.name || (otherUser as any)?.name}
            </p>
            {data.lastMessageAt && (
              <p className="text-xs text-gray-400 font-light pl-2 shrink-0">
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
              hasSeen ? "text-gray-500" : "text-black font-medium dark:text-white"
            )}
          >
            {lastMessageText}
          </p>
        </div>
      </div>
    </div>
  );
});

ConversationBox.displayName = "ConversationBox";

export default ConversationBox;
