import { useState } from "react";
import Layout from "../components/Layout.jsx";
import CategoriesManager from "../components/CategoriesManager.jsx";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Settings() {
  const { user, setUser } = useAuth();
  const { themeId, themes, setThemeId } = useTheme();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSelect(id) {
    if (id === themeId || saving) return;
    const previous = themeId;
    setThemeId(id);
    setSaving(true);
    setError("");
    try {
      const { data } = await client.put("/auth/theme", { theme: id });
      setUser(data.user);
    } catch (err) {
      setThemeId(previous);
      setError(err.response?.data?.error || "Could not save theme");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Settings">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="card p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-subtle">Theme</h2>
          <p className="mb-5 text-sm text-subtle">
            Pick a color combination for your account. It applies everywhere and is saved to your
            profile, {user?.full_name}.
          </p>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                disabled={saving}
                className="group relative flex flex-col overflow-hidden rounded-xl border text-left transition-transform disabled:cursor-wait"
                style={{
                  borderColor: t.id === themeId ? t.accent : "var(--border)",
                  borderWidth: t.id === themeId ? 2 : 1,
                }}
              >
                <div className="flex h-16 w-full">
                  <div className="w-1/2" style={{ backgroundColor: t.accent }} />
                  <div
                    className="w-1/2 border-l"
                    style={{ backgroundColor: t.bg, borderColor: t.border }}
                  />
                </div>
                <div
                  className="flex items-center justify-between px-3 py-2 text-xs font-medium"
                  style={{ backgroundColor: t.surface, color: t.text }}
                >
                  <span>{t.label}</span>
                  {t.id === themeId && (
                    <span className="text-xs font-semibold" style={{ color: t.accent }}>
                      Active
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <CategoriesManager />
      </div>
    </Layout>
  );
}
