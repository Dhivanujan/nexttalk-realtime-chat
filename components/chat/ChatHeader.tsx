"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { IConversation } from "@/app/models/Conversation";
import { useOtherUser } from "@/app/hooks/useOtherUser";
import { useActiveList } from "@/app/hooks/useActiveList";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatHeaderProps {
  conversation: IConversation;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation }) => {
  const otherUser = useOtherUser(conversation);
  const { members } = useActiveList(); 
  const isActive = members.indexOf((otherUser as any)?.email!) !== -1;

  const statusText = useMemo(() => {
    if (conversation.isGroup) {
      return `${conversation.users.length} members`;
    }
    return isActive ? "Active now" : "Offline";
  }, [conversation, isActive]);

  return (
    <div
      className="
        bg-background/95 
        backdrop-blur supports-[backdrop-filter]:bg-background/60
        w-full 
        flex 
        border-b
        border-border
        sm:px-4 
        py-3 
        px-4 
        lg:px-6 
        justify-between 
        items-center 
        shadow-sm
        z-40
      "
    >
      <div className="flex gap-3 items-center">
        <Link
          href="/conversations"
          className="
            lg:hidden 
            block 
            text-primary 
            hover:text-primary/80 
            transition 
            cursor-pointer
          "
        >
          <ChevronLeft size={32} />
        </Link>
        
        {conversation.isGroup ? (
           <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              <MoreHorizontal />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="relative">
            <Avatar>
              <AvatarImage src={(otherUser as any)?.image || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {(otherUser as any)?.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isActive && (
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background bg-green-500" />
            )}
          </div>
        )}
        
        <div className="flex flex-col">
          <div className="font-semibold text-foreground">
            {conversation.name || (otherUser as any)?.name}
          </div>
          <div className="text-xs font-light text-muted-foreground">
            {statusText}
          </div>
        </div>
      </div>
      <MoreHorizontal
        size={32}
        className="
          text-primary
          cursor-pointer
          hover:text-primary/80
          transition
        "
      />
    </div>
  );
};
export default ChatHeader;
