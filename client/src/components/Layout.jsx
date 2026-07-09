import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import MonthSwitcher from "./MonthSwitcher.jsx";
import { IconMenu } from "./icons.jsx";

export default function Layout({ title, showMonthSwitcher = false, children }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("smartspendr_sidebar_collapsed") === "1"
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("smartspendr_sidebar_collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="page-shell">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={`transition-all duration-300 ease-in-out ${collapsed ? "md:pl-20" : "md:pl-64"}`}>
        <header className="card sticky top-0 z-20 flex h-16 items-center justify-between gap-3 rounded-none border-x-0 border-t-0 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-subtle hover:bg-[var(--accent-soft)] md:hidden"
              aria-label="Open navigation"
            >
              <IconMenu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-semibold text-heading">{title}</h1>
          </div>
          {showMonthSwitcher && <MonthSwitcher />}
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
