import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";


const userRouter = Router();

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
        { $or: [{ name: { $regex: regex } }, { email: { $regex: regex } }] }
      ]
    }).select("name email image bio isOnline lastSeen");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to search users" });
  }
});

userRouter.post("/contacts", requireAuth, async (req, res) => {
  try {
    const { contactId } = req.body;
    if (!contactId) return res.status(400).json({ message: "Contact ID required" });
    
    const user = await User.findById(req.userId);
    if (!user.contacts.includes(contactId)) {
      user.contacts.push(contactId);
      await user.save();
    }
    
    // Also optionally, could we make it mutual like whatsapp? Let's just do one-way for now as per simple saving feature
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
    const user = await User.findById(req.userId).populate("contacts", "name email image bio isOnline lastSeen");
    res.json(user.contacts || []);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

userRouter.get("/", requireAuth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select("name email image bio isOnline lastSeen");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default userRouter;



