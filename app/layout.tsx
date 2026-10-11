import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/components/lang";

export const metadata: Metadata = {
  title: "First Ledger",
  description: "A short, observed bookkeeping proof task. The candidate owns the result; a named person reviews it.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
