import { getCategoryCeilings, getPolicy } from "@/modules/policy/queries";
import { saveCategoryCeiling, savePolicy } from "@/modules/policy/actions";

export default async function PolicySettingsPage() {
  const [p, categories] = await Promise.all([getPolicy(), getCategoryCeilings()]);
  return <div className="settings-grid">
    <div className="form-stack">
      <form action={savePolicy} className="panel form-stack">
        <div><span className="eyebrow">Editable thresholds</span><h2>Discount policy</h2></div>
        <h3>Tier ceilings</h3>
        <div className="form-row three"><label>Bronze %<input name="tierCeilingBronze" type="number" defaultValue={p.tierCeilingBronzeBps / 100}/></label><label>Silver %<input name="tierCeilingSilver" type="number" defaultValue={p.tierCeilingSilverBps / 100}/></label><label>Gold %<input name="tierCeilingGold" type="number" defaultValue={p.tierCeilingGoldBps / 100}/></label></div>
        <h3>Finance triggers</h3>
        <div className="form-row three"><label>Line excess pts<input name="financeLineExcess" type="number" defaultValue={p.financeLineExcessBps / 100}/></label><label>Blended excess %<input name="financeBlendedExcess" type="number" defaultValue={p.financeBlendedExcessBps / 100}/></label><label>Excess value ₹<input name="financeExcessValueRupees" type="number" defaultValue={p.financeExcessValuePaise / 100}/></label></div>
        <div className="form-row three"><label>Stale after days<input name="staleAfterDays" type="number" defaultValue={p.staleAfterDays}/></label><label>Anomaly delta pts<input name="anomalyDelta" type="number" defaultValue={p.anomalyDeltaBps / 100}/></label><label>Upsell margin floor %<input name="upsellMarginFloor" type="number" defaultValue={p.upsellMarginFloorBps / 100}/></label></div>
        <button className="button primary">Save policy</button>
      </form>
      <section className="panel form-stack">
        <div><span className="eyebrow">Product controls</span><h2>Category ceilings</h2><p className="muted-copy">The stricter of the customer-tier and category ceiling is used on every quote line.</p></div>
        {categories.map((category) => <form action={saveCategoryCeiling} className="form-row category-policy-row" key={category.id}>
          <input type="hidden" name="categoryId" value={category.id}/>
          <label>{category.name} %<input name="discountCeilingPercent" type="number" min="0" max="100" step="0.1" defaultValue={category.discountCeilingBps / 100}/></label>
          <button className="button secondary">Update</button>
        </form>)}
      </section>
    </div>
    <aside className="panel chain-card"><span className="eyebrow">Approval chain</span><h2>One policy. Three outcomes.</h2><ol><li><b>01</b><span><strong>Within limits</strong><small>Auto-approved</small></span></li><li><b>02</b><span><strong>Any breach</strong><small>Sales Manager</small></span></li><li><b>03</b><span><strong>Line ≥ {p.financeLineExcessBps / 100} pts, blended ≥ {p.financeBlendedExcessBps / 100}%, or value ≥ ₹{(p.financeExcessValuePaise / 100).toLocaleString("en-IN")}</strong><small>Sales Manager, then Finance</small></span></li></ol></aside>
  </div>;
}
