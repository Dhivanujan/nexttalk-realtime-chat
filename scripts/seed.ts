import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Import models. For a standalone script, we need to redefine them or import them.
// Importing may fail due to Next.js specific logic or absolute paths.
// I'll inline a minimal schema for seeding or use require if ts-node handles it.
// To keep it simple, I will use mongoose.model directly here without importing the app models
// if they rely on module aliasing which ts-node might not resolve without tsconfig-paths.

const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error("Please define the DATABASE_URL environment variable");
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image: { type: String, default: "" },
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function seed() {
  try {
    const conn = await mongoose.connect(MONGODB_URI as string);
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    console.log("Cleared existing users");

    // Create dummy users
    const hashedPassword = await bcrypt.hash("password123", 12);

    const users = [
      {
        name: "Alice Johnson",
        email: "alice@example.com",
        password: hashedPassword,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
      },
      {
        name: "Bob Smith",
        email: "bob@example.com",
        password: hashedPassword,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
      },
      {
        name: "Charlie Brown",
        email: "charlie@example.com",
        password: hashedPassword,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
      },
    ];

    await User.insertMany(users);
    console.log("Seeding complete! 3 users created.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
