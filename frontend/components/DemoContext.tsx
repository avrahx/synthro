"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DemoContextType {
  isDemoMode: boolean;
  demoAddress: string;
  toggleDemoMode: () => void;
  setDemoMode: (enabled: boolean) => void;
  setDemoAddress: (address: string) => void;
}

// Sample active whale / basis arbitrage address on Hyperliquid
export const DEFAULT_DEMO_ADDRESS = "0xdf84d43e26ae93ef69b47e5b53941459a9ba4261";

const DemoContext = createContext<DemoContextType>({
  isDemoMode: false,
  demoAddress: DEFAULT_DEMO_ADDRESS,
  toggleDemoMode: () => {},
  setDemoMode: () => {},
  setDemoAddress: () => {},
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [demoAddress, setDemoAddress] = useState<string>(DEFAULT_DEMO_ADDRESS);

  useEffect(() => {
    // Optionally restore from sessionStorage if available
    try {
      const saved = sessionStorage.getItem("synthro_demo_mode");
      if (saved === "true") {
        setIsDemoMode(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem("synthro_demo_mode", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    try {
      sessionStorage.setItem("synthro_demo_mode", String(enabled));
    } catch {
      // ignore
    }
  };

  return (
    <DemoContext.Provider
      value={{
        isDemoMode,
        demoAddress,
        toggleDemoMode,
        setDemoMode,
        setDemoAddress,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode() {
  return useContext(DemoContext);
}
