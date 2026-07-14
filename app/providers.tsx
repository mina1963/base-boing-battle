"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount } from "wagmi/connectors";
import { useState } from "react";

const config = createConfig({
  chains: [base],
  multiInjectedProviderDiscovery: false,
  connectors: [
    baseAccount({
      appName: "Base Boing Battle",
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () => new QueryClient()
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#0052FF",
            borderRadius: "large",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
