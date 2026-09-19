"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DownloadCloud,
  Sparkles,
  ReceiptText,
  LogIn,
  UserPlus,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "./AuthProvider";

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();

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
            <Link
              href={user ? "/dashboard" : "/login"}
              className="flex items-center space-x-2.5"
            >
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

          {/* Logged in Navigation Links */}
          {user && !loading && (
            <nav className="hidden md:flex space-x-1 sm:space-x-2">
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
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-indigo-600" : "text-slate-500"
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Action Area */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {loading ? (
              <div className="w-20 h-8 bg-slate-100 animate-pulse rounded-lg" />
            ) : user ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                  <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="max-w-[110px] sm:max-w-[180px] truncate">
                    {user.email || "User"}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 hover:border-rose-300 transition"
                  title="Sign out of FlexiIncome"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    pathname === "/login"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500" />
                  <span>Log In</span>
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation for Logged in Users */}
        {user && !loading && (
          <div className="md:hidden border-t border-slate-200 py-2 flex justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === "/dashboard" && pathname === "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-1 px-2 text-xs font-medium ${
                    isActive ? "text-indigo-600 font-semibold" : "text-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
