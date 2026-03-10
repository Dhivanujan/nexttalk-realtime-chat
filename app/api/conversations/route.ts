import { NextResponse } from "next/server";
import connectToDatabase from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import User from "@/app/models/User";
import Conversation from "@/app/models/Conversation";

export async function POST(
  request: Request
) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const {
      userId,
      isGroup,
      members,
      name
    } = body;

    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 400 });
    }

    await connectToDatabase();

    const currentUser = await User.findOne({
      email: session.user.email
    });

    if (!currentUser) {
      return new NextResponse('Unauthorized', { status: 400 });
    }

    if (isGroup && (!members || members.length < 2 || !name)) {
      return new NextResponse('Invalid data', { status: 400 });
    }

    if (isGroup) {
      const newConversation = await Conversation.create({
        name,
        isGroup,
        users: [...members, currentUser._id], 
        messagesIds: []
      });

      // Update all users
      await User.updateMany(
        { _id: { $in: [...members, currentUser._id] } },
        { $push: { conversations: newConversation._id } }
      );

      // Populate users
      const populatedConversation = await Conversation.findById(newConversation._id)
        .populate('users');

      if (!populatedConversation) {
        return new NextResponse("Conversation not found", { status: 404 });
      }

      // Socket emission
      const io = (global as any).io;
      if (io) {
        populatedConversation.users.forEach((user: any) => {
          if (user.email) {
            io.to(user._id.toString()).emit('new-conversation', populatedConversation);
          }
        });
      }

      return NextResponse.json(populatedConversation);
    }

    const existingConversations = await Conversation.find({
      $or: [
        {
          users: { $all: [currentUser._id, userId] }
        },
        {
          users: { $all: [userId, currentUser._id] }
        }
      ]
    }).populate('users');

    const singleConversation = existingConversations.find((conv) => !conv.isGroup);

    if (singleConversation) {
      return NextResponse.json(singleConversation);
    }

    const newConversation = await Conversation.create({
      users: [currentUser._id, userId],
      isGroup: false,
      messagesIds: []
    });

    // Update users
    await User.updateMany(
      { _id: { $in: [currentUser._id, userId] } },
      { $push: { conversations: newConversation._id } }
    );
    
    const populatedConversation = await Conversation.findById(newConversation._id)
      .populate('users');

    // Socket emission
    const io = (global as any).io;
    if (io) {
      [currentUser._id, userId].forEach((id) => {
         io.to(id.toString()).emit('new-conversation', populatedConversation);
      });
    }

    return NextResponse.json(populatedConversation);
  } catch (error: any) {
    console.log(error, 'REGISTRATION_ERROR');
    return new NextResponse('Internal Error', { status: 500 });
  }
}
