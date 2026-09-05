"use client";

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "../lib/wagmi";
import { DemoProvider } from "./DemoContext";

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DemoProvider>
          {children}
        </DemoProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
