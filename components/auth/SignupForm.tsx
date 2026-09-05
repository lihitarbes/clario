"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/actions/auth";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
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
import { cn } from "@/lib/utils";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Choose your role and set up your Clario account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
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
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="text-xs text-zinc-500">At least 8 characters.</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-zinc-900">
              I am signing up as
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={cn(
                  "flex cursor-pointer flex-col rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="role"
                    value="business_owner"
                    required
                    className="h-4 w-4"
                  />
                  Business owner
                </span>
                <span className="mt-1 pl-6 text-xs text-zinc-500">
                  Manage clients and your business workspace.
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer flex-col rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="role"
                    value="client"
                    required
                    className="h-4 w-4"
                  />
                  Client
                </span>
                <span className="mt-1 pl-6 text-xs text-zinc-500">
                  Book appointments and access your records.
                </span>
              </label>
            </div>
          </fieldset>

          {state && !state.success ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          {state?.success && state.data.message ? (
            <p className="text-sm text-green-700" role="status">
              {state.data.message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            <ActionPendingLabel
              pending={pending}
              pendingLabel="Creating account…"
              idleLabel="Create account"
            />
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
