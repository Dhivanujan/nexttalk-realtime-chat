// app/api/messages/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import connectToDatabase from "@/app/lib/db";
import Message from "@/app/models/Message";
import Conversation from "@/app/models/Conversation";
import { IMessage } from "@/app/models/Message";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { message, image, conversationId } = body;

    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await connectToDatabase();

    const newMessage = await Message.create({
      body: message,
      image: image,
      conversationId: conversationId,
      senderId: session.user.id, // Ideally get ID from user lookup
      seenIds: [session.user.id]
    });

    const updatedConversation = await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessageAt: new Date(),
        lastMessage: newMessage._id,
        $push: { messagesIds: newMessage._id }
      },
      { new: true }
    );

    // If using Pusher, trigger event here.
    // For Socket.io, we rely on client emitting or global.io hack.
    // We'll return the message so client can emit it.

    return NextResponse.json(newMessage);
  } catch (error) {
    console.log(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
