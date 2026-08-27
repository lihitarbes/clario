"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home" },
  { href: "/appointments", label: "Appointments" },
  { href: "/visits", label: "Visits" },
  { href: "/shop", label: "Shop" },
  { href: "/my-forms", label: "Forms" },
  { href: "/profile", label: "Profile" },
] as const;

export function ClientNav() {
  const currentPath = usePathname();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/home" className="text-lg font-semibold text-zinc-900">
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
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
