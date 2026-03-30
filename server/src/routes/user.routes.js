import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";


const userRouter = Router();

userRouter.get("/", requireAuth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select("name email image bio isOnline lastSeen");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export default userRouter;



