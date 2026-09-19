import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "FlexiIncome | FinTech for Irregular-Earning Workers",
  description:
    "Income & Expense Management designed for gig, freelance, and irregular-earning professionals with AI Cash Entry and Open Banking Import.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          CS04 MVP — Income & Expense Management for Irregular Earners. No duplicate detection active. Prototype estimate, not professional financial advice.
        </footer>
      </body>
    </html>
  );
}
