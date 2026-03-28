export interface AppUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  bio?: string;
  isOnline?: boolean;
}

export interface Message {
  _id: string;
  body?: string;
  image?: string;
  conversationId: string;
  senderId: AppUser;
  seenIds: string[];
  createdAt: string;
}

export interface Conversation {
  _id: string;
  name?: string;
  isGroup: boolean;
  users: AppUser[];
  messagesIds: string[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}
