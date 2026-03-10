"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { MdOutlineGroupAdd } from "react-icons/md";
import ConversationBox from "./ConversationBox";
import GroupChatModal from "@/components/modals/GroupChatModal";
import { IUser } from "@/app/models/User";
// I need proper type import
import { IConversation } from "@/app/models/Conversation";
import { useAppDispatch, useAppSelector } from "@/app/hooks/useRedux"; // Will create this
import { setConversations, setOnlineUsers } from "@/app/hooks/chatSlice";
import { getSocket } from "@/app/lib/socket";

import { useParams } from "next/navigation";

// ...

interface ConversationListProps {
  initialItems: IConversation[];
  users: IUser[];
}

const ConversationList: React.FC<ConversationListProps> = ({
  initialItems,
  users
}) => {
  const [items, setItems] = useState(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const session = useSession();
  const socket = getSocket();
  const params = useParams();
  const dispatch = useAppDispatch();

  const conversationId = useMemo(() => {
    if (!params?.conversationId) {
      return "";
    }
    return params.conversationId as string;
  }, [params?.conversationId]);

  useEffect(() => {
    if (!session?.data?.user) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    // Register user for private room
    const userId = (session.data.user as any).id;
    if (userId) {
      socket.emit("register-user", userId);
    }
    
    socket.on("new-conversation", (conversation: IConversation) => {
        setItems((current) => {
            const hasConversation = current.find((item) => 
              (item._id as any).toString() === (conversation._id as any).toString()
            );

            if (hasConversation) {
                // If it exists, update it by filtering out old and adding new to top
                const filtered = current.filter((item) => 
                  (item._id as any).toString() !== (conversation._id as any).toString()
                );
                return [conversation, ...filtered];
            }

            return [conversation, ...current];
        });
    });

    sodispatch(setOnlineUsers(userIds));
    });

    return () => {
        socket.off("new-conversation");
        socket.off("online-users");
    }
  }, [socket, session?.data?.user, dispatch
  }, [socket, session?.data?.user]);

  return (
    <>
      <GroupChatModal 
        users={users} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
      <aside
        className={clsx(
        `
        fixed 
        inset-y-0 
        pb-20
        lg:pb-0
        lg:left-20 
        lg:w-80 
        lg:block
        overflow-y-auto 
        border-r 
        border-border 
        bg-background
      `,
        // isOpen ? "hidden" : "block w-full left-0" // Add responsive logic later
        "block w-full left-0"
      )}
    >
      <div className="px-5">
        <div className="flex justify-between mb-4 pt-4">
          <div className="text-2xl font-bold text-foreground">Messages</div>
          <div
            onClick={() => setIsModalOpen(true)}
            className="rounded-full p-2 bg-secondary text-secondary-foreground cursor-pointer hover:opacity-75 transition"
          >
            <MdOutlineGroupAdd size={20} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <ConversationBox
              key={(item._id as any).toString()}
              data={item}
              selected={conversationId === (item._id as any).toString()}
            />
          ))}
        </div>
      </div>
    </aside>
    </>
  );
};
export default ConversationList;
