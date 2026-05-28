"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Calendar, Church, Heart, User } from "lucide-react";

interface MobileBottomNavProps {
  onProfileClick?: () => void;
}

export function MobileBottomNav({ onProfileClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Discover", icon: Compass },
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/masses", label: "Masses", icon: Church },
    { href: "/saved", label: "Saved", icon: Heart },
    { href: "/profile", label: "Profile", icon: User, isProfile: true },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          if (item.isProfile) {
            return (
              <button
                key={item.href}
                onClick={onProfileClick}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : ""}`} />
                <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.5px]" : ""}`} />
              <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
