"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DownloadCloud,
  Sparkles,
  ReceiptText,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/import", label: "Import (AA)", icon: DownloadCloud },
    { href: "/ai-entry", label: "Cash Entry", icon: Sparkles },
    { href: "/transactions", label: "Transactions", icon: ReceiptText },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200">
                ₹
              </div>
              <div>
                <span className="font-bold text-slate-900 text-lg tracking-tight">
                  FlexiIncome
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex space-x-1 sm:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === "/dashboard" && pathname === "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm border border-indigo-100"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
