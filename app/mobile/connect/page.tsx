"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { useEffect, useRef, useState } from "react";
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
  const lastRunAt = useRef(0);

  useEffect(() => {
    if (!address || !publicClient) return;
    void publicClient.readContract({ address: contract, abi, functionName: "isEnergyActive", args: [address] })
      .then((value) => { setActive(Boolean(value)); setStatus(value ? "ENERGY ACTIVE" : "ACTIVATE ENERGY"); })
      .catch(() => setStatus("ENERGY CHECK FAILED"));
  }, [address, publicClient]);

  const run = async () => {
    const now = Date.now();
    if (now - lastRunAt.current < 600) return;
    lastRunAt.current = now;
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
    <main style={{position:"fixed",inset:0,display:"grid",placeItems:"center",padding:24,background:"radial-gradient(circle at 50% 20%,#073b9b 0,#020817 42%,#000 100%)",color:"#fff",fontFamily:"Arial,sans-serif"}}>
      <section style={{width:"min(100%,390px)",padding:"32px 22px",border:"1px solid #168cff",borderRadius:30,textAlign:"center",background:"rgba(2,13,38,.94)",boxShadow:"0 0 60px rgba(0,82,255,.45)"}}>
        <div style={{width:70,height:70,margin:"0 auto 18px",display:"grid",placeItems:"center",borderRadius:22,background:"linear-gradient(#36b8ff,#0052ff)",fontSize:30,boxShadow:"0 0 30px #087dff"}}>⚡</div>
        <p style={{margin:0,color:"#69dfff",fontSize:10,fontWeight:900,letterSpacing:".25em"}}>BASE BOING BATTLE</p>
        <h1 style={{margin:"10px 0",fontSize:30,letterSpacing:".12em"}}>BASE ENERGY</h1>
        <span style={{display:"block",minHeight:38,color:"#b9d7ff",fontSize:12,fontWeight:900,letterSpacing:".08em"}}>{status}</span>
        <button
          type="button"
          disabled={busy}
          onTouchEnd={(event) => { event.preventDefault(); void run(); }}
          onClick={() => void run()}
          style={{width:"100%",minHeight:64,marginTop:18,border:"1px solid #65d7ff",borderRadius:22,background:"linear-gradient(#168cff,#0052ff)",color:"#fff",fontSize:14,fontWeight:900,letterSpacing:".1em",touchAction:"manipulation"}}
        >
          {busy ? "PLEASE WAIT" : isConnected ? active ? "RETURN TO GAME" : "ACTIVATE ENERGY" : "CONNECT BASE WALLET"}
        </button>
        <a href="/mobile" style={{display:"block",marginTop:22,color:"#72cfff",fontSize:11,fontWeight:900,letterSpacing:".12em",textDecoration:"none"}}>BACK TO GAME</a>
      </section>
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
