"use client";

import { createElement } from "react";
import clsx from "clsx";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface DesktopItemProps {
  label: string;
  icon: LucideIcon;
  href: string;
  onClick?: () => void;
  active?: boolean;
}

const DesktopItem = ({ label, icon: Icon, href, onClick, active }: DesktopItemProps) => {
  const handleClick = () => {
    if (onClick) {
      return onClick();
    }
  };

  return (
    <li onClick={handleClick}>
      <Link
        href={href}
        className={clsx(
          `
        group 
        flex 
        gap-x-3 
        rounded-md 
        p-3 
        text-sm 
        leading-6 
        font-semibold 
        text-muted-foreground 
        hover:text-primary 
        hover:bg-primary/5
        transition-all
        duration-200
      `,
          active && "bg-primary/10 text-primary"
        )}
      >
        <Icon className={clsx("h-6 w-6 shrink-0 group-hover:scale-110 transition-transform", active && "text-primary")} />
        <span className="sr-only">{label}</span>
      </Link>
    </li>
  );
};

export default DesktopItem;
