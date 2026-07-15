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

import {
  WagmiProvider,
  cookieStorage,
  createConfig,
  createStorage,
  http,
} from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount, injected } from "wagmi/connectors";
import { useState } from "react";

const config = createConfig({
  chains: [base],
  multiInjectedProviderDiscovery: false,
  connectors: [
    // Base App on older iOS exposes its wallet as an injected EIP-1193
    // provider. Keep this first, matching the working Based Oracle client.
    injected(),
    baseAccount({
      appName: "Base Boing Battle",
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  storage: createStorage({ storage: cookieStorage }),
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
          modalSize="wide"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
