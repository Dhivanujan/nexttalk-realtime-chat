import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";


const messageRouter = Router();

messageRouter.get("/:conversationId", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor;

    const query = { conversationId };

    if (cursor) {
      query._id = { $lt: cursor };
    }

    // Sort descending (_id: -1) to get the most recent messages first, then slice by limit
    const messages = await Message.find(query)
      .populate("senderId", "name email image")
      .sort({ _id: -1 })
      .limit(limit);

    // Reverse them so the frontend receives them in chronological order
    messages.reverse();

    const hasMore = messages.length === limit;
    const nextCursor = messages.length > 0 ? messages[0]._id : null;

    res.json({
      messages,
      nextCursor,
      hasMore,
    });
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
      status: 'sent'
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




