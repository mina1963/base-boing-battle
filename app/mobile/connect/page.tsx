"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { useEffect, useState } from "react";
import { RainbowKitProvider, darkTheme, useConnectModal } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  cookieStorage,
  createConfig,
  createStorage,
  http,
  useAccount,
  usePublicClient,
  useWalletClient,
} from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount, injected } from "wagmi/connectors";

const contract = "0x55894e2e9b29dad1b526c7f7c5d2d5e8e1b9d7db" as const;
const suffix = "0x62635f6873616772376c620b0080218021802180218021802180218021" as const;
const abi = [
  { type: "function", name: "activateEnergy", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "isEnergyActive", stateMutability: "view", inputs: [{ name: "player", type: "address" }], outputs: [{ type: "bool" }] },
] as const;

const config = createConfig({
  chains: [base],
  connectors: [injected(), baseAccount({ appName: "Base Boing Battle" })],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: { [base.id]: http() },
});

function WalletAction() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState("CONNECT BASE WALLET");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!address || !publicClient) return;
    void publicClient.readContract({ address: contract, abi, functionName: "isEnergyActive", args: [address] })
      .then((value) => { setActive(Boolean(value)); setStatus(value ? "ENERGY ACTIVE" : "ACTIVATE ENERGY"); })
      .catch(() => setStatus("ENERGY CHECK FAILED"));
  }, [address, publicClient]);

  const run = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    if (active) {
      window.location.replace("/mobile");
      return;
    }
    if (!address || !walletClient || !publicClient) return;
    try {
      setBusy(true);
      setStatus("CONFIRM IN BASE WALLET");
      const hash = await walletClient.writeContract({ address: contract, abi, functionName: "activateEnergy", account: address, dataSuffix: suffix });
      setStatus("ACTIVATING ENERGY");
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("REVERTED");
      setStatus("ENERGY ACTIVE");
      window.location.replace("/mobile");
    } catch (error) {
      const message = error instanceof Error ? error.message : "WALLET ERROR";
      setStatus(message.toUpperCase().slice(0, 64));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="walletPage">
      <section className="walletCard">
        <div className="orb">⚡</div>
        <p>BASE BOING BATTLE</p>
        <h1>BASE ENERGY</h1>
        <span>{status}</span>
        <button type="button" disabled={busy} onClick={() => void run()}>
          {busy ? "PLEASE WAIT" : isConnected ? active ? "RETURN TO GAME" : "ACTIVATE ENERGY" : "CONNECT BASE WALLET"}
        </button>
        <a href="/mobile">BACK TO GAME</a>
      </section>
      <style jsx>{`
        .walletPage{position:fixed;inset:0;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 20%,#073b9b 0,#020817 42%,#000 100%);color:#fff;font-family:Arial,sans-serif}
        .walletCard{width:min(100%,390px);padding:32px 22px;border:1px solid #168cff;border-radius:30px;text-align:center;background:rgba(2,13,38,.94);box-shadow:0 0 60px rgba(0,82,255,.45)}
        .orb{width:70px;height:70px;margin:0 auto 18px;display:grid;place-items:center;border-radius:22px;background:linear-gradient(#36b8ff,#0052ff);font-size:30px;box-shadow:0 0 30px #087dff}
        p{margin:0;color:#69dfff;font-size:10px;font-weight:900;letter-spacing:.25em}h1{margin:10px 0;font-size:30px;letter-spacing:.12em}span{display:block;min-height:38px;color:#b9d7ff;font-size:12px;font-weight:900;letter-spacing:.08em}
        button{width:100%;min-height:64px;margin-top:18px;border:1px solid #65d7ff;border-radius:22px;background:linear-gradient(#168cff,#0052ff);color:#fff;font-size:14px;font-weight:1000;letter-spacing:.1em;touch-action:manipulation}
        a{display:block;margin-top:22px;color:#72cfff;font-size:11px;font-weight:900;letter-spacing:.12em;text-decoration:none}
      `}</style>
    </main>
  );
}

export default function MobileConnectPage() {
  const [client] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#0052FF", borderRadius: "large" })} modalSize="wide">
          <WalletAction />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
