"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatWeekParam } from "@/lib/appointments/time";

type WeekNavigatorProps = {
  weekStart: string;
};

export function WeekNavigator({ weekStart }: WeekNavigatorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const start = new Date(`${weekStart}T00:00:00`);

  const prev = new Date(start);
  prev.setDate(prev.getDate() - 7);

  const next = new Date(start);
  next.setDate(next.getDate() + 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const label = `${start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} – ${end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  function weekHref(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", formatWeekParam(date));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={weekHref(prev)}>Previous week</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={weekHref(next)}>Next week</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={pathname}>This week</Link>
        </Button>
      </div>
      <p className="text-sm font-medium text-zinc-900">{label}</p>
    </div>
  );
}
