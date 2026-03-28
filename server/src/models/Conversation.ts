import mongoose, { Document, Model, Schema, Types, model } from "mongoose";

export interface IConversation extends Document {
  name?: string;
  isGroup: boolean;
  users: Types.ObjectId[];
  messagesIds: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    name: { type: String },
    isGroup: { type: Boolean, default: false },
    users: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    messagesIds: [{ type: Schema.Types.ObjectId, ref: "Message" }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true },
);

ConversationSchema.index({ users: 1, updatedAt: -1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation || model<IConversation>("Conversation", ConversationSchema);
