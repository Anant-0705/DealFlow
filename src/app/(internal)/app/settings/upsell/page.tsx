import { listOfferProducts, listPairings } from "@/modules/upsell/queries";
import { deletePairing, savePairing } from "@/modules/upsell/actions";

function PairingFields({
  products,
  pairing,
}: {
  products: Array<{ id: number; name: string }>;
  pairing?: { id: number; productId: number; suggestedProductId: number; kind: "UPSELL" | "CROSS_SELL"; weight: number; active: boolean; coPurchaseCount?: number };
}) {
  return (
    <>
      {pairing && <input type="hidden" name="id" value={pairing.id}/>}
      <label>When quote contains
        <select name="productId" defaultValue={pairing?.productId ?? ""} required>
          {!pairing && <option value="" disabled>Choose product</option>}
          {products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}
        </select>
      </label>
      <label>Suggest
        <select name="suggestedProductId" defaultValue={pairing?.suggestedProductId ?? ""} required>
          {!pairing && <option value="" disabled>Choose product</option>}
          {products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}
        </select>
      </label>
      <label>Kind
        <select name="kind" defaultValue={pairing?.kind ?? "CROSS_SELL"}>
          <option value="UPSELL">Upsell</option>
          <option value="CROSS_SELL">Cross-sell</option>
        </select>
      </label>
      <label>Weight
        <input name="weight" type="number" min="1" max="10" defaultValue={pairing?.weight ?? 5} required/>
      </label>
      <label className="check"><input name="active" type="checkbox" defaultChecked={pairing?.active ?? true}/>Active</label>
    </>
  );
}

export default async function OffersSettingsPage() {
  const [pairings, products] = await Promise.all([listPairings(), listOfferProducts()]);
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Catalog relations</span>
          <h2>Upsell and cross-sell</h2>
        </div>
      </div>
      <p className="muted">Each row is a relation: when a quote contains product A, offer product B. Kind decides which quote panel it appears on. Confirmed deals that contain both products raise the ranking automatically. Variant upgrades (for example 16GB → 32GB) are generated automatically and do not need a row.</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>When quote contains</th>
              <th>Suggest</th>
              <th>Kind</th>
              <th>Weight</th>
              <th>Together</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pairings.map((pairing) => (
              <tr key={pairing.id}>
                <td colSpan={7}>
                  <form action={savePairing} className="offer-row">
                    <PairingFields products={products} pairing={pairing}/>
                    <span className="muted">{pairing.coPurchaseCount ?? 0} confirmed {(pairing.coPurchaseCount ?? 0) === 1 ? "deal" : "deals"}</span>
                    <button className="button secondary small">Save</button>
                  </form>
                  <form action={deletePairing}>
                    <input type="hidden" name="id" value={pairing.id}/>
                    <button className="button secondary small">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
            {!pairings.length && <tr><td colSpan={7}>No pairings yet. Create one below so every product can suggest another.</td></tr>}
          </tbody>
        </table>
      </div>
      <form action={savePairing} className="create-row offer-create">
        <PairingFields products={products}/>
        <button className="button primary small">Create pairing</button>
      </form>
    </section>
  );
}
