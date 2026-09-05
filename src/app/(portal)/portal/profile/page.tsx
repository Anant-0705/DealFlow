import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getPortalProfile } from "@/modules/negotiation/queries";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default async function PortalProfilePage() { const session = await requireSession(); const customer = await getPortalProfile(session.customerId!); if (!customer) notFound(); return <div className="portal-page narrow-page"><div className="eyebrow">Customer profile</div><h1>{customer.name}</h1><section className="panel profile-card"><div><span>Account code</span><b>{customer.code}</b></div><div><span>Tier</span><StatusBadge status={customer.tier}/></div><div><span>Contact email</span><b>{customer.email}</b></div>{customer.notes && <div><span>Account note</span><p>{customer.notes}</p></div>}</section></div>; }
