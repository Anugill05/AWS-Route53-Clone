"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { FlashbarProps } from "@cloudscape-design/components/flashbar";

type FlashType = "success" | "error" | "warning" | "info";

interface FlashbarContextValue {
  items: FlashbarProps.MessageDefinition[];
  notify: (type: FlashType, content: string) => void;
}

const FlashbarContext = createContext<FlashbarContextValue | null>(null);

export function FlashbarProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FlashbarProps.MessageDefinition[]>([]);
  const nextId = useRef(0);

  const notify = useCallback((type: FlashType, content: string) => {
    const id = `flash-${nextId.current++}`;
    setItems((current) => [
      ...current,
      {
        id,
        type,
        content,
        dismissible: true,
        onDismiss: () => setItems((cur) => cur.filter((item) => item.id !== id)),
      },
    ]);
  }, []);

  return <FlashbarContext.Provider value={{ items, notify }}>{children}</FlashbarContext.Provider>;
}

function useFlashbarContext(): FlashbarContextValue {
  const ctx = useContext(FlashbarContext);
  if (!ctx) {
    throw new Error("useFlashbar must be used within FlashbarProvider");
  }
  return ctx;
}

export function useFlashbarItems(): FlashbarProps.MessageDefinition[] {
  return useFlashbarContext().items;
}

export function useNotify() {
  return useFlashbarContext().notify;
}
