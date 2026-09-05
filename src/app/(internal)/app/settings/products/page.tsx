import Link from "next/link";
import { ProductForm } from "@/components/settings/ProductForm";
import { listProducts } from "@/modules/catalog/queries";
import { listPlans } from "@/modules/plans/queries";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatPercent } from "@/lib/money";

export default async function ProductsSettingsPage() {
  const [products, categories, plans] = await Promise.all([listProducts(), prisma.category.findMany({ orderBy: { name: "asc" } }), listPlans()]);
  return <div className="settings-grid">
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">Catalog</span><h2>{products.length} products</h2></div></div><div className="table-scroll"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Cost</th><th>Tax</th><th>Status</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td><Link href={`/app/settings/products/${product.id}`}>{product.name}<small>{product.sku} · {product.variants.length} variants</small></Link></td><td>{product.category.name}</td><td>{formatMoney(product.listPricePaise)}</td><td>{formatMoney(product.costPaise)}</td><td>{formatPercent(product.taxBps)}</td><td>{product.active ? "Active" : "Archived"}</td></tr>)}</tbody></table></div></section>
    <ProductForm categories={categories} plans={plans}/>
  </div>;
}
