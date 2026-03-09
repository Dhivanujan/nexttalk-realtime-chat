import connectToDatabase from "@/app/lib/db";
import Message, { IMessage } from "@/app/models/Message";

const getMessages = async (
  conversationId: string
): Promise<IMessage[]> => {
  try {
    await connectToDatabase();

    const messages = await Message.find({
      conversationId: conversationId,
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "name image email")
      .lean();

    // Map `_id` to string if needed, but lean returns ObjectId. 
    // Usually sending to client needs serialization.
    // Next.js actions serialize automatically, but date objects might be an issue.
    // However, the original code cast as unknown as IMessage[], suggesting it worked or ignored typing.
    
    return messages as unknown as IMessage[];
  } catch (error: any) {
    return [];
  }
};

export default getMessages;
