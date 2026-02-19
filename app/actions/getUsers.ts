import connectToDatabase from "@/app/lib/db";
import User, { IUser } from "@/app/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

const getUsers = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return [];
  }

  try {
    await connectToDatabase();
    const users = await User.find({
      email: { $ne: session.user.email },
    })
      .sort({ createdAt: -1 })
      .select("-password");

    return users as unknown as IUser[];
  } catch (error: any) {
    return [];
  }
};
export default getUsers;
