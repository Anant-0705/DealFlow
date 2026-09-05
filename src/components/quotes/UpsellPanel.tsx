import { Sparkles, X } from "lucide-react";
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
}: {
  title: string;
  eyebrow: string;
  empty: string;
  addLabel: (item: OfferCard) => string;
  suggestions: Array<OfferCard & { marginDeltaPaise: number; resultingMarginBps: number }>;
  disabled: boolean;
  onAdd: (item: OfferCard) => void;
  onDismiss: (item: OfferCard) => void;
}) {
  return (
    <section className="panel upsell-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow"><Sparkles size={13}/>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {suggestions.length ? (
        <div className="upsell-list">
          {suggestions.map((item) => (
            <article key={item.key}>
              <button className="dismiss" disabled={disabled} aria-label={`Dismiss ${item.name}`} onClick={() => onDismiss(item)}>
                <X size={14}/>
              </button>
              <div className="split">
                <strong>{item.name}</strong>
                {item.isPromoted && <span className="badge info">Promoted</span>}
                {item.mode === "UPGRADE" && <span className="badge info">Upgrade</span>}
              </div>
              <span>{formatMoney(item.pricePaise)}</span>
              <p>Margin +{formatMoney(item.marginDeltaPaise)} · resulting {formatPercent(item.resultingMarginBps, 1)}</p>
              <small className="offer-reason">{item.reasons[0]}</small>
              <button className="button secondary small" disabled={disabled} onClick={() => onAdd(item)}>{addLabel(item)}</button>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">{empty}</p>
      )}
    </section>
  );
}
