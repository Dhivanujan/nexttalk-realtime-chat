import connectToDatabase from "@/app/lib/db";
import Conversation, { IConversation } from "@/app/models/Conversation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import User, { IUser } from "@/app/models/User";

const getConversations = async (): Promise<IConversation[]> => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return [];
  }

  try {
    await connectToDatabase();
    
    // Find user to get ID
    const user = await User.findOne({ email: session.user.email }).lean() as IUser | null;
    if (!user) return [];

    const conversations = await Conversation.find({
      users: user._id,
    })
      .sort({ lastMessageAt: -1 })
      .populate("users")
      .populate({
        path: "lastMessage",
        populate: {
          path: "senderIds", // Actually senderId on Message
          select: "name email image",
        },
      });

    return conversations as unknown as IConversation[];
  } catch (error) {
    console.log(error);
    return [];
  }
};

export default getConversations;
