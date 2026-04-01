import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";


const conversationRouter = Router();

conversationRouter.get("/", requireAuth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ users: req.userId })
      .populate("users", "name email image bio isOnline")
      .populate({ path: "lastMessage", populate: { path: "senderId", select: "name email image" } })
      .sort({ updatedAt: -1 })
      .lean(); // Use lean to easily add virtual properties

    // Calculate unread counts
    const userObjectId = new Types.ObjectId(req.userId);
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          seenIds: { $ne: userObjectId },
          senderId: { $ne: userObjectId }
        });
        return { ...conv, unreadCount };
      })
    );

    res.json(conversationsWithUnread);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

conversationRouter.post("/", requireAuth, async (req, res) => {
  try {
    const { userId, isGroup, members, name } = req.body;

    if (isGroup) {
      if (!members || members.length < 2 || !name) {
        res.status(400).json({ message: "Invalid group conversation payload" });
        return;
      }

      const userIds = [...new Set([...members, req.userId ])].map((id) => new Types.ObjectId(id));

      const conversation = await Conversation.create({
        name,
        isGroup: true,
        users: userIds,
        messagesIds: [],
      });

      const populated = await Conversation.findById(conversation._id)
        .populate("users", "name email image bio isOnline")
        .populate("lastMessage");

      res.status(201).json(populated);
      return;
    }

    if (!userId) {
      res.status(400).json({ message: "userId is required" });
      return;
    }

    const existing = await Conversation.findOne({
      isGroup: false,
      users: { $all: [new Types.ObjectId(req.userId), new Types.ObjectId(userId)] },
    })
      .populate("users", "name email image bio isOnline")
      .populate("lastMessage");

    if (existing) {
      res.json(existing);
      return;
    }

    const newConversation = await Conversation.create({
      users: [req.userId, userId],
      isGroup: false,
      messagesIds: [],
    });

    const populated = await Conversation.findById(newConversation._id)
      .populate("users", "name email image bio isOnline")
      .populate("lastMessage");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to create conversation" });
  }
});

conversationRouter.post("/:conversationId/seen", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const latestMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
    if (!latestMessage) {
      res.status(204).send();
      return;
    }

    const userObjectId = new Types.ObjectId(req.userId);
    const hasSeen = latestMessage.seenIds.some((id) => id.toString() === req.userId);

    if (!hasSeen) {
      latestMessage.seenIds.push(userObjectId);
      if (latestMessage.senderId.toString() !== req.userId) {
        latestMessage.status = "read";
      }
      await latestMessage.save();
      
      // Update all unread messages in this conversation
      await Message.updateMany(
        { 
          conversationId, 
          senderId: { $ne: userObjectId }, 
          seenIds: { $ne: userObjectId } 
        },
        { 
          $push: { seenIds: userObjectId },
          $set: { status: "read" }
        }
      );
    }

    res.json(latestMessage);
  } catch (error) {
    res.status(500).json({ message: "Failed to update seen state" });
  }
});

export default conversationRouter;




