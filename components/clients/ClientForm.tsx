"use client";

import { useActionState } from "react";
import {
  createClientAction,
  updateClientAction,
} from "@/actions/clients";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/types/database";

type ClientFormProps =
  | { mode: "create"; client?: undefined }
  | { mode: "edit"; client: Client };

export function ClientForm({ mode, client }: ClientFormProps) {
  const action = mode === "create" ? createClientAction : updateClientAction;
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "New client" : "Edit client"}
        </CardTitle>
        <CardDescription>
          {mode === "create"
            ? "Add a client to your business. They can link their account later using the same email."
            : "Update this client's contact information."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {mode === "edit" ? (
            <input type="hidden" name="clientId" value={client.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={client?.full_name ?? ""}
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={client?.email ?? ""}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={client?.phone ?? ""}
              autoComplete="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={client?.notes ?? ""}
              placeholder="Optional internal notes about this client"
            />
          </div>

          {state && !state.success ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          {state?.success && state.data?.message ? (
            <p className="text-sm text-green-700" role="status">
              {state.data.message}
            </p>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending
              ? mode === "create"
                ? "Adding…"
                : "Saving…"
              : mode === "create"
                ? "Add client"
                : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
