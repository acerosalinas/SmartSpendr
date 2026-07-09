import { useCallback, useEffect, useState } from "react";
import client from "../api/client.js";

export function useCategories(type) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await client.get("/categories", { params: type ? { type } : {} });
    setCategories(data.categories);
    setLoading(false);
  }, [type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { categories, loading, refresh };
}
