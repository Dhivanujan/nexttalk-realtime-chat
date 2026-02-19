import Sidebar from "@/components/sidebar/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full relative">
      <div className="hidden md:flex h-full w-20 flex-col fixed inset-y-0 z-50">
        <Sidebar>{children}</Sidebar>
      </div>
      <main className="md:pl-20 h-full">
        {children}
      </main>
    </div>
  );
}
