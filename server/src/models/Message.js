import pkg from "mongoose";
const { Schema, Types, model } = pkg;

const MessageSchema = new Schema(
  {
    body: { type: String },
    image: { type: String },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seenIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  },
  { timestamps: true },
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = pkg.models.Message || model("Message", MessageSchema);
