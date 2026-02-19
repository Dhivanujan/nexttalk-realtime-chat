import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Users, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const useRoutes = () => {
  const pathname = usePathname();

  const routes = useMemo(
    () => [
      {
        label: "Chat",
        href: "/conversations", // Assuming /conversations is the list
        icon: MessageCircle,
        active: pathname === "/conversations" || !!pathname?.startsWith("/conversations"),
      },
      {
        label: "Users",
        href: "/users",
        icon: Users,
        active: pathname === "/users",
      },
      {
        label: "Logout",
        onClick: () => signOut(),
        href: "#",
        icon: LogOut,
      },
    ],
    [pathname]
  );
  return routes;
};

export default useRoutes;
