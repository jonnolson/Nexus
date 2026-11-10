"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ChevronsUpDown, LogOut, Settings, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/sign-out";
import { setSoundsEnabled, soundsEnabled, subscribeSounds } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function UserMenu({ email, compact = false }: { email: string; compact?: boolean }) {
  const initial = email.charAt(0).toUpperCase() || "?";
  const sounds = useSyncExternalStore(subscribeSounds, soundsEnabled, () => true);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-md text-left text-sm outline-none",
          "hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
          compact ? "p-1" : "w-full min-w-0 p-2",
        )}
        aria-label="Account menu"
      >
        <Avatar className="size-7">
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        {!compact && (
          <>
            <span className="flex-1 truncate">{email}</span>
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"} className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          // Keep the menu open so the change is visible.
          onSelect={(e) => {
            e.preventDefault();
            setSoundsEnabled(!sounds);
          }}
        >
          {sounds ? <Volume2 /> : <VolumeX />}
          {sounds ? "Sounds on" : "Sounds off"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
