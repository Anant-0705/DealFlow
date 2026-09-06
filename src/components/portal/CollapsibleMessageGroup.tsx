"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageSquare, ExternalLink, Send } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MessageThread } from "@/components/portal/MessageThread";
import { formatMoney } from "@/lib/money";
import { postMessage } from "@/modules/negotiation/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type PortalMessageItem = {
  id: number;
  message: string;
  proposedDiscountBps: number | null;
  createdAt: Date;
  customerUser: { name: string; role: string };
  line: { description: string } | null;
};

export type PortalQuoteMessageGroup = {
  code: string;
  customerStatus: string;
  lastActivityAt: Date;
  currentRevision?: { version: number; totalPaise: number } | null;
  messages: PortalMessageItem[];
};

export function CollapsibleMessageGroup({
  quote,
  defaultOpen = false,
}: {
  quote: PortalQuoteMessageGroup;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const lastMessage = quote.messages[quote.messages.length - 1];

  return (
    <section
      className="panel collapsible-message-panel"
      style={{
        padding: 0,
        overflow: "hidden",
        border: "1px solid var(--line, #e2d4c7)",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
      }}
    >
      {/* Clickable compact header */}
      <div
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          padding: "14px 18px",
          cursor: "pointer",
          userSelect: "none",
          background: open ? "rgba(0,0,0,0.02)" : "transparent",
          transition: "background 0.15s ease",
        }}
        className="collapsible-header"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              borderRadius: "4px",
              color: "var(--muted, #725a4e)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            <ChevronDown size={18} />
          </span>

          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em" }}>
              {quote.code}
            </h2>
            {quote.currentRevision && (
              <span style={{ fontSize: "12px", color: "var(--muted, #725a4e)" }}>
                v{quote.currentRevision.version} · {formatMoney(quote.currentRevision.totalPaise)}
              </span>
            )}
          </div>

          <StatusBadge status={quote.customerStatus} />

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 500,
              padding: "2px 8px",
              borderRadius: "999px",
              background: "rgba(0,0,0,0.05)",
              color: "var(--muted, #725a4e)",
            }}
          >
            <MessageSquare size={11} />
            {quote.messages.length} {quote.messages.length === 1 ? "message" : "messages"}
          </span>
        </div>

        {/* Latest snippet preview when collapsed */}
        {!open && lastMessage && (
          <div
            style={{
              flex: "1 1 200px",
              fontSize: "12px",
              color: "var(--muted, #725a4e)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              padding: "0 8px",
            }}
          >
            <span style={{ fontWeight: 600 }}>{lastMessage.customerUser.name}:</span> &ldquo;{lastMessage.message}&rdquo;
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link
            href={`/portal/quotes/${quote.code}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "6px",
              border: "1px solid var(--line, #e2d4c7)",
              background: "var(--background, #fff)",
              color: "var(--ink, #1f1a17)",
              textDecoration: "none",
            }}
            title="Go to full quotation view"
          >
            Open quotation <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* Expanded message thread and reply composer */}
      {open && (
        <div style={{ padding: "16px 18px", borderTop: "1px solid var(--line, #e2d4c7)" }}>
          <MessageThread messages={quote.messages} />

          <form
            action={postMessage}
            style={{
              marginTop: "16px",
              display: "grid",
              gap: "8px",
              paddingTop: "12px",
              borderTop: "1px dashed var(--line, #e2d4c7)",
            }}
          >
            <input type="hidden" name="quoteCode" value={quote.code} />
            <Textarea
              name="text"
              required
              rows={2}
              placeholder={`Reply to the sales team regarding ${quote.code}…`}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="submit" size="sm" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Send size={13} />
                Send reply
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
