'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type FontSizeContextValue = {
  fontSize: number; // percentage: 90 | 100 | 110 | 120 | 130
  increase: () => void;
  decrease: () => void;
};

const FontSizeContext = createContext<FontSizeContextValue>({
  fontSize: 100,
  increase: () => {},
  decrease: () => {},
});

const MIN = 80;
const MAX = 130;
const STEP = 10;
const STORAGE_KEY = 'font-size';

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState(100);

  useEffect(() => {
    // Read the persisted preference only after mount so the server-rendered
    // markup (always 100%) matches the client's first render, avoiding a
    // hydration mismatch.
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN && parsed <= MAX) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFontSize(parsed);
        document.documentElement.style.fontSize = `${parsed}%`;
      }
    }
  }, []);

  function applySize(size: number) {
    const clamped = Math.min(MAX, Math.max(MIN, size));
    setFontSize(clamped);
    document.documentElement.style.fontSize = `${clamped}%`;
    localStorage.setItem(STORAGE_KEY, String(clamped));
  }

  return (
    <FontSizeContext.Provider
      value={{
        fontSize,
        increase: () => applySize(fontSize + STEP),
        decrease: () => applySize(fontSize - STEP),
      }}
    >
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return useContext(FontSizeContext);
}
