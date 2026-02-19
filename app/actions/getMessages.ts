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
      .populate("senderId", "name image email");

    return messages as unknown as IMessage[];
  } catch (error: any) {
    return [];
  }
};

export default getMessages;
