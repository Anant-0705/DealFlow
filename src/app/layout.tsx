import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "AccordFlow | Deal governance",
  description: "Explainable sales operations from quotation to cash.",
  icons: { icon: "/landing/dealflow-mark.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={cn("font-sans", geist.variable)}><body><TooltipProvider>{children}</TooltipProvider></body></html>;
}
