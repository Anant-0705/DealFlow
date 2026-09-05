import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatPercent } from "@/lib/money";
import type { OfferCard } from "@/modules/upsell/suggest";

export function OfferPanel({
  title,
  eyebrow,
  empty,
  addLabel,
  suggestions,
  disabled,
  onAdd,
  onDismiss,
  collapsedLimit = 1,
}: {
  title: string;
  eyebrow: string;
  empty: string;
  addLabel: (item: OfferCard) => string;
  suggestions: Array<OfferCard & { marginDeltaPaise: number; resultingMarginBps: number }>;
  disabled: boolean;
  onAdd: (item: OfferCard) => void;
  onDismiss: (item: OfferCard) => void;
  collapsedLimit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleSuggestions = expanded ? suggestions : suggestions.slice(0, collapsedLimit);
  const hiddenCount = Math.max(0, suggestions.length - visibleSuggestions.length);

  return (
    <section className={`panel upsell-panel upsell-panel-${title.toLowerCase().replaceAll(" ", "-")}`} data-offer-panel={title.toLowerCase()}>
      <div className="panel-heading offer-panel-heading">
        <div>
          <span className="eyebrow"><Sparkles size={13}/>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <div className="offer-panel-meta"><span className="offer-kind">{title === "Upsell" ? "Upgrade path" : "Recommended together"}</span><span className="offer-count">{suggestions.length} available</span></div>
      </div>
      {suggestions.length ? (
        <div className="upsell-list">
          {visibleSuggestions.map((item) => (
            <article key={item.key}>
              <Button type="button" variant="ghost" size="icon-sm" className="dismiss" disabled={disabled} aria-label={`Dismiss ${item.name}`} onClick={() => onDismiss(item)}>
                <X/>
              </Button>
              <div className="split">
                <strong>{item.name}</strong>
                {item.isPromoted && <Badge variant="secondary">Promoted</Badge>}
                {item.mode === "UPGRADE" && <Badge variant="secondary">Upgrade</Badge>}
              </div>
              <span>{formatMoney(item.pricePaise)}</span>
              <p>Margin +{formatMoney(item.marginDeltaPaise)} · resulting {formatPercent(item.resultingMarginBps, 1)}</p>
              <small className="offer-reason">{item.reasons[0]}</small>
              <Button type="button" variant="secondary" size="sm" className="offer-action" disabled={disabled} onClick={() => onAdd(item)}>{addLabel(item)}</Button>
            </article>
          ))}
          {(hiddenCount > 0 || expanded) && <Button type="button" variant="ghost" size="sm" className="offer-more" onClick={() => setExpanded((value) => !value)}>
            {expanded ? <>Show less<ChevronUp data-icon="inline-end"/></> : <>Show {hiddenCount} more<ChevronDown data-icon="inline-end"/></>}
          </Button>}
        </div>
      ) : (
        <p className="empty-note">{empty}</p>
      )}
    </section>
  );
}
