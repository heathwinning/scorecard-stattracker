"use client";

import { useAuth } from "./AuthProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HiOutlineTemplate, HiOutlineClipboardList, HiOutlineViewGrid, HiOutlineMenu, HiOutlineX } from "react-icons/hi";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: HiOutlineViewGrid },
  { href: "/scorecards", label: "Scorecards", icon: HiOutlineTemplate },
  { href: "/scores", label: "My Scores", icon: HiOutlineClipboardList },
];

export default function Navbar() {
  const { user, loading, isGuest, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const hasAccess = !!(user || isGuest);
  const visibleNavLinks = isGuest
    ? navLinks.filter((link) => link.href !== "/dashboard")
    : navLinks;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-3 h-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger - always visible when there are nav links */}
          {hasAccess && (
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="sm:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Menu"
            >
              {mobileNavOpen ? <HiOutlineX className="w-5 h-5 text-slate-600" /> : <HiOutlineMenu className="w-5 h-5 text-slate-600" />}
            </button>
          )}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-indigo-200 group-hover:shadow-md group-hover:scale-105 transition-all">
              S
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight hidden sm:inline">Scorecard StatTracker</span>
          </Link>
          {/* Desktop nav links */}
          {hasAccess && (
            <div className="hidden sm:flex items-center gap-1">
              {visibleNavLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}>
                    <Icon className="w-4 h-4" />{link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
          ) : isGuest ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">Guest</span>
              <Link href="/login" className="btn-primary text-sm">Sign in</Link>
            </div>
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full ring-2 ring-indigo-100" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-sm font-bold ring-2 ring-indigo-100">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="text-sm font-medium text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </div>
                    <button onClick={() => { logout(); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="btn-primary text-sm">Sign in</Link>
          )}
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && hasAccess && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-full w-64 bg-white border-b border-r border-slate-200 shadow-xl z-50 animate-fade-in rounded-br-2xl">
            <div className="p-3 space-y-1">
              {visibleNavLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                    }`}>
                    <Icon className="w-5 h-5" />{link.label}
                  </Link>
                );
              })}
            </div>
            {isGuest && (
              <div className="px-4 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-400">Signed in as <span className="font-medium text-slate-600">Guest</span></span>
              </div>
            )}
          </div>
        </>
      )}
    </nav>
  );
}
