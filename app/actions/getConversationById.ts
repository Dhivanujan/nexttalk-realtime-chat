import connectToDatabase from "@/app/lib/db";
import Conversation, { IConversation } from "@/app/models/Conversation";

const getConversationById = async (
  conversationId: string
): Promise<IConversation | null> => {
  try {
    await connectToDatabase();

    const conversation = await Conversation.findById(conversationId)
      .populate("users");

    if (!conversation) return null;

    return conversation as unknown as IConversation;
  } catch (error) {
    return null;
  }
};

export default getConversationById;
