"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { UserMenu } from "@/components/layout/UserMenu";
import { cn } from "@/lib/utils";
import type { NotificationWithAppointment } from "@/lib/notifications/queries";
import type { Profile } from "@/types/database";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/calendar", label: "Calendar" },
  { href: "/products", label: "Products" },
  { href: "/forms", label: "Forms" },
  { href: "/settings", label: "Settings" },
] as const;

type BusinessNavProps = {
  profile: Pick<Profile, "full_name" | "role">;
  notifications: NotificationWithAppointment[];
  unreadCount: number;
};

export function BusinessNav({
  profile,
  notifications,
  unreadCount,
}: BusinessNavProps) {
  const currentPath = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/dashboard" className="text-lg font-semibold text-zinc-900">
          Clario
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                currentPath === item.href ||
                currentPath.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
          />
          <UserMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}
