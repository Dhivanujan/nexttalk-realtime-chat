"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IConversation } from "@/app/models/Conversation";
import { useOtherUser } from "@/app/hooks/useOtherUser"; // Need this hook
import { useActiveList } from "@/app/hooks/useActiveList"; // Need this hook

interface ChatHeaderProps {
  conversation: IConversation;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation }) => {
  const otherUser = useOtherUser(conversation);
  const { members } = useActiveList(); 
  const isActive = members.indexOf(otherUser?.email!) !== -1;

  const statusText = useMemo(() => {
    if (conversation.isGroup) {
      return `${conversation.users.length} members`;
    }
    return isActive ? "Active" : "Offline";
  }, [conversation, isActive]);

  return (
    <div
      className="
        bg-background/80 
        backdrop-blur-md
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
        sticky
        top-0
        z-30
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
        <Avatar>
          <AvatarImage src={otherUser?.image || ""} />
          <AvatarFallback>{otherUser?.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <div>{conversation.name || otherUser?.name}</div>
          <div className="text-sm font-light text-neutral-500">
            {statusText}
          </div>
        </div>
      </div>
      <MoreHorizontal
        size={32}
        className="
          text-sky-500
          cursor-pointer
          hover:text-sky-600
          transition
        "
      />
    </div>
  );
};
export default ChatHeader;
