"use client";

import { Check } from "lucide-react";
import { confirmOnBehalf } from "@/modules/negotiation/actions";
import { CHANNEL_LABELS, CONFIRM_CHANNELS } from "@/modules/negotiation/on-behalf";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

const channelOptions = CONFIRM_CHANNELS.map((channel) => ({
  value: channel,
  label: channel === "IN_PERSON" ? "In person" : channel === "PURCHASE_ORDER" ? "Purchase order" : CHANNEL_LABELS[channel][0].toUpperCase() + CHANNEL_LABELS[channel].slice(1),
}));

export function ConfirmOnBehalfDialog({
  quoteCode,
  revisionId,
  version,
  totalLabel,
  customerName,
  customerStatus,
}: {
  quoteCode: string;
  revisionId: number;
  version: number;
  totalLabel: string;
  customerName: string;
  customerStatus: string;
}) {
  const unsent = customerStatus !== "SENT" && customerStatus !== "NEGOTIATING";
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline"/>}>
        <Check data-icon="inline-start"/>Confirm on behalf
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <form action={confirmOnBehalf} className="on-behalf-form">
          <DialogHeader>
            <DialogTitle>Confirm on behalf of {customerName}</DialogTitle>
            <DialogDescription>
              This creates the order and invoices for {quoteCode} v{version} · {totalLabel}. Record how the customer authorized this version.
            </DialogDescription>
          </DialogHeader>
          {unsent ? <p className="on-behalf-warning">This quotation has not been sent to the customer portal.</p> : null}
          <input type="hidden" name="quoteCode" value={quoteCode}/>
          <input type="hidden" name="revisionId" value={revisionId}/>
          <div className="on-behalf-field">
            <Label htmlFor="on-behalf-channel">How they agreed</Label>
            <NativeSelect id="on-behalf-channel" name="channel" required className="w-full" defaultValue="">
              <NativeSelectOption value="" disabled>Select a channel</NativeSelectOption>
              {channelOptions.map((option) => <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>)}
            </NativeSelect>
          </div>
          <div className="on-behalf-field">
            <Label htmlFor="on-behalf-note">Who agreed, and any PO or reference</Label>
            <Textarea id="on-behalf-note" name="note" required minLength={8} maxLength={500} placeholder="Example: Spoke with Anika Sharma, PO 4412"/>
          </div>
          <label className="on-behalf-check">
            <input type="checkbox" name="authorized" value="yes" required/>
            <span>The customer authorized this version. I understand this starts the order and billing.</span>
          </label>
          <DialogFooter>
            <SubmitButton pendingLabel="Confirming…">Confirm quotation</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
