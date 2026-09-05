import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

export function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <Field><FieldLabel>{label}</FieldLabel>{children}{hint && <FieldDescription>{hint}</FieldDescription>}</Field>; }
