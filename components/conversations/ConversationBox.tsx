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
        hover:bg-accent/50
        rounded-xl
        transition
        cursor-pointer
        border
        `,
        selected ? "bg-accent border-primary/20" : "bg-card border-transparent hover:border-border"
      )}
    >
      <div className="relative">
        <Avatar>
          <AvatarImage
            src={(otherUser as any)?.image || "/images/placeholder.jpg"}
          />
          <AvatarFallback className="bg-primary/10 text-primary">{(otherUser as any)?.name?.[0]}</AvatarFallback>
        </Avatar>
        {/* Online status dot can be added here */}
      </div>
      <div className="min-w-0 flex-1">
        <div className="focus:outline-none">
          <div className="flex justify-between items-center mb-1">
            <p className={clsx("text-md font-medium", selected ? "text-primary" : "text-foreground")}>
              {(data as any).name || (otherUser as any)?.name}
            </p>
            {(data as any).lastMessageAt && (
              <p className="text-xs text-muted-foreground font-light">
                {format(new Date((data as any).lastMessageAt), "p")}
              </p>
            )}
          </div>
          <p
            className={clsx(
              `
              truncate 
              text-sm
              `,
              selected ? "text-primary/80" : "text-muted-foreground"
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
