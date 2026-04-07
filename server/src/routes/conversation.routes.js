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
    const { userId, isGroup, members, name, type } = req.body;

    const normalizedType = type || (isGroup ? "group" : "direct");

    if (normalizedType === "channel") {
      if (!name) {
        res.status(400).json({ message: "Channel name is required" });
        return;
      }

      const channelMembers = Array.isArray(members) ? members : [];
      const userIds = [...new Set([...channelMembers, req.userId])].map((id) => new Types.ObjectId(id));

      const conversation = await Conversation.create({
        name,
        type: "channel",
        isGroup: true,
        users: userIds,
        messagesIds: [],
        pinnedMessageIds: [],
      });

      const populated = await Conversation.findById(conversation._id)
        .populate("users", "name email image bio isOnline")
        .populate("lastMessage");

      res.status(201).json(populated);
      return;
    }

    if (normalizedType === "group") {
      if (!members || members.length < 2 || !name) {
        res.status(400).json({ message: "Invalid group conversation payload" });
        return;
      }

      const userIds = [...new Set([...members, req.userId ])].map((id) => new Types.ObjectId(id));

      const conversation = await Conversation.create({
        name,
        type: "group",
        isGroup: true,
        users: userIds,
        messagesIds: [],
        pinnedMessageIds: [],
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
      $or: [{ type: "direct" }, { type: { $exists: false } }],
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
      type: "direct",
      isGroup: false,
      messagesIds: [],
      pinnedMessageIds: [],
    });

    const populated = await Conversation.findById(newConversation._id)
      .populate("users", "name email image bio isOnline")
      .populate("lastMessage");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to create conversation" });
  }
});

conversationRouter.get("/:conversationId/pins", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId).select("users pinnedMessageIds");
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.users.some((id) => id.toString() === req.userId)) {
      return res.status(403).json({ message: "Not a member of this conversation" });
    }

    const pinnedMessages = await Message.find({ _id: { $in: conversation.pinnedMessageIds } })
      .populate("senderId", "name email image")
      .sort({ createdAt: -1 });

    res.json(pinnedMessages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pinned messages" });
  }
});

conversationRouter.post("/:conversationId/pin", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ message: "messageId is required" });
    }

    const conversation = await Conversation.findById(conversationId).select("users pinnedMessageIds");
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.users.some((id) => id.toString() === req.userId)) {
      return res.status(403).json({ message: "Not a member of this conversation" });
    }

    const message = await Message.findById(messageId);
    if (!message || message.conversationId.toString() !== conversationId) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!conversation.pinnedMessageIds.some((id) => id.toString() === messageId)) {
      conversation.pinnedMessageIds.push(message._id);
      await conversation.save();
    }

    const pinnedMessages = await Message.find({ _id: { $in: conversation.pinnedMessageIds } })
      .populate("senderId", "name email image")
      .sort({ createdAt: -1 });

    res.json(pinnedMessages);
  } catch (error) {
    res.status(500).json({ message: "Failed to pin message" });
  }
});

conversationRouter.delete("/:conversationId/pin/:messageId", requireAuth, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const conversation = await Conversation.findById(conversationId).select("users pinnedMessageIds");
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.users.some((id) => id.toString() === req.userId)) {
      return res.status(403).json({ message: "Not a member of this conversation" });
    }

    conversation.pinnedMessageIds = conversation.pinnedMessageIds.filter(
      (id) => id.toString() !== messageId,
    );
    await conversation.save();

    const pinnedMessages = await Message.find({ _id: { $in: conversation.pinnedMessageIds } })
      .populate("senderId", "name email image")
      .sort({ createdAt: -1 });

    res.json(pinnedMessages);
  } catch (error) {
    res.status(500).json({ message: "Failed to unpin message" });
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




