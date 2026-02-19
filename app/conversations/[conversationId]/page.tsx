// app/conversations/[conversationId]/page.tsx
import getConversationById from "@/app/actions/getConversationById";
import getMessages from "@/app/actions/getMessages";
import ChatBody from "@/components/chat/ChatBody";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import { notFound } from "next/navigation";

interface IParams {
  conversationId: string;
}

const ConversationId = async ({ params }: { params: IParams }) => {
  const conversation = await getConversationById(params.conversationId);
  const messages = await getMessages(params.conversationId);

  if (!conversation) {
    return notFound();
  }

  return (
    <div className="lg:pl-80 h-full">
      <div className="h-full flex flex-col">
        <ChatHeader conversation={conversation} />
        <ChatBody initialMessages={messages} conversationId={params.conversationId} />
        <ChatInput conversationId={params.conversationId} />
      </div>
    </div>
  );
};
export default ConversationId;
