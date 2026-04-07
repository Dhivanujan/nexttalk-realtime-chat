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
    const { message, image, audio, sticker, conversationId } = req.body;

    if (!conversationId) {
      res.status(400).json({ message: "conversationId is required" });
      return;
    }

    if (!message && !image && !audio && !sticker) {
      res.status(400).json({ message: "message, image, audio, or sticker is required" });
      return;
    }

    const conversation = await Conversation.findById(conversationId).select("type isReadOnly channelOwnerId channelAdminIds");
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (conversation.type === "channel" && conversation.isReadOnly) {
      const isOwner = conversation.channelOwnerId?.toString() === req.userId;
      const isAdmin = conversation.channelAdminIds?.some((id) => id.toString() === req.userId);
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Only admins can post in this channel" });
      }
    }

    const newMessage = await Message.create({
      body: message,
      image,
      audio,
      sticker,
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(req.userId),
      seenIds: [new Types.ObjectId(req.userId)],
      status: 'sent'
    });

    const updatedConversation = await Conversation.findByIdAndUpdate(conversationId, {
      $set: { lastMessage: newMessage._id, updatedAt: new Date() },
      $push: { messagesIds: newMessage._id },
    }).populate("users", "pushSubscription _id");

    const populatedMessage = await Message.findById(newMessage._id).populate("senderId", "name email image");

    const io = req.app.get("io");
    if (io) {
      io.to(conversationId).emit("receive-message", populatedMessage);
    }
    
    // Send Push Notifications
    import("../lib/push.js").then(({ sendPushNotification }) => {
      const senderName = populatedMessage.senderId.name;
      const notificationPayload = {
        title: `New message from ${senderName}`,
        body: message || (audio ? "🎤 Audio message" : sticker ? "✨ Sticker" : "📷 Image"),
        icon: populatedMessage.senderId.image || "/favicon.ico",
        url: `/?conversation=${conversationId}`
      };
      
      const otherUsers = updatedConversation.users.filter(u => u._id.toString() !== req.userId);
      otherUsers.forEach(u => {
        if (u.pushSubscription) {
          sendPushNotification(u.pushSubscription, notificationPayload);
        }
      });
    }).catch(console.error);

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

messageRouter.post("/:messageId/reactions", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: "emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const existingReaction = message.reactions?.find((reaction) => reaction.emoji === emoji);

    if (existingReaction) {
      const hasReacted = existingReaction.userIds.some((id) => id.toString() === req.userId);
      if (hasReacted) {
        existingReaction.userIds = existingReaction.userIds.filter((id) => id.toString() !== req.userId);
      } else {
        existingReaction.userIds.push(new Types.ObjectId(req.userId));
      }
    } else {
      message.reactions.push({ emoji, userIds: [new Types.ObjectId(req.userId)] });
    }

    message.reactions = message.reactions.filter((reaction) => reaction.userIds.length > 0);
    await message.save();

    const populated = await Message.findById(message._id).populate("senderId", "name email image");

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message-reaction-updated", populated);
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update reactions" });
  }
});

messageRouter.delete("/:messageId", requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== req.userId) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    message.isDeleted = true;
    message.body = "This message was deleted";
    message.image = undefined;
    message.audio = undefined;
    message.sticker = undefined;
    await message.save();

    const io = req.app.get("io");
    if (io) {
      io.to(message.conversationId.toString()).emit("message-deleted", { 
        messageId, 
        conversationId: message.conversationId,
        body: message.body 
      });
    }

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message" });
  }
});

export default messageRouter;




