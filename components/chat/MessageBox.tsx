"use client";

import { memo } from "react";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { format } from "date-fns";
import { IMessage } from "@/app/models/Message";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MessageBoxProps {
  data: IMessage;
  isLast?: boolean;
}

const MessageBox: React.FC<MessageBoxProps> = memo(({ data, isLast }) => {
  const session = useSession();
  
  const isOwn = session?.data?.user?.email === (data.senderId as any)?.email;
  const seenList = (data.seenIds || [])
    .filter((user) => user !== (data.senderId as any)?._id)
    .map((user) => (user as any).name)
    .join(", ");

  const container = clsx("flex gap-3 p-4 hover:bg-black/5 dark:hover:bg-white/5 transition duration-150 ease-in-out group", isOwn && "justify-end");
  const avatar = clsx(isOwn && "order-2");
  const body = clsx("flex flex-col gap-2 max-w-[70%]", isOwn && "items-end");
  
  const message = clsx(
    "text-sm w-fit overflow-hidden shadow-sm transition-all relative",
    isOwn 
      ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
      : "bg-muted text-foreground rounded-2xl rounded-tl-sm",
    data.image ? "rounded-xl p-0" : "py-2.5 px-4"
  );

  return (
    <div className={container}>
      <div className={avatar}>
        <Avatar className="h-8 w-8 transition-transform group-hover:scale-105">
          <AvatarImage src={(data.senderId as any).image} />
          <AvatarFallback className="text-xs">{(data.senderId as any).name?.[0]}</AvatarFallback>
        </Avatar>
      </div>
      <div className={body}>
        <div className="flex items-center gap-2">
          {!isOwn && (
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {(data.senderId as any).name}
            </div>
          )}
        </div>
        <div className={message}>
          {data.image ? (
            <Image
              alt="Image"
              height="288"
              width="288"
              src={data.image}
              className="
                object-cover 
                cursor-pointer 
                hover:scale-105
                transition 
                translate
                rounded-xl
              "
            />
          ) : (
            <div className="leading-relaxed">{data.body}</div>
          )}
        </div>
        <div className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity px-1">
            {format(new Date(data.createdAt), "p")}
        </div>
        {isLast && isOwn && (data.seenIds || []).length > 0 && (
          <div className="text-xs font-light text-primary/70">
            {`Seen by ${seenList}`}
          </div>
        )}
      </div>
    </div>
  );
});

MessageBox.displayName = "MessageBox";
export default MessageBox;
