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

    // Get io instance from global and emit
    const io = (global as any).io;
    if (io) {
      io.to(conversationId).emit("receive-message", newMessage);
    }
    
    // Also update conversation list for all users in conversation
    const conversation = await Conversation.findById(conversationId)
      .populate("users")
      .populate({
        path: "lastMessage",
        populate: {
          path: "senderId", // Populate senderId on Message
          select: "name email image",
        },
      });

    if (io && conversation) {
      conversation.users.forEach((user: any) => {
        if (user.email) {
            // We need a stable identifier for user socket rooms. Usually user ID or email.
            // In server.ts: socket.on("register-user", (userId) => { socket.join(userId); ... });
            // So we can emit to user ID room.
            io.to(user._id.toString()).emit("new-conversation", conversation);
        }
      });
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.log(error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
