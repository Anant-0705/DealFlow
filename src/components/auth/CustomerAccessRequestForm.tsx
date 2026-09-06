"use client";

import { useActionState } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { submitCustomerAccessRequest } from "@/modules/customers/access-request-actions";
import { initialCustomerAccessRequestState } from "@/modules/customers/access-request-schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function errors(messages?: string[]) {
  return messages?.map((message) => ({ message }));
}

export function CustomerAccessRequestForm() {
  const [state, action, pending] = useActionState(submitCustomerAccessRequest, initialCustomerAccessRequestState);

  if (state.status === "success") {
    return (
      <Alert>
        <CheckCircle2 aria-hidden="true" />
        <AlertTitle>Administrator notified</AlertTitle>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  const fieldErrors = state.fieldErrors;
  return (
    <form action={action} className="form-stack" noValidate>
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Could not send the request</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <Field data-invalid={Boolean(fieldErrors?.companyName)}>
          <FieldLabel htmlFor="companyName">Company or customer name</FieldLabel>
          <Input id="companyName" name="companyName" autoComplete="organization" required minLength={2} maxLength={120} aria-invalid={Boolean(fieldErrors?.companyName)} placeholder="Acme Corporation" />
          <FieldError errors={errors(fieldErrors?.companyName)} />
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.email)}>
          <FieldLabel htmlFor="email">Primary contact email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={Boolean(fieldErrors?.email)} placeholder="buyer@company.com" />
          <FieldDescription>The activation invitation will be sent here after approval.</FieldDescription>
          <FieldError errors={errors(fieldErrors?.email)} />
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.phone)}>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={20} aria-invalid={Boolean(fieldErrors?.phone)} placeholder="+91 80 2222 1001" />
          <FieldError errors={errors(fieldErrors?.phone)} />
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.gstin)}>
          <FieldLabel htmlFor="gstin">GSTIN</FieldLabel>
          <Input id="gstin" name="gstin" autoCapitalize="characters" required minLength={15} maxLength={15} aria-invalid={Boolean(fieldErrors?.gstin)} placeholder="29AABCA1234A1Z5" />
          <FieldError errors={errors(fieldErrors?.gstin)} />
        </Field>
        <Field data-invalid={Boolean(fieldErrors?.billingAddress)}>
          <FieldLabel htmlFor="billingAddress">Billing address</FieldLabel>
          <Textarea id="billingAddress" name="billingAddress" autoComplete="street-address" required minLength={8} maxLength={240} rows={3} aria-invalid={Boolean(fieldErrors?.billingAddress)} placeholder="Street, city, state, PIN" />
          <FieldError errors={errors(fieldErrors?.billingAddress)} />
        </Field>
      </FieldGroup>
      <Button type="submit" size="lg" disabled={pending}>
        <BellRing data-icon="inline-start" />
        {pending ? "Notifying admin…" : "Notify admin"}
      </Button>
      <p className="auth-foot">Your details are used only to create the customer record and portal invitation.</p>
    </form>
  );
}
