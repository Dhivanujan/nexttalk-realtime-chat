import mongoose, { Document, Model, Schema, Types, model } from "mongoose";

export interface IMessage extends Document {
  body?: string;
  image?: string;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  seenIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    body: { type: String },
    image: { type: String },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seenIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message: Model<IMessage> =
  mongoose.models.Message || model<IMessage>("Message", MessageSchema);
