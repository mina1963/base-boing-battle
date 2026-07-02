"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

const ENERGY_CONTRACT_ADDRESS =
  "0x55894E2e9B29dad1b526C7F7c5d2d5E8e1B9D7dB" as const;

const BUILDER_CODE_DATA_SUFFIX =
  "0x62635f6873616772376c620b0080218021802180218021802180218021";

const ENERGY_ABI = [
  {
    inputs: [],
    name: "activateEnergy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "player", type: "address" }],
    name: "isEnergyActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function MobileEnergyButton() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkEnergy = async () => {
    if (!address || !publicClient) {
      setActive(false);
      return;
    }

    try {
      const result = await publicClient.readContract({
        address: ENERGY_CONTRACT_ADDRESS,
        abi: ENERGY_ABI,
        functionName: "isEnergyActive",
        args: [address],
      });

      setActive(Boolean(result));
    } catch {
      setActive(false);
    }
  };

  const activateEnergy = async () => {
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }

    if (!walletClient || !publicClient) return;

    try {
      setLoading(true);

      const hash = await walletClient.writeContract({
        address: ENERGY_CONTRACT_ADDRESS,
        abi: ENERGY_ABI,
        functionName: "activateEnergy",
        account: address,
        dataSuffix: BUILDER_CODE_DATA_SUFFIX,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setActive(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkEnergy();
  }, [address, publicClient]);

  return (
    <button
      onClick={activateEnergy}
      disabled={loading}
      style={{
        position: "fixed",
        right: 14,
        top: "calc(env(safe-area-inset-top) + 14px)",
        zIndex: 999999,
        border: active ? "1px solid rgba(52,211,153,.7)" : "1px solid rgba(0,82,255,.8)",
        background: active ? "rgba(16,185,129,.18)" : "rgba(0,82,255,.92)",
        color: "white",
        borderRadius: 999,
        padding: "10px 13px",
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: ".12em",
      }}
    >
      {loading ? "..." : active ? "ENERGY ✅" : isConnected ? "ENERGY" : "CONNECT"}
    </button>
  );
}