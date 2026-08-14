"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { BreadcrumbGroupProps } from "@cloudscape-design/components/breadcrumb-group";

type BreadcrumbItem = BreadcrumbGroupProps.Item;

const BreadcrumbsContext = createContext<{
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
} | null>(null);

export function BreadcrumbsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BreadcrumbItem[]>([]);
  return <BreadcrumbsContext.Provider value={{ items, setItems }}>{children}</BreadcrumbsContext.Provider>;
}

export function useBreadcrumbItems(): BreadcrumbItem[] {
  const ctx = useContext(BreadcrumbsContext);
  if (!ctx) throw new Error("useBreadcrumbItems must be used within BreadcrumbsProvider");
  return ctx.items;
}

/** Pages call this with their breadcrumb trail; it registers into the shared AppLayout slot. */
export function useSetBreadcrumbs(items: BreadcrumbItem[]) {
  const ctx = useContext(BreadcrumbsContext);
  if (!ctx) throw new Error("useSetBreadcrumbs must be used within BreadcrumbsProvider");
  const { setItems } = ctx;
  const key = JSON.stringify(items);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    setItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
