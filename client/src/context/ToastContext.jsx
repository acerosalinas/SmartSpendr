import { createContext, useCallback, useContext, useRef, useState } from "react";
import { IconAlertCircle, IconCheck, IconInfo, IconX } from "../components/icons.jsx";

const ToastContext = createContext(null);

let idCounter = 0;

const ICONS = { success: IconCheck, error: IconAlertCircle, info: IconInfo };
const COLORS = { success: "#22c55e", error: "#ef4444", info: "var(--accent)" };
const DEFAULT_DURATION = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const notify = useCallback(
    (type, message, duration = DEFAULT_DURATION) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, type, message }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (message, duration) => notify("success", message, duration),
    error: (message, duration) => notify("error", message, duration),
    info: (message, duration) => notify("info", message, duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:right-6 sm:top-6">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              role="alert"
              className="card animate-toast-in pointer-events-auto flex items-start gap-3 p-4 shadow-lg"
              style={{ borderLeftColor: COLORS[t.type], borderLeftWidth: 3 }}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: COLORS[t.type] }} />
              <p className="flex-1 text-sm text-heading">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-subtle transition-colors hover:text-heading"
                aria-label="Dismiss notification"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
