import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function PrintButton({ invoiceCode }: { invoiceCode: string }) { return <Link className={`${buttonVariants({ variant: "outline" })} no-print`} href={`/app/print/invoice/${invoiceCode}`} target="_blank">Print / Save PDF</Link>; }
