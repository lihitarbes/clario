"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientSearchProps = {
  defaultQuery: string;
  showArchived: boolean;
};

export function ClientSearch({
  defaultQuery,
  showArchived,
}: ClientSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());

    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }

    if (showArchived) {
      params.set("showArchived", "true");
    } else {
      params.delete("showArchived");
    }

    const next = params.toString();
    router.push(next ? `/clients?${next}` : "/clients");
  }

  function toggleArchived() {
    const params = new URLSearchParams(searchParams.toString());

    if (showArchived) {
      params.delete("showArchived");
    } else {
      params.set("showArchived", "true");
    }

    const next = params.toString();
    router.push(next ? `/clients?${next}` : "/clients");
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2 sm:max-w-md">
        <Label htmlFor="q">Search clients</Label>
        <div className="flex gap-2">
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={defaultQuery}
            placeholder="Search by name or email"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </div>
      </form>

      <Button type="button" variant="ghost" onClick={toggleArchived}>
        {showArchived ? "Hide archived" : "Show archived"}
      </Button>
    </div>
  );
}
