import { useAppSelector } from "./useRedux";

export const useActiveList = () => {
  const onlineUsers = useAppSelector((state) => state.chat.onlineUsers);
  return { members: onlineUsers };
};
