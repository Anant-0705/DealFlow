import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/settings/ProductForm";
import { getProduct } from "@/modules/catalog/queries";
import { saveVariant } from "@/modules/catalog/actions";
import { listPlans } from "@/modules/plans/queries";
import { prisma } from "@/lib/prisma";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, plans] = await Promise.all([getProduct(Number(id)), prisma.category.findMany({ orderBy: { name: "asc" } }), listPlans()]);
  if (!product) notFound();
  return <div><Link href="/app/settings/products" className="back-link">← Products</Link><div className="settings-grid">
    <ProductForm categories={categories} plans={plans} product={product}/>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Attribute · value · extra price</span><h2>Variants</h2></div></div><div className="variant-list">{product.variants.map((variant) => <form action={saveVariant} key={variant.id}><input type="hidden" name="id" value={variant.id}/><input type="hidden" name="productId" value={product.id}/><input name="attributeName" defaultValue={variant.attributeName}/><input name="attributeValue" defaultValue={variant.attributeValue}/><input name="extraPriceRupees" type="number" step="0.01" defaultValue={variant.extraPricePaise / 100}/><button className="button secondary small">Save</button></form>)}</div><form action={saveVariant} className="variant-create"><input type="hidden" name="productId" value={product.id}/><input name="attributeName" placeholder="Attribute, e.g. RAM" required/><input name="attributeValue" placeholder="Value, e.g. 64GB" required/><input name="extraPriceRupees" type="number" step="0.01" placeholder="Extra ₹" defaultValue="0"/><button className="button primary small">Add variant</button></form></section>
  </div></div>;
}
