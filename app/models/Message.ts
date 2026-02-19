import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage extends Document {
  body?: string;
  image?: string;
  seenIds: mongoose.Types.ObjectId[];
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema<IMessage> = new Schema(
  {
    body: {
      type: String,
    },
    image: {
      type: String,
    },
    seenIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
