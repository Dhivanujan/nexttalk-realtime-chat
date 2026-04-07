import pkg from "mongoose";
const { Schema, Types, model } = pkg;

const ConversationSchema = new Schema(
  {
    name: { type: String },
    type: { type: String, enum: ["direct", "group", "channel"], default: "direct" },
    isGroup: { type: Boolean, default: false },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    isReadOnly: { type: Boolean, default: false },
    users: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    messagesIds: [{ type: Schema.Types.ObjectId, ref: "Message" }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    pinnedMessageIds: [{ type: Schema.Types.ObjectId, ref: "Message" }],
    channelOwnerId: { type: Schema.Types.ObjectId, ref: "User" },
    channelAdminIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    channelAudit: [
      {
        action: { type: String, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        targetId: { type: Schema.Types.ObjectId, ref: "User" },
        meta: { type: Schema.Types.Mixed },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

ConversationSchema.index({ users: 1, updatedAt: -1 });

export const Conversation = pkg.models.Conversation || model("Conversation", ConversationSchema);
