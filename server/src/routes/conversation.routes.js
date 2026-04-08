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
    const { userId, isGroup, members, name, type, description, image, isReadOnly } = req.body;

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
        description: description || "",
        image: image || "",
        isReadOnly: Boolean(isReadOnly),
        users: userIds,
        messagesIds: [],
        pinnedMessageIds: [],
        channelOwnerId: new Types.ObjectId(req.userId),
        channelAdminIds: [new Types.ObjectId(req.userId)],
        channelAudit: [
          {
            action: "channel_created",
            actorId: new Types.ObjectId(req.userId),
            meta: { name, isReadOnly: Boolean(isReadOnly) },
          },
        ],
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

conversationRouter.get("/:conversationId/channel-settings", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId)
      .populate("users", "name email image")
      .select("name type users description image isReadOnly channelOwnerId channelAdminIds");

    if (!conversation || conversation.type !== "channel") {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!conversation.users.some((id) => id._id?.toString() === req.userId || id.toString() === req.userId)) {
      return res.status(403).json({ message: "Not a member of this channel" });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch channel settings" });
  }
});

conversationRouter.get("/:conversationId/channel-audit", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const before = req.query.before ? new Date(req.query.before) : null;
    const conversation = await Conversation.findById(conversationId)
      .populate("channelAudit.actorId", "name email image")
      .populate("channelAudit.targetId", "name email image")
      .select("type users channelAudit");

    if (!conversation || conversation.type !== "channel") {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!conversation.users.some((id) => id.toString() === req.userId)) {
      return res.status(403).json({ message: "Not a member of this channel" });
    }

    const sorted = (conversation.channelAudit || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const filtered = before
      ? sorted.filter((entry) => new Date(entry.createdAt) < before)
      : sorted;

    const entries = filtered.slice(0, limit);
    const nextCursor = entries.length > 0 ? entries[entries.length - 1].createdAt : null;
    const hasMore = filtered.length > limit;

    res.json({ entries, nextCursor, hasMore });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch channel audit" });
  }
});

conversationRouter.patch("/:conversationId/channel-settings", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { name, description, image, isReadOnly, memberIds, adminIds, ownerId } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.type !== "channel") {
      return res.status(404).json({ message: "Channel not found" });
    }

    const isOwner = conversation.channelOwnerId?.toString() === req.userId;
    const isAdmin = conversation.channelAdminIds?.some((id) => id.toString() === req.userId);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const previous = {
      name: conversation.name,
      description: conversation.description,
      image: conversation.image,
      isReadOnly: conversation.isReadOnly,
      users: conversation.users.map((id) => id.toString()),
      admins: conversation.channelAdminIds.map((id) => id.toString()),
      ownerId: conversation.channelOwnerId?.toString(),
    };

    if (name !== undefined) {
      conversation.name = name;
    }

    if (description !== undefined) {
      conversation.description = description;
    }

    if (image !== undefined) {
      conversation.image = image;
    }

    if (isReadOnly !== undefined) {
      conversation.isReadOnly = Boolean(isReadOnly);
    }

    if (ownerId && !isOwner) {
      return res.status(403).json({ message: "Only the owner can transfer ownership" });
    }

    if (Array.isArray(memberIds)) {
      const uniqueMembers = [...new Set([...memberIds, req.userId])].map((id) => new Types.ObjectId(id));
      conversation.users = uniqueMembers;

      const ownerMatch = conversation.channelOwnerId?.toString();
      if (!uniqueMembers.some((id) => id.toString() === ownerMatch)) {
        if (!isOwner) {
          return res.status(403).json({ message: "Only the owner can remove the owner" });
        }
        conversation.channelOwnerId = new Types.ObjectId(req.userId);
      }

      if (Array.isArray(adminIds)) {
        conversation.channelAdminIds = adminIds
          .filter((id) => uniqueMembers.some((memberId) => memberId.toString() === id))
          .map((id) => new Types.ObjectId(id));
      }
    } else if (Array.isArray(adminIds)) {
      conversation.channelAdminIds = adminIds
        .filter((id) => conversation.users.some((memberId) => memberId.toString() === id))
        .map((id) => new Types.ObjectId(id));
    }

    if (ownerId) {
      const ownerIsMember = conversation.users.some((memberId) => memberId.toString() === ownerId);
      if (!ownerIsMember) {
        conversation.users.push(new Types.ObjectId(ownerId));
      }
      conversation.channelOwnerId = new Types.ObjectId(ownerId);
    }

    const next = {
      name: conversation.name,
      description: conversation.description,
      image: conversation.image,
      isReadOnly: conversation.isReadOnly,
      users: conversation.users.map((id) => id.toString()),
      admins: conversation.channelAdminIds.map((id) => id.toString()),
      ownerId: conversation.channelOwnerId?.toString(),
    };

    const auditEntries = [];
    if (previous.name !== next.name) {
      auditEntries.push({
        action: "name_updated",
        actorId: new Types.ObjectId(req.userId),
        meta: { from: previous.name, to: next.name },
      });
    }
    if (previous.description !== next.description) {
      auditEntries.push({
        action: "description_updated",
        actorId: new Types.ObjectId(req.userId),
        meta: { from: previous.description, to: next.description },
      });
    }
    if (previous.image !== next.image) {
      auditEntries.push({
        action: "avatar_updated",
        actorId: new Types.ObjectId(req.userId),
      });
    }
    if (previous.isReadOnly !== next.isReadOnly) {
      auditEntries.push({
        action: next.isReadOnly ? "read_only_enabled" : "read_only_disabled",
        actorId: new Types.ObjectId(req.userId),
      });
    }

    const removedMembers = previous.users.filter((id) => !next.users.includes(id));
    const addedMembers = next.users.filter((id) => !previous.users.includes(id));
    removedMembers.forEach((memberId) => {
      auditEntries.push({
        action: "member_removed",
        actorId: new Types.ObjectId(req.userId),
        targetId: new Types.ObjectId(memberId),
      });
    });
    addedMembers.forEach((memberId) => {
      auditEntries.push({
        action: "member_added",
        actorId: new Types.ObjectId(req.userId),
        targetId: new Types.ObjectId(memberId),
      });
    });

    const removedAdmins = previous.admins.filter((id) => !next.admins.includes(id));
    const addedAdmins = next.admins.filter((id) => !previous.admins.includes(id));
    removedAdmins.forEach((adminId) => {
      auditEntries.push({
        action: "admin_removed",
        actorId: new Types.ObjectId(req.userId),
        targetId: new Types.ObjectId(adminId),
      });
    });
    addedAdmins.forEach((adminId) => {
      auditEntries.push({
        action: "admin_added",
        actorId: new Types.ObjectId(req.userId),
        targetId: new Types.ObjectId(adminId),
      });
    });

    if (previous.ownerId !== next.ownerId && next.ownerId) {
      auditEntries.push({
        action: "owner_transferred",
        actorId: new Types.ObjectId(req.userId),
        targetId: new Types.ObjectId(next.ownerId),
      });
    }

    if (auditEntries.length > 0) {
      conversation.channelAudit.push(...auditEntries);

      const retentionDays = 90;
      const maxEntries = 500;
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      conversation.channelAudit = conversation.channelAudit.filter(
        (entry) => entry.createdAt && entry.createdAt >= cutoff,
      );

      if (conversation.channelAudit.length > maxEntries) {
        conversation.channelAudit = conversation.channelAudit.slice(-maxEntries);
      }
    }

    await conversation.save();

    const populated = await Conversation.findById(conversation._id)
      .populate("users", "name email image bio isOnline")
      .populate("lastMessage");

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update channel settings" });
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




