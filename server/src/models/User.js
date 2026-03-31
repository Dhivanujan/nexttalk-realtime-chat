import pkg from "mongoose";
const { Schema, model } = pkg;

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    image: { type: String, default: "" },
    bio: { type: String, default: "Hey there! I am using NextTalk." },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    contacts: [{ type: Schema.Types.ObjectId, ref: "User" }],
    pushSubscription: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

export const User = pkg.models.User || model("User", UserSchema);
