import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  (global as any).io = io; // Expose io globally for API routes

  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Initial emit of online users
    socket.emit("online-users", Array.from(onlineUsers.keys()));

    socket.on("register-user", (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.join(userId); // Join personal room for notifications
      io.emit("online-users", Array.from(onlineUsers.keys()));
      console.log(`User registered: ${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Find userId for socket.id and remove
      let userIdToRemove;
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          userIdToRemove = userId;
          break;
        }
      }
      if (userIdToRemove) {
        onlineUsers.delete(userIdToRemove);
        io.emit("online-users", Array.from(onlineUsers.keys()));
      }
    });

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("send-message", (message) => {
      // Broadcast to room
      io.to(message.conversationId).emit("receive-message", message);
      console.log("Message sent to room:", message.conversationId);
    });

    socket.on("typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("user-typing", { userId });
    });

    socket.on("stop-typing", ({ roomId, userId }) => {
      socket.to(roomId).emit("user-stop-typing", { userId });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      // Remove user from onlineUsers map
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          io.emit("online-users", Array.from(onlineUsers.keys()));
          break;
        }
      }
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
