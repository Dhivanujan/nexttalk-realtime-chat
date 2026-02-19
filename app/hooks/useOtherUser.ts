import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { IConversation } from "@/app/models/Conversation";
import { IUser } from "@/app/models/User";

export const useOtherUser = (
  conversation: IConversation | { users: IUser[] }
) => {
  const session = useSession();

  const otherUser = useMemo(() => {
    const currentUserEmail = session?.data?.user?.email;

    const otherUser = conversation.users.filter(
      (user) => user.email !== currentUserEmail
    );

    return otherUser[0];
  }, [session?.data?.user?.email, conversation.users]);

  return otherUser;
};
