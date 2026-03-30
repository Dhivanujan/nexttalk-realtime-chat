import pkg from "mongoose";
const { Schema, Types, model } = pkg;

const ConversationSchema = new Schema(
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

export const Conversation = pkg.models.Conversation || model("Conversation", ConversationSchema);
