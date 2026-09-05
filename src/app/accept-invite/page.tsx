import Link from "next/link";
import { acceptCustomerInvite } from "@/modules/customers/actions";
import { getOpenInvite } from "@/modules/customers/queries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = "", error } = await searchParams;
  const invite = await getOpenInvite(token);
  const unavailable = error ?? (invite ? null : token
    ? "This invitation is invalid, expired, or has already been used. Ask DealFlow to send a new one."
    : "This invitation link is missing.");
  return <main className="auth-page"><Card className="w-full max-w-md"><CardHeader><div className="auth-brand"><span className="brand-mark">D</span><div><strong>DealFlow</strong><small>Customer portal</small></div></div><CardTitle>Activate your customer access</CardTitle><CardDescription>{invite ? `This invitation connects your sign-in to ${invite.customer.name}. Choose your name and password below.` : "This invitation connects your sign-in to the business that sent it."}</CardDescription></CardHeader><CardContent>{unavailable && <Alert variant="destructive"><AlertTitle>{invite ? "Could not activate" : "Invitation unavailable"}</AlertTitle><AlertDescription>{unavailable}</AlertDescription></Alert>}{invite && <form action={acceptCustomerInvite} className="form-stack"><input type="hidden" name="token" value={token}/><FieldGroup><Field><FieldLabel htmlFor="invite-name">Your name</FieldLabel><Input id="invite-name" name="name" autoComplete="name" required minLength={2} maxLength={80}/></Field><Field><FieldLabel htmlFor="invite-password">Create a password</FieldLabel><Input id="invite-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72}/></Field></FieldGroup><Button type="submit" size="lg">Activate account</Button></form>}</CardContent><CardFooter><p className="auth-foot">Already activated? <Link href="/login">Sign in</Link></p></CardFooter></Card></main>;
}
