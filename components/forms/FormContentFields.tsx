"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formContentDirProps } from "@/lib/forms/content-direction";
import { cn } from "@/lib/utils";

/** Input for form-owned text (title, labels, options). Direction follows content. */
export function FormContentInput({ className, ...props }: InputProps) {
  return <Input className={className} {...formContentDirProps()} {...props} />;
}

type TextareaProps = ComponentPropsWithoutRef<typeof Textarea>;

/** Textarea for form-owned text. Direction follows content. */
export function FormContentTextarea({ className, ...props }: TextareaProps) {
  return (
    <Textarea className={className} {...formContentDirProps()} {...props} />
  );
}

/** Inline or block display of saved form content. */
export function FormContentText({
  children,
  className,
  as: Component = "span",
}: {
  children: ReactNode;
  className?: string;
  as?: "span" | "p" | "div" | "h1" | "h2";
}) {
  return (
    <Component className={cn(className)} {...formContentDirProps()}>
      {children}
    </Component>
  );
}
