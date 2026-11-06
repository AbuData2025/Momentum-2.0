import { NavLink, Outlet, useLocation } from "react-router";
import { BarChart3, CalendarDays, Flag, LayoutGrid, ListFilter, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import SyncBanner from "./SyncBanner";

export const NAV = [
  { to: "/", label: "Overview", short: "Overview", icon: LayoutGrid },
  { to: "/history", label: "Workout history", short: "History", icon: ListFilter },
  { to: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { to: "/analytics", label: "Analytics", short: "Analytics", icon: BarChart3 },
  { to: "/plan", label: "Training plan", short: "Plan", icon: Flag },
] as const;

export default function Layout() {
  const { user, logOut } = useAuth();
  const { pathname } = useLocation();
  const current = NAV.find((n) => (n.to === "/" ? pathname === "/" : pathname.startsWith(n.to)))?.label ?? "Overview";
  const date = (o: Intl.DateTimeFormatOptions) => new Date().toLocaleDateString("en-ZA", o);

  return (
    <div className="flex h-full">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-xs">Skip to content</a>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-sidebar p-4 md:flex">
        <p className="mb-6 px-2 text-base font-semibold"><span className="text-accent">N</span> Momentum</p>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-xs ${isActive ? "bg-accent-soft font-semibold text-ink" : "text-muted hover:text-ink"}`}>
              <Icon size={14} /> {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logOut} className="flex items-center gap-3 rounded-md px-3 py-2 text-xs text-muted hover:text-ink"><LogOut size={14} /> Sign out</button>
        <p className="px-3 pt-2 text-[11px] text-muted">{user?.displayName ?? "Runner"}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-[11px] text-muted md:px-8 md:py-4" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <span><span className="hidden md:inline">Workspace / </span><span className="text-ink md:font-normal">{current}</span></span>
          <span className="flex items-center gap-3">
            <span className="hidden sm:inline">{date({ weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="sm:hidden">{date({ weekday: "short", day: "numeric", month: "short" })}</span>
            <button onClick={logOut} aria-label="Sign out" className="rounded-md border border-line p-1.5 md:hidden"><LogOut size={13} /></button>
          </span>
        </header>
        <SyncBanner />
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto p-4 pb-24 outline-none md:p-8 md:pb-8"><Outlet /></main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-sidebar md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map(({ to, short, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${isActive ? "text-accent" : "text-muted"}`}>
            <Icon size={17} /> {short}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
