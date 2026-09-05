import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AccordFlow | Deal governance",
  description: "Explainable sales operations from quotation to cash.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
