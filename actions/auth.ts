"use server";

import { redirect } from "next/navigation";
import { linkClientsByAuthenticatedEmail } from "@/lib/auth/client-linking";
import { mapAuthError } from "@/lib/auth/errors";
import { ensureBusinessOwnerOnboarded } from "@/lib/auth/onboarding";
import { getSafeRedirectPath } from "@/lib/auth/routing";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";
import {
  actionError,
  actionSuccess,
  type ActionResult,
} from "@/types/actions";
import type { UserRole } from "@/types/database";

type AuthActionState = ActionResult<{ message?: string }> | null;

async function getProfileForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function runPostAuthSetup(userId: string, role: UserRole) {
  const supabase = await createClient();

  if (role === "business_owner") {
    const result = await ensureBusinessOwnerOnboarded(supabase, userId);
    if (!result.ok) {
      return actionError(result.error);
    }
    return actionSuccess({});
  }

  const linkResult = await linkClientsByAuthenticatedEmail(supabase, userId);
  if (!linkResult.ok) {
    return actionError(linkResult.error);
  }

  return actionSuccess({});
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const { fullName, email, password, role } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (error) {
    return actionError(mapAuthError(error.message));
  }

  if (!data.user) {
    return actionError("Unable to create your account. Please try again.");
  }

  if (!data.session) {
    return actionSuccess({
      message:
        "Account created. If email confirmation is enabled, check your inbox before logging in.",
    });
  }

  const setupResult = await runPostAuthSetup(data.user.id, role);
  if (!setupResult.success) {
    return setupResult;
  }

  redirect(getSafeRedirectPath(null, role));
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const redirectTo = formData.get("redirect")?.toString();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
  });

  if (error) {
    return actionError(mapAuthError(error.message));
  }

  if (!data.user) {
    return actionError("Unable to sign in. Please try again.");
  }

  const profile = await getProfileForUser(data.user.id);
  if (!profile) {
    return actionError("Your profile could not be loaded. Please try again.");
  }

  const setupResult = await runPostAuthSetup(data.user.id, profile.role);
  if (!setupResult.success) {
    return setupResult;
  }

  redirect(getSafeRedirectPath(redirectTo, profile.role));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
