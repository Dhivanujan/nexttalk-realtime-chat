import dotenv from "dotenv";
import path from "path";
import { createServer } from "http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { connectDatabase } from "./config/db";
import authRouter from "./routes/auth.routes";
import conversationRouter from "./routes/conversation.routes";
import messageRouter from "./routes/message.routes";
import userRouter from "./routes/user.routes";
import uploadRouter from "./routes/upload.routes";
import { User } from "./models/User";

const cwd = process.cwd();
const repoRoot = path.resolve(cwd, "..");

dotenv.config({ path: path.resolve(cwd, ".env") });
dotenv.config({ path: path.resolve(cwd, ".env.local") });
dotenv.config({ path: path.resolve(cwd, "server/.env") });
dotenv.config({ path: path.resolve(repoRoot, ".env") });
dotenv.config({ path: path.resolve(repoRoot, ".env.local") });
dotenv.config({ path: path.resolve(repoRoot, "server/.env") });

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/messages", messageRouter);
app.use("/api/upload", uploadRouter);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const onlineUsers = new Map<string, string>();

io.on("connection", (socket) => {
  socket.emit("online-users", Array.from(onlineUsers.keys()));

  socket.on("register-user", async (userId: string) => {
    onlineUsers.set(userId, socket.id);
    socket.join(userId);

    try {
      await User.findByIdAndUpdate(userId, {
        $set: { isOnline: true, lastSeen: new Date() },
      });
    } catch (error) {
      // Keep socket behavior resilient even if DB update fails.
    }

    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
  });

  socket.on("typing", ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.to(roomId).emit("user-typing", { userId });
  });

  socket.on("stop-typing", ({ roomId, userId }: { roomId: string; userId: string }) => {
    socket.to(roomId).emit("user-stop-typing", { userId });
  });

  socket.on("disconnect", async () => {
    let disconnectedUserId: string | null = null;

    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        break;
      }
    }

    if (!disconnectedUserId) {
      return;
    }

    onlineUsers.delete(disconnectedUserId);

    try {
      await User.findByIdAndUpdate(disconnectedUserId, {
        $set: { isOnline: false, lastSeen: new Date() },
      });
    } catch (error) {
      // Keep socket behavior resilient even if DB update fails.
    }

    io.emit("online-users", Array.from(onlineUsers.keys()));
  });
});

async function bootstrap(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  const port = Number(process.env.PORT || 5000);

  if (!mongoUri) {
    throw new Error("MONGODB_URI or DATABASE_URL is required");
  }

  if (!process.env.JWT_SECRET && process.env.NEXTAUTH_SECRET) {
    process.env.JWT_SECRET = process.env.NEXTAUTH_SECRET;
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required (or provide NEXTAUTH_SECRET)");
  }

  await connectDatabase(mongoUri);

  httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
