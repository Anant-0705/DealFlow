import { notFound } from "next/navigation";
import { QuoteBuilder } from "@/components/quotes/QuoteBuilder";
import { getBuilderData, getQuoteDetail } from "@/modules/quotes/queries";
import { requireInternal } from "@/lib/auth";
export default async function QuotePage({ params }: { params: Promise<{ code: string }> }) { const { code } = await params; const [quote, data, session] = await Promise.all([getQuoteDetail(code), getBuilderData(), requireInternal()]); if (!quote?.currentRevision) notFound(); const safeQuote = { ...quote, currentRevision: quote.currentRevision }; const canEdit = session.role === "ADMIN" || (session.role === "REP" && quote.ownerId === session.userId); return <QuoteBuilder quote={safeQuote} products={data.products} policy={data.policy} priceLists={data.priceLists} pairings={data.pairings} canEdit={canEdit}/>; }
