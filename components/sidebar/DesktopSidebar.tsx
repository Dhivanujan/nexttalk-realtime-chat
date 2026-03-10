"use client";

import useRoutes from "@/app/hooks/useRoutes";
import { useState } from "react";
import DesktopItem from "./DesktopItem";
import { User } from "lucide-react"; // Import a placeholder icon
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useSession } from "next-auth/react";

const DesktopSidebar = () => {
  const routes = useRoutes();
  const [isOpen, setIsOpen] = useState(false);
  const session = useSession();
  const user = session?.data?.user;

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-20 lg:flex-col lg:overflow-y-auto lg:bg-background lg:border-r border-border lg:pb-4 xl:px-6 shadow-sm">
      <nav className="mt-4 flex flex-col justify-between h-full">
        <ul role="list" className="flex flex-col items-center space-y-1">
          {routes.map((item) => (
            <DesktopItem
              key={item.label}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.active}
              onClick={item.onClick}
            />
          ))}
        </ul>
        <nav className="mt-4 flex flex-col justify-between items-center">
          <div
            onClick={() => setIsOpen(true)}
            className="cursor-pointer hover:opacity-75 transition relative"
          >
            <Avatar>
              <AvatarImage src={user?.image || "/images/placeholder.jpg"} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-background bg-green-500" />
          </div>
        </nav>
      </nav>
    </div>
  );
};
export default DesktopSidebar;
