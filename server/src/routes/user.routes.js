import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";


const userRouter = Router();

userRouter.post("/push/subscribe", requireAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    await User.findByIdAndUpdate(req.userId, { pushSubscription: subscription });
    res.status(200).json({ message: "Subscription saved" });
  } catch (error) {
    res.status(500).json({ message: "Failed to save subscription" });
  }
});

userRouter.put("/profile", requireAuth, async (req, res) => {
  try {
    const { name, bio, image, email, phone } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (image !== undefined) updateData.image = image;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone.replace(/\s+/g, "").trim();

    if (updateData.email) {
      const emailOwner = await User.findOne({ email: updateData.email, _id: { $ne: req.userId } });
      if (emailOwner) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    if (updateData.phone) {
      const phoneOwner = await User.findOne({ phone: updateData.phone, _id: { $ne: req.userId } });
      if (phoneOwner) {
        return res.status(409).json({ message: "Phone already in use" });
      }
    }

    const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true }).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile" });
  }
});

userRouter.get("/search", requireAuth, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
    const regex = new RegExp(query, "i");
    const users = await User.find({
      $and: [
        { _id: { $ne: req.userId } },
        { $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }, { phone: { $regex: regex } }] }
      ]
    }).select("name email phone image bio isOnline lastSeen");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to search users" });
  }
});

userRouter.post("/contacts", requireAuth, async (req, res) => {
  try {
    const { contactId, email, phone } = req.body;
    
    let targetUserId = contactId;

    if (email || phone) {
      const query = {};
      if (email) query.email = email.toLowerCase();
      if (phone) query.phone = phone.replace(/\s+/g, "").trim();

      const targetUser = await User.findOne(query);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      if (targetUser._id.toString() === req.userId) {
        return res.status(400).json({ message: "You cannot add yourself" });
      }
      targetUserId = targetUser._id;
    }

    if (!targetUserId) return res.status(400).json({ message: "Contact ID or email required" });
    
    const user = await User.findById(req.userId);
    if (!user.contacts.includes(targetUserId)) {
      user.contacts.push(targetUserId);
      await user.save();
    }
    
    res.status(200).json({ message: "Contact added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add contact" });
  }
});

userRouter.delete("/contacts/:contactId", requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      $pull: { contacts: req.params.contactId }
    });
    res.status(200).json({ message: "Contact removed" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove contact" });
  }
});

userRouter.get("/contacts", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate("contacts", "name email phone image bio isOnline lastSeen");
    res.json(user.contacts || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

userRouter.get("/", requireAuth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select("name email phone image bio isOnline lastSeen");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default userRouter;



