export const CONFIRM_CHANNELS = ["PHONE", "EMAIL", "IN_PERSON", "PURCHASE_ORDER", "OTHER"] as const;
export type ConfirmChannel = (typeof CONFIRM_CHANNELS)[number];

export const CHANNEL_LABELS: Record<ConfirmChannel, string> = {
  PHONE: "phone",
  EMAIL: "email",
  IN_PERSON: "in person",
  PURCHASE_ORDER: "purchase order",
  OTHER: "other",
};

export function isConfirmChannel(value: unknown): value is ConfirmChannel {
  return typeof value === "string" && (CONFIRM_CHANNELS as readonly string[]).includes(value);
}

export function parseOnBehalfMeta(meta: unknown) {
  const record = meta && typeof meta === "object" && !Array.isArray(meta) ? meta as Record<string, unknown> : {};
  return {
    onBehalf: record.onBehalf === true,
    channel: isConfirmChannel(record.channel) ? record.channel : null,
    note: typeof record.note === "string" && record.note.trim() ? record.note.trim() : null,
  };
}

export function onBehalfAuditReason(channel: ConfirmChannel, note: string) {
  return `Confirmed on behalf of the customer via ${CHANNEL_LABELS[channel]}. ${note.trim()}`;
}

export function onBehalfPortalMessage(args: { actorName: string; version: number; channel: ConfirmChannel; note: string }) {
  return `${args.actorName} confirmed quotation v${args.version} on your behalf. They recorded that you agreed by ${CHANNEL_LABELS[args.channel]}: ${args.note.trim()}`;
}

export function canReportUnauthorizedConfirm(state: { customerStatus: string; onBehalf: boolean; alreadyReported: boolean }) {
  return state.customerStatus === "CONFIRMED" && state.onBehalf && !state.alreadyReported;
}

export function disputePortalMessage(note: string) {
  return `I did not authorize this confirmation. ${note.trim()}`;
}

export function disputeTaskMessage(args: { customerName: string; quoteCode: string; note: string }) {
  return `${args.customerName} reported that they did not authorize ${args.quoteCode}. ${args.note.trim()} Do not reserve or ship until this is reviewed.`;
}
