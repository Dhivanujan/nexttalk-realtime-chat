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

// Add indexes for performance
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1 });

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default Message;
