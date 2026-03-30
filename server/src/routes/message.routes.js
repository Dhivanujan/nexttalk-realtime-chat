import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";


const messageRouter = Router();

messageRouter.get("/:conversationId", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId })
      .populate("senderId", "name email image")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

messageRouter.post("/", requireAuth, async (req, res) => {
  try {
    const { message, image, conversationId } = req.body;

    if (!conversationId) {
      res.status(400).json({ message: "conversationId is required" });
      return;
    }

    if (!message && !image) {
      res.status(400).json({ message: "message or image is required" });
      return;
    }

    const newMessage = await Message.create({
      body: message,
      image,
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(req.userId),
      seenIds: [new Types.ObjectId(req.userId)],
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { lastMessage: newMessage._id, updatedAt: new Date() },
      $push: { messagesIds: newMessage._id },
    });

    const populatedMessage = await Message.findById(newMessage._id).populate("senderId", "name email image");

    const io = req.app.get("io");
    if (io) {
      io.to(conversationId).emit("receive-message", populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

export default messageRouter;




