import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import connectToDatabase from "@/app/lib/db";
import Message from "@/app/models/Message";
import Conversation from "@/app/models/Conversation";

interface IParams {
  conversationId: string;
}

export async function POST(
  request: Request,
  { params }: { params: IParams }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { conversationId } = params;

    await connectToDatabase();

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return new NextResponse("Invalid ID", { status: 400 });
    }

    // Find last message
    const lastMessage = await Message.findById(conversation.lastMessage);

    if (!lastMessage) {
      return NextResponse.json(conversation);
    }

    // Update seen status of last message
    const updatedMessage = await Message.findByIdAndUpdate(
      lastMessage._id,
      {
        $addToSet: { seenIds: session.user.id }
      },
      { new: true }
    ).populate("senderId", "name email image").populate("seenIds");

    // Update all messages in conversation to be seen by user?
    // Usually WhatsApp style is per message, but often "seen" implies all previous messages visible.
    // For simplicity, we just update the last message which triggers the "blue ticks".
    // Or we should update all unseen messages.
    // Let's do all unread messages for robustness.
    await Message.updateMany(
      { conversationId: conversationId },
      { $addToSet: { seenIds: session.user.id } }
    );

    // Socket emission
    const io = (global as any).io;
    
    if (io) {
      io.to(conversationId).emit("message-update", updatedMessage);
      io.to(conversationId).emit("conversation-update", {
        id: conversationId,
        messages: [updatedMessage] 
      });
    }

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.log(error, 'ERROR_MESSAGES_SEEN');
    return new NextResponse("Internal Error", { status: 500 });
  }
}