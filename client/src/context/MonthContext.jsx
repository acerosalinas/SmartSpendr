import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

const MonthContext = createContext(null);
const STORAGE_KEY = "smartspendr_current_month";

function currentCalendarMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function MonthProvider({ children }) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonthState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || currentCalendarMonth()
  );
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refreshMonths() {
    const { data } = await client.get("/months");
    setMonths(data.months);
    return data.months;
  }

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    refreshMonths().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function setCurrentMonth(month) {
    setCurrentMonthState(month);
    localStorage.setItem(STORAGE_KEY, month);
  }

  async function addMonth(month) {
    await client.post("/months", { month });
    await refreshMonths();
    setCurrentMonth(month);
  }

  return (
    <MonthContext.Provider
      value={{ currentMonth, setCurrentMonth, months, loading, refreshMonths, addMonth }}
    >
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  return useContext(MonthContext);
}
