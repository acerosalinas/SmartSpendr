import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  IconCalendarClock,
  IconChevronLeft,
  IconFlag,
  IconGear,
  IconGrid,
  IconLogout,
  IconPieChart,
  IconReceipt,
  IconUser,
} from "./icons.jsx";

const NAV_GROUPS = [
  {
    label: null,
    items: [{ to: "/dashboard", label: "Dashboard", Icon: IconGrid }],
  },
  {
    label: "Goals",
    items: [{ to: "/goals", label: "My Goals", Icon: IconFlag }],
  },
  {
    label: "Expense Tracker",
    items: [
      { to: "/expense-log", label: "Expense Log", Icon: IconReceipt },
      { to: "/category-summary", label: "Category Summary", Icon: IconPieChart },
      { to: "/debt-bills", label: "Debt & Bills", Icon: IconCalendarClock },
    ],
  },
  {
    label: "Account",
    items: [
      { to: "/profile", label: "Profile", Icon: IconUser },
      { to: "/settings", label: "Settings", Icon: IconGear },
    ],
  },
];

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`card fixed inset-y-0 left-0 z-40 flex flex-col rounded-none border-y-0 border-l-0 transition-all duration-300 ease-in-out
          ${collapsed ? "md:w-20" : "md:w-64"}
          ${mobileOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0"}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 px-4">
          <img src="/logo-icon.png" alt="SmartSpendr" className="h-9 w-9 shrink-0" />
          {!collapsed && (
            <span className="truncate text-lg font-bold text-heading">SmartSpendr</span>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label ?? "primary"}>
              {!collapsed && group.label && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-subtle">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onCloseMobile}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? "" : "text-subtle hover:bg-[var(--accent-soft)] hover:text-heading"
                      }`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? { backgroundColor: "var(--accent-soft)", color: "var(--accent)" }
                        : undefined
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t px-3 py-3 divider">
          {!collapsed && user && (
            <p className="truncate px-3 pb-1 text-xs text-subtle">{user.full_name}</p>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-subtle transition-colors hover:bg-[var(--accent-soft)] hover:text-heading"
          >
            <IconLogout className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>

          <button
            onClick={onToggleCollapse}
            className="hidden w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-subtle transition-colors hover:bg-[var(--accent-soft)] hover:text-heading md:flex"
          >
            <IconChevronLeft className={`h-5 w-5 shrink-0 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
