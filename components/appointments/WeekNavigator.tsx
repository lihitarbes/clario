"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatWeekParam,
  formatWeekRangeLabel,
  parseWeekParam,
  shiftWeekStart,
} from "@/lib/appointments/time";

type WeekNavigatorProps = {
  weekStart: string;
};

export function WeekNavigator({ weekStart }: WeekNavigatorProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const start =
    parseWeekParam(weekStart) ?? new Date(`${weekStart}T00:00:00`);

  const prev = shiftWeekStart(start, -1);
  const next = shiftWeekStart(start, 1);
  const label = formatWeekRangeLabel(start);

  function weekHref(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", formatWeekParam(date));
    return `${pathname}?${params.toString()}`;
  }

  function jumpToDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("week", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm" aria-label="Previous week">
          <Link href={weekHref(prev)}>
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={pathname}>Today</Link>
        </Button>
        <Button asChild variant="outline" size="sm" aria-label="Next week">
          <Link href={weekHref(next)}>
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </Button>
        <div className="flex items-center gap-2 pl-1">
          <Label
            htmlFor="calendar-jump-to-date"
            className="whitespace-nowrap text-xs font-medium text-zinc-600"
          >
            Jump to date
          </Label>
          <Input
            id="calendar-jump-to-date"
            type="date"
            className="h-9 w-auto"
            defaultValue={weekStart}
            key={weekStart}
            onChange={(event) => jumpToDate(event.target.value)}
          />
        </div>
      </div>
      <p className="text-sm font-medium text-zinc-900">{label}</p>
    </div>
  );
}
