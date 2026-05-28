"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Heart, Menu, X, LogIn } from "lucide-react";
import { useState } from "react";

interface ViamHeaderProps {
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
  onProfileClick?: () => void;
  userName?: string;
  avatarUrl?: string | null;
}

export function ViamHeader({ 
  isLoggedIn = false, 
  onLoginClick, 
  onProfileClick,
  userName,
  avatarUrl 
}: ViamHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Discover" },
    { href: "/events", label: "Events" },
    { href: "/masses", label: "Latin Masses" },
    { href: "/saved", label: "Saved" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-display text-2xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
            Viam
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.href)
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/submit"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Submit Event
          </Link>
          
          {isLoggedIn ? (
            <button
              onClick={onProfileClick}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={userName || "Profile"} 
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              {userName && (
                <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                  {userName}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In</span>
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="h-px bg-border my-2" />
            <Link
              href="/submit"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
            >
              Submit Event
            </Link>
            {!isLoggedIn && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLoginClick?.();
                }}
                className="mx-4 mt-2 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
