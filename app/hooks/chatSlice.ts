import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChatState {
  conversations: any[]; // Use actual type
  currentConversationId: string | null;
  onlineUsers: string[];
}

const initialState: ChatState = {
  conversations: [],
  currentConversationId: null,
  onlineUsers: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<any[]>) => {
      state.conversations = action.payload;
    },
    setCurrentConversationId: (state, action: PayloadAction<string>) => {
      state.currentConversationId = action.payload;
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },
  },
});

export const { setConversations, setCurrentConversationId, setOnlineUsers } =
  chatSlice.actions;

export default chatSlice.reducer;
