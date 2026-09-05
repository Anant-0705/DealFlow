"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = ComponentProps<typeof Button> & { pendingLabel?: ReactNode };

export function SubmitButton({ children, pendingLabel = "Working…", disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return <Button {...props} type="submit" disabled={pending || disabled}>{pending ? pendingLabel : children}</Button>;
}
