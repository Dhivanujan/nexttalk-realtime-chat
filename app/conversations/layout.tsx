import ConversationList from "@/components/conversations/ConversationList";
import Sidebar from "@/components/sidebar/Sidebar";
import getConversations from "@/app/actions/getConversations";
import getUsers from "@/app/actions/getUsers";

export default async function ConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const conversations = await getConversations();
  const users = await getUsers();

  return (
    <Sidebar>
      <div className="h-full">
        <ConversationList 
          users={users} 
          initialItems={conversations} 
        />
        {children}
      </div>
    </Sidebar>
  );
}
