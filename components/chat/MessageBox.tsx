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

  const container = clsx("flex gap-3 p-4", isOwn && "justify-end");
  const avatar = clsx(isOwn && "order-2");
  const body = clsx("flex flex-col gap-2", isOwn && "items-end");
  const message = clsx(
    "text-sm w-fit overflow-hidden shadow-sm",
    isOwn ? "bg-gradient-to-br from-primary to-purple-600 text-white dark:text-gray-100" : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700",
    data.image ? "rounded-xl p-0" : "rounded-2xl py-2 px-4 shadow-sm"
  );

  return (
    <div className={container}>
      <div className={avatar}>
        <Avatar>
          <AvatarImage src={(data.senderId as any).image} />
          <AvatarFallback>{(data.senderId as any).name?.[0]}</AvatarFallback>
        </Avatar>
      </div>
      <div className={body}>
        <div className="flex items-center gap-1">
          <div className="text-sm text-gray-500">
            {(data.senderId as any).name}
          </div>
          <div className="text-xs text-gray-400">
            {format(new Date(data.createdAt), "p")}
          </div>
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
                hover:scale-110 
                transition 
                translate
              "
            />
          ) : (
            <div>{data.body}</div>
          )}
        </div>
        {isLast && isOwn && (data.seenIds || []).length > 0 && (
          <div className="text-xs font-light text-gray-500">
            {`Seen by ${seenList}`}
          </div>
        )}
      </div>
    </div>
  );
});

MessageBox.displayName = "MessageBox";
export default MessageBox;
