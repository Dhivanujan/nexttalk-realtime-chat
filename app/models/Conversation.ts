import mongoose, { Schema, Document, Model } from "mongoose";

import { IUser } from "./User";

export interface IConversation extends Document {
  createdAt: Date;
  lastMessageAt: Date;
  name?: string;
  isGroup: boolean;
  messagesIds: mongoose.Types.ObjectId[];
  users: IUser[];
  lastMessage?: mongoose.Types.ObjectId;
}

const ConversationSchema: Schema<IConversation> = new Schema(
  {
    name: {
      type: String,
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    messagesIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;
