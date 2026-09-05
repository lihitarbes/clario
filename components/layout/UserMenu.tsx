"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { profileInitials, roleLabel } from "@/lib/auth/display";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

type UserMenuProps = {
  profile: Pick<Profile, "full_name" | "role">;
};

/**
 * Radix menu items call preventDefault on select, which blocks nested
 * submit buttons. Submit the parent form explicitly instead.
 */
function SignOutMenuItem() {
  const { pending } = useFormStatus();

  return (
    <DropdownMenuItem
      disabled={pending}
      className="cursor-pointer"
      onSelect={(event) => {
        event.preventDefault();
        const target = event.currentTarget;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        target.closest("form")?.requestSubmit();
      }}
    >
      <ActionPendingLabel
        pending={pending}
        pendingLabel="Signing out…"
        idleLabel="Log out"
      />
    </DropdownMenuItem>
  );
}

export function UserMenu({ profile }: UserMenuProps) {
  const initials = profileInitials(profile.full_name);
  const role = roleLabel(profile.role);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-left text-sm",
          "hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
        )}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white"
          aria-hidden
        >
          {initials}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate font-medium text-zinc-900">
            {profile.full_name}
          </span>
          <span className="block truncate text-xs text-zinc-500">{role}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="font-medium text-zinc-900">{profile.full_name}</p>
          <p className="text-xs text-zinc-500">{role}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form action={signOutAction} className="w-full">
          <SignOutMenuItem />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
