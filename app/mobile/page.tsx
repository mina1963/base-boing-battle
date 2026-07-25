"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  usePublicClient,
  useWalletClient,
} from "wagmi";

const ENERGY_CONTRACT_ADDRESS =
  "0x55894e2e9b29dad1b526c7f7c5d2d5e8e1b9d7db" as const;

const ENERGY_ABI = [
  {
    type: "function",
    name: "activateEnergy",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "getEnergyTimeLeft",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const BUILDER_CODE_SUFFIX =
  "0x62635f6873616772376c620b0080218021802180218021802180218021" as const;

function formatEnergyTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}H ${minutes}M LEFT` : `${Math.max(1, minutes)}M LEFT`;
}

function walletErrorLabel(error: unknown) {
  const value = error as { shortMessage?: string; message?: string; code?: number };
  const message = `${value?.shortMessage || value?.message || "UNKNOWN WALLET ERROR"}`.toUpperCase();
  if (value?.code === 4001 || /REJECT|DENIED|CANCEL/.test(message)) return "TRANSACTION CANCELLED";
  if (/INSUFFICIENT|FUNDS|BALANCE/.test(message)) return "NOT ENOUGH ETH FOR GAS";
  if (/USER OPERATION|BUNDLER/.test(message)) return "BASE SMART WALLET ERROR";
  if (/POPUP|BLOCK/.test(message)) return "ALLOW BASE POPUP";
  return message.slice(0, 64);
}

function MobileEnergyCard() {
  const { address, isConnected, connector } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  // Start visible so the Base Wallet gate is present in the server-rendered
  // mobile HTML as well. Some iOS webviews hydrate after the legacy menu script.
  const [menuVisible, setMenuVisible] = useState(true);
  const [energyLeft, setEnergyLeft] = useState(0);
  const [status, setStatus] = useState("BASE WALLET REQUIRED");
  const [isActivating, setIsActivating] = useState(false);
  const lastActionAt = useRef(0);

  const baseWalletConnector = useMemo(
    () =>
      connectors.find((item) =>
        /coinbase|base account|base wallet/i.test(`${item.id} ${item.name}`),
      ),
    [connectors],
  );

  const isBaseWallet = Boolean(
    isConnected &&
      connector &&
      /coinbase|base account|base wallet/i.test(
        `${connector.id} ${connector.name}`,
      ),
  );

  useEffect(() => {
    const updateVisibility = () => {
      const usernameOpen =
        document.getElementById("usernameModal")?.classList.contains("active") ??
        false;
      setMenuVisible(
        (document.getElementById("menuScreen")?.classList.contains("active") ??
          false) && !usernameOpen,
      );
    };
    const observer = new MutationObserver(updateVisibility);
    const handleUsernameVisibility = (event: Event) => {
      const open = Boolean((event as CustomEvent<{ open?: boolean }>).detail?.open);
      setMenuVisible(!open && Boolean(document.getElementById("menuScreen")?.classList.contains("active")));
    };
    window.addEventListener("bbb:username-modal", handleUsernameVisibility);
    const timer = window.setTimeout(() => {
      updateVisibility();
      const app = document.getElementById("app");
      if (app) observer.observe(app, { attributes: true, subtree: true });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("bbb:username-modal", handleUsernameVisibility);
    };
  }, []);

  const refreshEnergy = useCallback(async () => {
    if (!address || !publicClient || !isBaseWallet) {
      setEnergyLeft(0);
      setStatus(isConnected ? "SWITCH TO BASE WALLET" : "BASE WALLET REQUIRED");
      return;
    }
    try {
      const left = await publicClient.readContract({
        address: ENERGY_CONTRACT_ADDRESS,
        abi: ENERGY_ABI,
        functionName: "getEnergyTimeLeft",
        args: [address],
      });
      const remaining = Number(left);
      setEnergyLeft(remaining);
      setStatus(remaining > 0 ? formatEnergyTime(remaining) : "READY TO ACTIVATE");
    } catch {
      setStatus("ENERGY CHECK UNAVAILABLE");
    }
  }, [address, isBaseWallet, isConnected, publicClient]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void refreshEnergy(), 0);
    const timer = window.setInterval(() => {
      setEnergyLeft((current) => Math.max(0, current - 30));
    }, 30_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [refreshEnergy]);

  useEffect(() => {
    const energyWindow = window as Window & { __bbbEnergyActive?: boolean };
    let recentlyVerified = false;
    try {
      recentlyVerified = Number(localStorage.getItem("bbb_energy_verified_until") || 0) > Date.now();
    } catch {}
    energyWindow.__bbbEnergyActive = energyLeft > 0 || recentlyVerified;
    document.documentElement.dataset.baseEnergy = energyLeft > 0 || recentlyVerified ? "active" : "locked";
  }, [energyLeft]);

  useEffect(() => {
    const showEnergyRequired = () => {
      setStatus(
        isBaseWallet ? "ACTIVATE ENERGY TO UNLOCK PLAY" : "CONNECT BASE WALLET TO PLAY",
      );
      document.querySelector(".mobileEnergyCard")?.classList.add("required");
      window.setTimeout(
        () => document.querySelector(".mobileEnergyCard")?.classList.remove("required"),
        700,
      );
    };
    window.addEventListener("bbb:energy-required", showEnergyRequired);
    return () => window.removeEventListener("bbb:energy-required", showEnergyRequired);
  }, [isBaseWallet]);

  const handleAction = async () => {
    const now = Date.now();
    if (now - lastActionAt.current < 650) return;
    lastActionAt.current = now;
    if (!isBaseWallet) {
      if (isConnected) {
        disconnect();
        setStatus("BASE WALLET DISCONNECTED — TAP AGAIN");
        return;
      }
      if (baseWalletConnector) {
        // Keep the connector call directly inside the browser click task.
        // Base Account opens a popup and iOS blocks it if it is deferred.
        connect(
          { connector: baseWalletConnector },
          { onError: (error) => setStatus(walletErrorLabel(error)) },
        );
      } else setStatus("OPEN IN BASE APP");
      return;
    }
    if (energyLeft > 0 || !walletClient || !publicClient || !address) return;
    try {
      setIsActivating(true);
      setStatus("CONFIRM IN BASE WALLET");
      const hash = await walletClient.writeContract({
        address: ENERGY_CONTRACT_ADDRESS,
        abi: ENERGY_ABI,
        functionName: "activateEnergy",
        account: address,
        dataSuffix: BUILDER_CODE_SUFFIX,
      });
      setStatus("ACTIVATING ON BASE");
      await publicClient.waitForTransactionReceipt({ hash });
      await refreshEnergy();
    } catch (error) {
      console.error("Base Energy activation failed", error);
      setStatus(walletErrorLabel(error));
    } finally {
      setIsActivating(false);
    }
  };

  if (!menuVisible) return null;

  const active = energyLeft > 0;
  const buttonLabel = active
    ? "ENERGY ACTIVE"
    : isBaseWallet
      ? isActivating
        ? "ACTIVATING..."
        : "ACTIVATE ENERGY"
      : isConnecting
        ? "CONNECTING..."
        : "CONNECT BASE WALLET";

  return (
    <aside className={`mobileEnergyCard${active ? " active" : ""}`}>
      <div className="mobileEnergyOrb" aria-hidden="true">⚡</div>
      <div className="mobileEnergyCopy">
        <span>BASE ENERGY</span>
        <strong>{status}</strong>
      </div>
      <a href="/mobile-connect" aria-disabled={active}>
        {buttonLabel}
      </a>
    </aside>
  );
}

export default function MobilePage() {
  return (
    <main>
      <div
        dangerouslySetInnerHTML={{
          __html: `
<style>
  html, body {
    margin:0; padding:0; background:#020204; color:white; overflow:hidden;
    font-family:Arial, Helvetica, sans-serif; -webkit-user-select:none; user-select:none;
  }
  * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
  #app {
    position:fixed; inset:0; width:100vw; height:100dvh; overflow:hidden;
    background:
      radial-gradient(circle at 50% 22%, rgba(0,82,255,.28), transparent 34%),
      radial-gradient(circle at 20% 82%, rgba(34,211,238,.13), transparent 28%),
      #020204;
  }
  #noise {
    position:absolute; inset:0; pointer-events:none; opacity:.32;
    background-image:linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
    background-size:38px 38px;
  }
  .screen { position:absolute; inset:0; display:none; padding:22px; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .screen.active { display:block; }
  .center { min-height:100%; display:flex; flex-direction:column; justify-content:center; gap:14px; max-width:460px; margin:0 auto; }
  h1 { margin:0; font-size:34px; line-height:.92; letter-spacing:.08em; font-weight:1000; text-align:center; text-shadow:0 0 26px rgba(0,82,255,.85); }
  .sub { text-align:center; color:rgba(255,255,255,.62); font-size:11px; font-weight:900; letter-spacing:.22em; margin-bottom:8px; }
  .card { border:1px solid rgba(255,255,255,.14); background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.035)); border-radius:28px; padding:14px; box-shadow:0 0 34px rgba(0,82,255,.14); backdrop-filter: blur(8px); }
  .btn { width:100%; min-height:62px; border:0; border-radius:26px; color:white; background:#0052ff; font-size:15px; font-weight:1000; letter-spacing:.18em; box-shadow:0 0 34px rgba(0,82,255,.44); touch-action:manipulation; }
  .btn:active, .arena:active, .difficulty:active, .pill:active { transform:scale(.975); }
  .btn.secondary { background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.16); box-shadow:none; }
  .btn.red { background:#ef4444; box-shadow:0 0 32px rgba(239,68,68,.35); }
  .row { display:flex; gap:10px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .arena, .difficulty {
    min-height:88px; border:1px solid rgba(255,255,255,.13); border-radius:23px;
    background:linear-gradient(160deg, rgba(0,82,255,.22), rgba(255,255,255,.04));
    color:white; font-weight:1000; letter-spacing:.11em; font-size:12px; touch-action:manipulation;
  }
  .difficulty, .region { min-height:58px; }
  .region { border:1px solid rgba(255,255,255,.13); border-radius:23px; background:rgba(255,255,255,.08); color:white; font-weight:1000; letter-spacing:.11em; font-size:12px; touch-action:manipulation; }
  .region.selected { border-color:#22d3ee; box-shadow:0 0 24px rgba(34,211,238,.38); background:rgba(34,211,238,.16); }
  .arena small { display:block; margin-top:7px; opacity:.62; font-size:9px; letter-spacing:.18em; }
  .arena.selected, .difficulty.selected { border-color:#0052ff; box-shadow:0 0 24px rgba(0,82,255,.45); background:linear-gradient(160deg, rgba(0,82,255,.36), rgba(255,255,255,.06)); }
  .arena[data-arena="base"].selected { border-color:#ef4444; box-shadow:0 0 24px rgba(239,68,68,.42); }
  .arena[data-arena="space"].selected { border-color:#22d3ee; box-shadow:0 0 24px rgba(34,211,238,.42); }
  .arena[data-arena="temple"].selected { border-color:#fbbf24; box-shadow:0 0 24px rgba(251,191,36,.38); }
  .arena[data-arena="soccer"].selected { border-color:#5cff85; box-shadow:0 0 24px rgba(92,255,133,.42); }
  #gameScreen { padding:0; overflow:hidden; touch-action:none; }
  #gameWrap { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#000; touch-action:none; overflow:hidden; }
  #gameCanvas { width:min(100vw, calc(100dvh * 0.5714)); height:min(100dvh, calc(100vw * 1.75)); touch-action:none; display:block; }
  #hudTop { position:absolute; top:calc(env(safe-area-inset-top) + 10px); left:10px; right:10px; display:flex; justify-content:space-between; align-items:center; pointer-events:none; gap:8px; }
  #hudTop button { pointer-events:auto; }
  .pill { border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.52); color:white; border-radius:999px; padding:10px 12px; font-weight:1000; font-size:11px; letter-spacing:.12em; touch-action:manipulation; }
  #scoreHud { flex:1; text-align:center; }
  #overlayText { position:absolute; left:0; right:0; top:39%; text-align:center; font-size:42px; font-weight:1000; letter-spacing:.07em; text-shadow:0 0 28px rgba(0,82,255,.95); pointer-events:none; }
  #resultPanel {
    position:absolute; left:22px; right:22px; top:28%; display:none; padding:18px; border-radius:28px;
    border:1px solid rgba(255,255,255,.16); background:rgba(0,0,0,.76); box-shadow:0 0 44px rgba(0,82,255,.28);
  }
  #resultPanel.active { display:block; }
  #resultTitle { font-size:30px; text-align:center; font-weight:1000; letter-spacing:.08em; margin-bottom:12px; }
  #matchStatus { min-height:44px; display:flex; align-items:center; justify-content:center; text-align:center; color:rgba(255,255,255,.72); font-size:12px; font-weight:900; letter-spacing:.14em; line-height:1.5; }

  #splashScreen { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#000; z-index:30; transition:opacity .35s ease; }
  #splashScreen.hide { opacity:0; pointer-events:none; }
  #splashLogo { width:min(76vw,360px); aspect-ratio:1/1; border-radius:42px; display:flex; align-items:center; justify-content:center; font-size:42px; font-weight:1000; letter-spacing:.08em; background:radial-gradient(circle at 50% 40%, rgba(0,82,255,.55), rgba(0,0,0,.15) 54%, #020204 100%); border:1px solid rgba(255,255,255,.12); box-shadow:0 0 70px rgba(0,82,255,.45); text-align:center; }
  .titleBadge { margin:0 auto 10px; width:max-content; padding:9px 13px; border-radius:999px; background:rgba(0,82,255,.16); border:1px solid rgba(0,82,255,.30); color:#9dc0ff; font-size:10px; letter-spacing:.22em; font-weight:1000; }
  .menuHero { position:relative; min-height:96px; border-radius:30px; overflow:hidden; border:1px solid rgba(255,255,255,.12); background:linear-gradient(135deg, rgba(0,82,255,.20), rgba(255,255,255,.04)); }
  .menuHero:before { content:""; position:absolute; inset:-80px; background:conic-gradient(from 0deg, transparent, rgba(0,82,255,.30), transparent, rgba(34,211,238,.18), transparent); animation:spin 8s linear infinite; }
  .menuHeroInner { position:absolute; inset:1px; border-radius:29px; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; flex-direction:column; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-9px)} 40%{transform:translateX(9px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
  #gameWrap.shake { animation:shake .32s ease-in-out; }
  #goalFlash { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .22s ease; background:rgba(0,82,255,.24); }
  #goalFlash.active { opacity:1; }
  #roundHint { position:absolute; left:0; right:0; top:calc(env(safe-area-inset-top) + 118px); text-align:center; pointer-events:none; color:rgba(255,255,255,.55); font-size:10px; font-weight:1000; letter-spacing:.2em; }
  #overlayText.pop { animation: popText .42s ease-out; }
  @keyframes popText { 0%{opacity:0;transform:scale(.55)} 45%{opacity:1;transform:scale(1.18)} 100%{opacity:1;transform:scale(1)} }
  #resultPanel { backdrop-filter:blur(10px); }

  .premiumShell { position:relative; padding:16px; border-radius:34px; overflow:hidden; border:1px solid rgba(255,255,255,.14); background:linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.025)); box-shadow:0 0 54px rgba(0,82,255,.20); }
  .premiumShell:before { content:""; position:absolute; inset:-80px; background:conic-gradient(from 180deg, transparent, rgba(0,82,255,.25), transparent, rgba(34,211,238,.16), transparent); animation:spin 10s linear infinite; opacity:.9; }
  .premiumInner { position:relative; z-index:1; border-radius:26px; padding:18px 12px; background:rgba(0,0,0,.58); border:1px solid rgba(255,255,255,.08); }
  .orb { width:92px; height:92px; margin:0 auto 12px; border-radius:999px; background:radial-gradient(circle at 35% 30%, #fff, #8db5ff 16%, #0052ff 42%, #04112f 72%, #000 100%); box-shadow:0 0 46px rgba(0,82,255,.62), inset 0 0 22px rgba(255,255,255,.18); position:relative; }
  .orb:after { content:""; position:absolute; inset:-13px; border-radius:999px; border:1px solid rgba(34,211,238,.28); box-shadow:0 0 24px rgba(34,211,238,.22); }
  .featureGrid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:12px; }
  .feature { border:1px solid rgba(255,255,255,.11); background:rgba(255,255,255,.055); border-radius:16px; padding:9px 6px; text-align:center; }
  .feature strong { display:block; font-size:11px; letter-spacing:.12em; }
  .feature span { display:block; margin-top:4px; font-size:8px; letter-spacing:.12em; color:rgba(255,255,255,.52); font-weight:900; }
  .sectionLabel { display:flex; align-items:center; gap:8px; justify-content:center; color:rgba(255,255,255,.72); font-size:10px; font-weight:1000; letter-spacing:.2em; margin-bottom:10px; }
  .sectionLabel:before, .sectionLabel:after { content:""; height:1px; flex:1; background:linear-gradient(90deg, transparent, rgba(255,255,255,.18)); }
  .sectionLabel:after { background:linear-gradient(90deg, rgba(255,255,255,.18), transparent); }

  #splashScreen { background:
    radial-gradient(circle at 50% 34%, rgba(0,82,255,.34), transparent 34%),
    radial-gradient(circle at 50% 70%, rgba(34,211,238,.12), transparent 30%),
    #000; }
  #splashCard { position:relative; width:min(84vw,380px); min-height:390px; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:42px; overflow:hidden; border:1px solid rgba(255,255,255,.12); background:linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.025)); box-shadow:0 0 90px rgba(0,82,255,.42); }
  #splashCard:before { content:""; position:absolute; inset:-110px; background:conic-gradient(from 90deg, transparent, rgba(0,82,255,.42), transparent, rgba(34,211,238,.20), transparent); animation:spin 7s linear infinite; }
  #splashCardInner { position:absolute; inset:1px; border-radius:41px; background:rgba(0,0,0,.72); display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .splashOrb { width:116px; height:116px; border-radius:999px; margin-bottom:18px; background:radial-gradient(circle at 32% 25%, #fff, #b7ccff 14%, #0052ff 40%, #03153f 72%, #000 100%); box-shadow:0 0 58px rgba(0,82,255,.68), inset 0 0 28px rgba(255,255,255,.20); position:relative; }
  .splashOrb:before, .splashOrb:after { content:""; position:absolute; inset:-16px; border-radius:999px; border:1px solid rgba(34,211,238,.30); transform:rotate(-18deg) scaleY(.46); box-shadow:0 0 30px rgba(34,211,238,.18); }
  .splashOrb:after { inset:-27px; opacity:.45; transform:rotate(24deg) scaleY(.34); }
  .splashTitle { font-size:31px; line-height:.92; text-align:center; font-weight:1000; letter-spacing:.10em; text-shadow:0 0 32px rgba(0,82,255,.95); }
  .splashSub { margin-top:14px; color:rgba(255,255,255,.58); font-size:10px; letter-spacing:.26em; font-weight:1000; }
  .menuOrbit { position:absolute; width:180px; height:180px; border-radius:999px; border:1px solid rgba(34,211,238,.12); left:50%; top:80px; transform:translateX(-50%) rotate(-12deg) scaleY(.42); pointer-events:none; box-shadow:0 0 42px rgba(0,82,255,.18); }
  .menuActionGrid { display:grid; grid-template-columns:1.15fr .85fr; gap:10px; }
  .miniBtn { min-height:62px; border-radius:26px; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.08); color:white; font-size:12px; letter-spacing:.16em; font-weight:1000; touch-action:manipulation; }
  .statusStrip { display:flex; gap:8px; justify-content:center; margin-top:12px; }
  .statusChip { padding:7px 9px; border-radius:999px; background:rgba(0,82,255,.12); border:1px solid rgba(0,82,255,.22); color:rgba(255,255,255,.70); font-size:8px; letter-spacing:.16em; font-weight:1000; }


  /* GAME LOBBY STYLE MENU */
  #menuScreen { padding:16px 18px 20px; background:radial-gradient(circle at 50% 10%, rgba(0,82,255,.22), transparent 30%), #020204; }
  .lobby { min-height:100%; display:flex; flex-direction:column; gap:14px; max-width:430px; margin:0 auto; padding-top:calc(env(safe-area-inset-top) + 4px); padding-bottom:calc(env(safe-area-inset-bottom) + 10px); }
  .topBar { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .profilePill { flex:1; min-height:54px; border-radius:22px; padding:8px 10px; display:flex; align-items:center; gap:10px; border:1px solid rgba(255,255,255,.12); background:linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.035)); box-shadow:0 0 26px rgba(0,82,255,.13); }
  .avatarBall { width:38px; height:38px; border-radius:999px; background:radial-gradient(circle at 35% 25%, #fff, #bcd2ff 18%, #0052ff 48%, #061a4d 75%, #000 100%); box-shadow:0 0 22px rgba(0,82,255,.55); position:relative; flex:0 0 auto; }
  .avatarBall:after { content:""; position:absolute; left:5px; right:5px; top:16px; height:6px; border-radius:99px; background:rgba(255,255,255,.78); transform:rotate(-12deg); }
  .profileName { font-weight:1000; font-size:12px; letter-spacing:.09em; color:white; }
  .profileSub { margin-top:3px; color:#72a6ff; font-size:9px; letter-spacing:.13em; font-weight:1000; }
  .coinPill { min-width:74px; height:40px; border-radius:18px; border:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.44); display:flex; align-items:center; justify-content:center; gap:6px; font-size:10px; font-weight:1000; letter-spacing:.08em; box-shadow:inset 0 0 18px rgba(255,255,255,.035); }
  .coinDot { width:14px; height:14px; border-radius:50%; background:radial-gradient(circle,#fff5b5,#fbbf24 55%,#7a4100); box-shadow:0 0 12px rgba(251,191,36,.35); }
  .hamburger { width:44px; height:40px; border-radius:18px; border:1px solid rgba(255,255,255,.13); background:rgba(0,0,0,.42); color:white; font-size:22px; font-weight:1000; }
  .lobbyHero { position:relative; min-height:282px; border-radius:34px; overflow:hidden; border:1px solid rgba(255,255,255,.10); background:linear-gradient(180deg, rgba(8,22,48,.98), rgba(1,4,12,.96)); box-shadow:0 0 48px rgba(0,82,255,.20); }
  .lobbyHero:before { content:""; position:absolute; inset:0; background:linear-gradient(120deg, transparent 8%, rgba(0,82,255,.11) 12%, transparent 20%, transparent 78%, rgba(0,82,255,.13) 86%, transparent 94%); opacity:.95; }
  .lobbyHero:after { content:""; position:absolute; left:50%; bottom:-70px; width:330px; height:170px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(circle at 50% 5%, rgba(0,82,255,.36), rgba(0,82,255,.08) 34%, transparent 70%); }
  .heroLogo { position:absolute; top:34px; left:0; right:0; text-align:center; font-size:42px; line-height:.86; font-weight:1000; letter-spacing:.09em; text-shadow:0 4px 0 rgba(255,255,255,.10), 0 0 34px rgba(0,82,255,.95); }
  .heroLogo span { display:block; color:#64a5ff; font-size:50px; letter-spacing:.075em; text-shadow:0 0 30px rgba(0,82,255,.95); }
  .heroArc { position:absolute; top:22px; left:50%; width:170px; height:76px; transform:translateX(-50%); border-top:6px solid rgba(170,210,255,.70); border-radius:50%; filter:drop-shadow(0 0 12px rgba(0,82,255,.8)); opacity:.7; }
  .heroBall { position:absolute; left:50%; bottom:52px; width:82px; height:82px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(circle at 32% 24%, #fff, #dceaff 16%, #7fb1ff 36%, #0052ff 62%, #051944 100%); box-shadow:0 0 40px rgba(0,82,255,.74), 0 18px 42px rgba(0,0,0,.7); animation:floatBall 2.4s ease-in-out infinite; }
  .heroBall:before { content:""; position:absolute; left:11px; right:11px; top:34px; height:12px; border-radius:999px; background:rgba(255,255,255,.88); transform:rotate(-10deg); }
  .heroBall:after { content:""; position:absolute; left:27px; top:31px; width:7px; height:13px; border-radius:999px; background:#020817; box-shadow:22px 0 0 #020817; }
  .heroPlatform { position:absolute; left:50%; bottom:26px; width:170px; height:30px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(ellipse, rgba(0,120,255,.72), rgba(0,82,255,.18) 48%, transparent 72%); filter:blur(.2px); }
  @keyframes floatBall { 0%,100%{ transform:translateX(-50%) translateY(0); } 50%{ transform:translateX(-50%) translateY(-13px); } }
  .bigPlay { position:relative; width:92%; min-height:64px; margin:-32px auto 0; border-radius:18px; border:1px solid rgba(155,205,255,.36); background:linear-gradient(180deg,#1e88ff,#0052ff 58%,#05276f); color:white; font-size:22px; font-weight:1000; letter-spacing:.16em; box-shadow:0 0 34px rgba(0,82,255,.56), inset 0 2px 0 rgba(255,255,255,.28); z-index:3; clip-path:polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%); }
  .bigPlay .playIcon { display:inline-block; margin-right:10px; transform:translateY(1px); }
  .quickModes { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .quickCard { min-height:58px; border-radius:18px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.035)); color:white; font-weight:1000; font-size:12px; letter-spacing:.12em; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 0 20px rgba(0,82,255,.10); }
  .quickIcon { font-size:18px; filter:drop-shadow(0 0 10px rgba(0,82,255,.7)); }
  .usernameCard { border-radius:22px; padding:10px; border:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.32); display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; }
  #usernameInput { width:100%; height:46px; border:1px solid rgba(255,255,255,.13); border-radius:16px; background:rgba(255,255,255,.08); color:white; text-align:center; font-size:14px; font-weight:1000; letter-spacing:.12em; outline:none; text-transform:uppercase; }
  #usernameInput::placeholder { color:rgba(255,255,255,.34); }
  #saveNameBtn { height:46px; min-width:74px; border:0; border-radius:16px; background:white; color:#020204; font-size:11px; font-weight:1000; letter-spacing:.12em; }
  #nameWarn { min-height:16px; text-align:center; color:#ff7b7b; font-size:9px; font-weight:1000; letter-spacing:.12em; margin-top:6px; }
  .premiumRegionWrap { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .region { position:relative; min-height:66px; overflow:hidden; border-radius:22px; background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.025)); }
  .region:before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 50% 0%, rgba(34,211,238,.22), transparent 58%); opacity:.35; }
  .region strong { position:relative; display:block; font-size:16px; letter-spacing:.16em; }
  .region span { position:relative; display:block; margin-top:5px; font-size:8px; color:rgba(255,255,255,.48); letter-spacing:.16em; }
  .region.selected { border-color:#64d8ff; background:linear-gradient(180deg, rgba(34,211,238,.22), rgba(0,82,255,.10)); box-shadow:0 0 28px rgba(34,211,238,.32), inset 0 0 18px rgba(255,255,255,.06); }
  .bottomNav { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding:10px; border-radius:24px; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.36); box-shadow:0 0 26px rgba(0,82,255,.12); }
  .navItem { min-height:48px; border:0; border-radius:16px; background:transparent; color:rgba(255,255,255,.52); font-size:8px; letter-spacing:.10em; font-weight:1000; }
  .navItem b { display:block; font-size:18px; margin-bottom:4px; color:#6aa7ff; }
  .navItem.active { background:rgba(0,82,255,.12); color:#8ebaff; }


  /* CLEANER FINAL MOBILE LOBBY FLOW */
  #splashStage { position:relative; width:min(82vw,360px); min-height:430px; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:42px; overflow:hidden; border:1px solid rgba(255,255,255,.12); background:linear-gradient(180deg, rgba(6,18,45,.92), rgba(0,0,0,.96)); box-shadow:0 0 88px rgba(0,82,255,.38); }
  #splashStage:before { content:""; position:absolute; inset:-120px; background:conic-gradient(from 180deg, transparent, rgba(0,82,255,.38), transparent, rgba(34,211,238,.18), transparent); animation:spin 9s linear infinite; opacity:.85; }
  #splashStage:after { content:""; position:absolute; inset:1px; border-radius:41px; background:radial-gradient(circle at 50% 35%, rgba(0,82,255,.16), rgba(0,0,0,.78) 58%, rgba(0,0,0,.96)); }
  .splashArenaMini { position:relative; z-index:2; width:210px; height:168px; border-radius:30px; border:1px solid rgba(140,190,255,.24); background:linear-gradient(180deg, rgba(0,82,255,.16), rgba(255,255,255,.035)); box-shadow:inset 0 0 34px rgba(0,82,255,.13), 0 0 42px rgba(0,82,255,.24); margin-bottom:24px; overflow:hidden; }
  .splashArenaMini:before { content:""; position:absolute; left:14px; right:14px; top:50%; height:1px; background:rgba(255,255,255,.16); }
  .splashArenaMini:after { content:""; position:absolute; left:50%; top:50%; width:72px; height:72px; margin:-36px 0 0 -36px; border-radius:50%; border:1px solid rgba(0,82,255,.34); box-shadow:0 0 18px rgba(0,82,255,.28); }
  .splashBoingBall { position:absolute; left:50%; top:50%; width:44px; height:44px; margin:-22px 0 0 -22px; border-radius:50%; background:radial-gradient(circle at 32% 22%, #fff, #d8e7ff 18%, #0052ff 58%, #031741 100%); box-shadow:0 0 34px rgba(0,82,255,.8); animation:floatBall 2s ease-in-out infinite; }
  .splashLine { position:absolute; height:7px; width:86px; border-radius:99px; background:rgba(255,255,255,.78); box-shadow:0 0 22px rgba(0,82,255,.52); }
  .splashLine.one { left:28px; bottom:42px; transform:rotate(-14deg); }
  .splashLine.two { right:26px; top:42px; transform:rotate(-14deg); opacity:.38; }
  .splashBrand { position:relative; z-index:2; text-align:center; font-size:30px; line-height:.86; letter-spacing:.12em; font-weight:1000; text-shadow:0 0 34px rgba(0,82,255,.95); }
  .splashBrand span { color:#68a7ff; font-size:42px; }
  .lobbyHero { min-height:300px; }
  .coinPill span:last-child { font-size:9px; letter-spacing:.12em; }
  .bottomNav, .quickModes, #menuScreen .card:has(.difficulty), #menuScreen .card:has(.arena) { display:none !important; }
  .lobby { justify-content:space-between; }
  .usernameCard { margin-top:0; }
  .flowBack { min-height:48px; border-radius:20px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.07); color:white; font-weight:1000; letter-spacing:.14em; }
  .modeGrid { display:grid; grid-template-columns:1fr; gap:12px; }
  .modeBtn { min-height:76px; border-radius:28px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.035)); color:white; text-align:left; padding:0 18px; font-weight:1000; letter-spacing:.12em; box-shadow:0 0 26px rgba(0,82,255,.10); touch-action:manipulation; }
  .modeBtn strong { display:block; font-size:17px; }
  .modeBtn span { display:block; margin-top:6px; font-size:9px; color:rgba(255,255,255,.52); letter-spacing:.16em; }
  .modeBtn.primary { background:linear-gradient(180deg, rgba(0,82,255,.34), rgba(0,82,255,.12)); border-color:rgba(91,155,255,.42); box-shadow:0 0 34px rgba(0,82,255,.28); }
  .flowTitle { text-align:center; font-size:30px; line-height:.95; font-weight:1000; letter-spacing:.08em; text-shadow:0 0 24px rgba(0,82,255,.75); }
  .flowMiniHero { min-height:118px; border-radius:30px; border:1px solid rgba(255,255,255,.12); background:radial-gradient(circle at 50% 30%, rgba(0,82,255,.26), rgba(255,255,255,.04)); display:flex; align-items:center; justify-content:center; position:relative; overflow:hidden; }
  .flowMiniHero:before { content:""; position:absolute; width:150px; height:78px; border-radius:50%; border:1px solid rgba(100,180,255,.20); transform:rotate(-12deg) scaleY(.46); }
  .flowBall { width:58px; height:58px; border-radius:50%; background:radial-gradient(circle at 32% 22%, #fff, #d8e7ff 18%, #0052ff 58%, #031741 100%); box-shadow:0 0 32px rgba(0,82,255,.72); }
  .roomInput { width:100%; height:58px; border:1px solid rgba(255,255,255,.14); border-radius:22px; background:rgba(255,255,255,.08); color:white; text-align:center; font-size:18px; font-weight:1000; letter-spacing:.22em; outline:none; text-transform:uppercase; }

  /* SETTINGS PANEL */
  .settingsBtn { position:relative; width:70%; min-height:48px; margin:-2px auto 0; border-radius:18px; border:1px solid rgba(255,255,255,.16); background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.035)); color:rgba(255,255,255,.86); font-size:12px; font-weight:1000; letter-spacing:.18em; box-shadow:0 0 18px rgba(0,82,255,.12); touch-action:manipulation; }
  .settingsBtn:active { transform:scale(.975); }
  .settingsCard { border-radius:30px; padding:16px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg, rgba(255,255,255,.085), rgba(255,255,255,.032)); box-shadow:0 0 34px rgba(0,82,255,.16); }
  .settingRow { min-height:66px; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 4px; border-bottom:1px solid rgba(255,255,255,.08); }
  .settingRow:last-child { border-bottom:0; }
  .settingTitle { font-size:13px; font-weight:1000; letter-spacing:.14em; }
  .settingSub { margin-top:5px; font-size:9px; color:rgba(255,255,255,.48); letter-spacing:.14em; font-weight:900; }
  .toggleBtn { width:84px; height:42px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.08); color:white; font-size:11px; font-weight:1000; letter-spacing:.12em; }
  .toggleBtn.on { background:linear-gradient(180deg, rgba(0,82,255,.72), rgba(0,82,255,.34)); border-color:rgba(111,170,255,.45); box-shadow:0 0 22px rgba(0,82,255,.28); }
  .regionMiniGrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; }
  .settingsHero { min-height:132px; border-radius:30px; border:1px solid rgba(255,255,255,.12); background:radial-gradient(circle at 50% 28%, rgba(0,82,255,.26), rgba(255,255,255,.04)); display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative; }
  .settingsHero:before { content:""; position:absolute; width:180px; height:82px; border-radius:50%; border:1px solid rgba(100,180,255,.22); transform:rotate(-12deg) scaleY(.46); }
  .settingsHero:after { content:""; width:62px; height:62px; border-radius:50%; background:radial-gradient(circle at 32% 22%, #fff, #d8e7ff 18%, #0052ff 58%, #031741 100%); box-shadow:0 0 36px rgba(0,82,255,.75); }


  /* FINAL CLEAN PREMIUM MENU - image inspired, but game-native */
  #menuScreen {
    padding:16px 18px 20px !important;
    overflow-y:auto;
    background:
      radial-gradient(circle at 50% -10%, rgba(255,255,255,.16), transparent 18%),
      radial-gradient(circle at 50% 20%, rgba(0,82,255,.18), transparent 30%),
      radial-gradient(circle at 50% 45%, rgba(251,191,36,.07), transparent 38%),
      #020204 !important;
  }
  .lobby.finalMenu {
    min-height:100%;
    max-width:430px;
    margin:0 auto;
    display:flex;
    flex-direction:column;
    gap:16px;
    padding-top:calc(env(safe-area-inset-top) + 8px);
    padding-bottom:calc(env(safe-area-inset-bottom) + 16px);
  }
  .finalTop {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
  }
  .finalProfile {
    flex:1;
    min-height:58px;
    border-radius:25px;
    border:1px solid rgba(251,191,36,.34);
    background:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
    display:flex;
    align-items:center;
    gap:12px;
    padding:9px 12px;
    box-shadow:0 0 28px rgba(0,82,255,.12), inset 0 0 22px rgba(255,255,255,.025);
  }
  .finalAvatar {
    width:42px;
    height:42px;
    border-radius:999px;
    background:radial-gradient(circle at 32% 22%, #fff, #dceaff 18%, #8bbcff 38%, #0052ff 62%, #051944 100%);
    box-shadow:0 0 22px rgba(0,82,255,.58);
    position:relative;
    flex:0 0 auto;
  }
  .finalAvatar:after {
    content:"";
    position:absolute;
    left:6px;
    right:6px;
    top:18px;
    height:6px;
    border-radius:999px;
    background:rgba(255,255,255,.88);
    transform:rotate(-10deg);
    box-shadow:0 0 12px rgba(0,82,255,.55);
  }
  .finalNameWrap {
    min-width:0;
    flex:1;
  }
  .finalName {
    font-size:15px;
    font-weight:1000;
    letter-spacing:.08em;
    color:#fff;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .finalNameSub {
    margin-top:4px;
    color:rgba(255,255,255,.46);
    font-size:8px;
    font-weight:1000;
    letter-spacing:.18em;
  }
  .finalEdit {
    width:34px;
    height:34px;
    border-radius:14px;
    border:1px solid rgba(255,255,255,.12);
    background:rgba(255,255,255,.06);
    color:#f8d890;
    font-size:15px;
    font-weight:1000;
  }
  .finalHow {
    width:54px;
    height:54px;
    border-radius:22px;
    border:1px solid rgba(251,191,36,.30);
    background:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.02));
    color:#f8d890;
    font-size:22px;
    font-weight:1000;
    box-shadow:0 0 22px rgba(251,191,36,.10);
  }
  .finalStage {
    position:relative;
    min-height:500px;
    border-radius:36px;
    overflow:hidden;
    border:1px solid rgba(255,255,255,.08);
    background:
      linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.012)),
      radial-gradient(circle at 50% 13%, rgba(255,255,255,.18), transparent 13%),
      radial-gradient(circle at 50% 43%, rgba(0,82,255,.24), transparent 34%),
      #02040a;
    box-shadow:0 0 54px rgba(0,82,255,.18), inset 0 0 80px rgba(0,0,0,.58);
  }
  .finalStage:before {
    content:"";
    position:absolute;
    left:50%;
    top:86px;
    width:270px;
    height:270px;
    margin-left:-135px;
    border-radius:999px;
    border:1px solid rgba(251,191,36,.34);
    box-shadow:0 0 44px rgba(251,191,36,.10);
  }
  .finalStage:after {
    content:"";
    position:absolute;
    left:50%;
    top:-10px;
    width:78px;
    height:260px;
    transform:translateX(-50%);
    background:linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,.08), transparent);
    filter:blur(10px);
    opacity:.55;
  }
  .finalLogo {
    position:absolute;
    top:112px;
    left:0;
    right:0;
    text-align:center;
    z-index:2;
    font-size:40px;
    line-height:.86;
    font-weight:1000;
    letter-spacing:.12em;
    color:#f6f8ff;
    text-shadow:0 0 28px rgba(0,82,255,.82), 0 3px 0 rgba(255,255,255,.08);
  }
  .finalLogo span {
    display:block;
    font-size:53px;
    color:#67a8ff;
    letter-spacing:.07em;
  }
  .finalLogo small {
    display:block;
    margin-top:14px;
    color:#f8d890;
    font-size:13px;
    letter-spacing:.62em;
    text-indent:.62em;
    text-shadow:0 0 16px rgba(251,191,36,.38);
  }
  .finalBot {
    position:absolute;
    left:50%;
    top:295px;
    width:92px;
    height:92px;
    transform:translateX(-50%);
    border-radius:999px;
    background:radial-gradient(circle at 32% 22%, #fff, #dceaff 17%, #8bbcff 38%, #0052ff 64%, #04153e 100%);
    box-shadow:0 0 42px rgba(0,82,255,.74), 0 26px 44px rgba(0,0,0,.64);
    z-index:2;
    animation:floatBall 2.6s ease-in-out infinite;
  }
  .finalBot:before {
    content:"";
    position:absolute;
    left:12px;
    right:12px;
    top:38px;
    height:11px;
    border-radius:999px;
    background:rgba(255,255,255,.92);
    transform:rotate(-10deg);
    box-shadow:0 0 16px rgba(0,82,255,.7);
  }
  .finalBot:after {
    content:"";
    position:absolute;
    left:29px;
    top:36px;
    width:7px;
    height:15px;
    border-radius:999px;
    background:#020817;
    box-shadow:27px 0 0 #020817;
  }
  .finalPlatform {
    position:absolute;
    left:50%;
    top:385px;
    width:220px;
    height:52px;
    transform:translateX(-50%);
    border-radius:50%;
    background:
      radial-gradient(ellipse at 50% 35%, rgba(0,140,255,.9), rgba(0,82,255,.22) 38%, transparent 70%);
    z-index:1;
  }
  .finalPlatform:after {
    content:"";
    position:absolute;
    left:22px;
    right:22px;
    top:10px;
    height:28px;
    border-radius:50%;
    border:2px solid rgba(251,191,36,.38);
    box-shadow:0 0 24px rgba(0,82,255,.44), inset 0 0 18px rgba(0,82,255,.20);
  }
  .finalUsernameEdit {
    display:grid;
    grid-template-columns:1fr auto;
    gap:8px;
    border-radius:22px;
    padding:10px;
    border:1px solid rgba(255,255,255,.11);
    background:rgba(0,0,0,.30);
  }
  #usernameInput {
    width:100%;
    height:46px;
    border:1px solid rgba(255,255,255,.13);
    border-radius:16px;
    background:rgba(255,255,255,.07);
    color:white;
    text-align:center;
    font-size:14px;
    font-weight:1000;
    letter-spacing:.12em;
    outline:none;
    text-transform:uppercase;
  }
  #saveNameBtn {
    height:46px;
    min-width:72px;
    border:0;
    border-radius:16px;
    background:#f6d98b;
    color:#020204;
    font-size:11px;
    font-weight:1000;
    letter-spacing:.12em;
  }
  #nameWarn {
    grid-column:1 / -1;
    min-height:14px;
    text-align:center;
    color:#ff8b8b;
    font-size:9px;
    font-weight:1000;
    letter-spacing:.12em;
  }
  .finalPanel {
    border-radius:32px;
    padding:16px;
    border:1px solid rgba(251,191,36,.30);
    background:linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
    box-shadow:0 0 32px rgba(251,191,36,.08), inset 0 0 38px rgba(255,255,255,.018);
  }
  .finalPanelTitle {
    display:flex;
    align-items:center;
    justify-content:space-between;
    color:#f8d890;
    font-size:24px;
    font-weight:1000;
    letter-spacing:.12em;
    margin:0 4px 14px;
  }
  .finalPanelTitle button {
    width:38px;
    height:38px;
    border-radius:16px;
    border:1px solid rgba(251,191,36,.20);
    background:rgba(255,255,255,.04);
    color:#f8d890;
    font-size:22px;
  }
  .finalModeGrid {
    display:grid;
    grid-template-columns:1fr;
    gap:11px;
  }
  .finalModeBtn {
    min-height:74px;
    border-radius:22px;
    border:1px solid rgba(255,255,255,.14);
    background:linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.02));
    color:#fff;
    display:grid;
    grid-template-columns:58px 1fr 24px;
    align-items:center;
    gap:10px;
    padding:8px 16px 8px 10px;
    text-align:left;
    box-shadow:inset 0 0 22px rgba(255,255,255,.018);
  }
  .finalModeIcon {
    width:42px;
    height:42px;
    border-radius:16px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:26px;
    filter:drop-shadow(0 0 12px rgba(0,82,255,.45));
  }
  .finalModeBtn strong {
    display:block;
    font-size:18px;
    font-weight:1000;
    letter-spacing:.08em;
  }
  .finalModeBtn span {
    display:block;
    margin-top:6px;
    font-size:10px;
    letter-spacing:.04em;
    color:rgba(255,255,255,.50);
    font-weight:800;
  }
  .finalArrow {
    color:#f8d890;
    font-size:28px;
    text-align:right;
  }
  .finalSettingsGrid {
    display:grid;
    gap:11px;
  }
  .finalSettingRow {
    min-height:68px;
    border-radius:22px;
    border:1px solid rgba(255,255,255,.13);
    background:linear-gradient(180deg, rgba(255,255,255,.065), rgba(255,255,255,.018));
    display:grid;
    grid-template-columns:56px 1fr auto;
    align-items:center;
    gap:10px;
    padding:8px 12px;
  }
  .finalSettingIcon {
    width:42px;
    height:42px;
    border-radius:16px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:24px;
    color:#67a8ff;
    filter:drop-shadow(0 0 12px rgba(0,82,255,.45));
  }
  .finalSettingLabel {
    font-size:17px;
    font-weight:1000;
    letter-spacing:.10em;
  }
  .finalSegment {
    display:flex;
    width:124px;
    height:38px;
    border-radius:999px;
    overflow:hidden;
    border:1px solid rgba(255,255,255,.13);
    background:rgba(255,255,255,.05);
  }
  .finalSegment .region,
  .finalSegment .toggleBtn {
    min-height:0 !important;
    height:100%;
    flex:1;
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    color:rgba(255,255,255,.62);
    box-shadow:none !important;
    font-size:12px;
    letter-spacing:.08em;
    padding:0;
  }
  .finalSegment .region strong,
  .finalSegment .region span {
    display:inline !important;
    margin:0 !important;
    font-size:12px !important;
    letter-spacing:.08em !important;
    color:inherit !important;
  }
  .finalSegment .region:before { display:none !important; }
  .finalSegment .selected,
  .finalSegment .toggleBtn.on {
    background:linear-gradient(180deg, rgba(0,82,255,.82), rgba(0,82,255,.42)) !important;
    color:white !important;
    box-shadow:0 0 20px rgba(0,82,255,.38) !important;
  }
  .finalSoundOff {
    min-height:0 !important;
    height:100%;
    flex:1;
    border:0;
    background:transparent;
    color:rgba(255,255,255,.62);
    font-size:12px;
    font-weight:1000;
    letter-spacing:.08em;
  }


  /* IMAGE INSPIRED SEPARATE MOBILE FLOW */
  .mobileLobbySimple {
    min-height:100%; max-width:430px; margin:0 auto; display:flex; flex-direction:column; gap:14px;
    padding:calc(env(safe-area-inset-top) + 8px) 0 calc(env(safe-area-inset-bottom) + 14px);
  }
  .mobileHeroCard {
    position:relative; min-height:455px; border-radius:36px; overflow:hidden; border:1px solid rgba(255,255,255,.10);
    background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.012)), radial-gradient(circle at 50% 16%,rgba(255,255,255,.17),transparent 12%), radial-gradient(circle at 50% 46%,rgba(0,82,255,.25),transparent 35%), #02040a;
    box-shadow:0 0 54px rgba(0,82,255,.20), inset 0 0 80px rgba(0,0,0,.62);
  }
  .mobileHeroCard:before { content:""; position:absolute; inset:0; background:linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px); background-size:34px 34px; opacity:.5; }
  .mobileHeroRing { position:absolute; left:50%; top:78px; width:255px; height:255px; margin-left:-127px; border-radius:999px; border:1px solid rgba(251,191,36,.35); box-shadow:0 0 46px rgba(251,191,36,.12), inset 0 0 38px rgba(0,82,255,.10); }
  .mobileHeroLogo { position:absolute; top:110px; left:0; right:0; text-align:center; z-index:2; font-size:40px; line-height:.86; font-weight:1000; letter-spacing:.12em; color:#f6f8ff; text-shadow:0 0 28px rgba(0,82,255,.85),0 3px 0 rgba(255,255,255,.08); }
  .mobileHeroLogo span { display:block; font-size:53px; color:#67a8ff; letter-spacing:.07em; }
  .mobileHeroLogo small { display:block; margin-top:14px; color:#f8d890; font-size:13px; letter-spacing:.62em; text-indent:.62em; text-shadow:0 0 16px rgba(251,191,36,.38); }
  .mobileHeroBall { position:absolute; left:50%; top:292px; width:92px; height:92px; transform:translateX(-50%); border-radius:999px; background:radial-gradient(circle at 32% 22%,#fff,#dceaff 17%,#8bbcff 38%,#0052ff 64%,#04153e 100%); box-shadow:0 0 42px rgba(0,82,255,.74),0 26px 44px rgba(0,0,0,.64); z-index:2; animation:floatBall 2.6s ease-in-out infinite; }
  .mobileHeroBall:before { content:""; position:absolute; left:12px; right:12px; top:38px; height:11px; border-radius:999px; background:rgba(255,255,255,.92); transform:rotate(-10deg); box-shadow:0 0 16px rgba(0,82,255,.7); }
  .mobileHeroBall:after { content:""; position:absolute; left:29px; top:36px; width:7px; height:15px; border-radius:999px; background:#020817; box-shadow:27px 0 0 #020817; }
  .mobileHeroPlatform { position:absolute; left:50%; top:380px; width:220px; height:52px; transform:translateX(-50%); border-radius:50%; background:radial-gradient(ellipse at 50% 35%,rgba(0,140,255,.9),rgba(0,82,255,.22) 38%,transparent 70%); }
  .mobileHeroPlatform:after { content:""; position:absolute; left:22px; right:22px; top:10px; height:28px; border-radius:50%; border:2px solid rgba(251,191,36,.38); box-shadow:0 0 24px rgba(0,82,255,.44), inset 0 0 18px rgba(0,82,255,.20); }
  .mobileMainActions { display:grid; gap:12px; }
  .mobileMegaPlay { min-height:76px; border:0; border-radius:24px; background:linear-gradient(180deg,#2a95ff,#0052ff 58%,#05276f); color:white; font-size:31px; font-weight:1000; letter-spacing:.20em; box-shadow:0 0 38px rgba(0,82,255,.62), inset 0 2px 0 rgba(255,255,255,.28); clip-path:polygon(7% 0,93% 0,100% 50%,93% 100%,7% 100%,0 50%); touch-action:manipulation; }
  .mobileSettingsBtn { min-height:58px; border-radius:22px; border:1px solid rgba(251,191,36,.30); background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.025)); color:#f8d890; font-size:15px; font-weight:1000; letter-spacing:.18em; box-shadow:0 0 24px rgba(251,191,36,.08); touch-action:manipulation; }
  .mobileMegaPlay:active, .mobileSettingsBtn:active, .modeBtn:active, .toggleBtn:active, .flowBack:active { transform:scale(.975); }
  .mobileSubPage { min-height:100%; max-width:430px; margin:0 auto; display:flex; flex-direction:column; justify-content:center; gap:14px; padding:calc(env(safe-area-inset-top) + 14px) 0 calc(env(safe-area-inset-bottom) + 14px); }
  .mobileSubHero { min-height:132px; border-radius:30px; border:1px solid rgba(255,255,255,.12); background:radial-gradient(circle at 50% 28%,rgba(0,82,255,.26),rgba(255,255,255,.04)); display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative; box-shadow:0 0 34px rgba(0,82,255,.14); }
  .mobileSubHero:before { content:""; position:absolute; width:180px; height:82px; border-radius:50%; border:1px solid rgba(100,180,255,.22); transform:rotate(-12deg) scaleY(.46); }
  .mobileSubBall { width:62px; height:62px; border-radius:50%; background:radial-gradient(circle at 32% 22%,#fff,#d8e7ff 18%,#0052ff 58%,#031741 100%); box-shadow:0 0 36px rgba(0,82,255,.75); z-index:1; }
  .mobileOptionPanel { border-radius:28px; padding:14px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg,rgba(255,255,255,.085),rgba(255,255,255,.032)); box-shadow:0 0 30px rgba(0,82,255,.14); }
  .mobileOptionTitle { color:#f8d890; font-size:14px; font-weight:1000; letter-spacing:.18em; margin:0 0 12px 2px; }
  .mobileTwoGrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .mobileTwoGrid .toggleBtn { width:100%; min-height:58px; border-radius:22px; }
  .modeGrid { display:grid; grid-template-columns:1fr; gap:12px; }
  .modeBtn { min-height:76px; border-radius:28px; border:1px solid rgba(255,255,255,.13); background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.035)); color:white; text-align:left; padding:0 18px; font-weight:1000; letter-spacing:.12em; box-shadow:0 0 26px rgba(0,82,255,.10); touch-action:manipulation; }
  .modeBtn strong { display:block; font-size:17px; }
  .modeBtn span { display:block; margin-top:6px; font-size:9px; color:rgba(255,255,255,.52); letter-spacing:.16em; }
  .modeBtn.primary { background:linear-gradient(180deg,rgba(0,82,255,.34),rgba(0,82,255,.12)); border-color:rgba(91,155,255,.42); box-shadow:0 0 34px rgba(0,82,255,.28); }



  /* === PREMIUM CYBER ARENA LOBBY v2 === */
  #menuScreen {
    padding:0 !important;
    overflow:hidden !important;
    background:#020409 !important;
  }
  .arenaLobby {
    position:relative;
    width:100%;
    height:100dvh;
    max-width:430px;
    margin:0 auto;
    overflow:hidden;
    background:
      radial-gradient(circle at 50% 38%, rgba(0,82,255,.30), transparent 38%),
      radial-gradient(circle at 50% 78%, rgba(119,60,255,.16), transparent 32%),
      linear-gradient(180deg, #030716 0%, #02040a 58%, #000 100%);
  }
  .arenaLobby:before {
    content:"";
    position:absolute;
    inset:0;
    background:
      linear-gradient(rgba(44,126,255,.075) 1px, transparent 1px),
      linear-gradient(90deg, rgba(44,126,255,.065) 1px, transparent 1px);
    background-size:34px 34px;
    opacity:.62;
    transform:perspective(420px) rotateX(0deg);
  }
  .arenaLobby:after {
    content:"";
    position:absolute;
    left:-16%; right:-16%; bottom:-7%;
    height:40%;
    background:
      radial-gradient(ellipse at 50% 8%, rgba(0,170,255,.42), transparent 36%),
      linear-gradient(rgba(0,126,255,.22) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,126,255,.16) 1px, transparent 1px);
    background-size:auto, 36px 36px, 36px 36px;
    transform:perspective(360px) rotateX(62deg);
    transform-origin:top center;
    opacity:.9;
    filter:drop-shadow(0 0 24px rgba(0,82,255,.32));
  }
  .arenaSideGlow {
    position:absolute;
    inset:0;
    pointer-events:none;
    background:
      linear-gradient(110deg, rgba(0,82,255,.34) 0 2px, transparent 2px 18%, rgba(0,82,255,.18) 18.5%, transparent 19%),
      linear-gradient(250deg, rgba(0,82,255,.34) 0 2px, transparent 2px 18%, rgba(0,82,255,.18) 18.5%, transparent 19%);
    opacity:.52;
    mix-blend-mode:screen;
  }
  .arenaParticles {
    position:absolute;
    inset:0;
    pointer-events:none;
    background-image:
      radial-gradient(circle, rgba(0,174,255,.85) 0 1px, transparent 2px),
      radial-gradient(circle, rgba(144,80,255,.65) 0 1px, transparent 2px);
    background-size:64px 92px, 98px 140px;
    background-position:12px 20px, 37px 60px;
    opacity:.28;
    animation:driftParticles 9s linear infinite;
  }
  @keyframes driftParticles { to { transform:translateY(-42px); } }
  .arenaTop {
    position:absolute;
    z-index:5;
    top:calc(env(safe-area-inset-top) + 18px);
    left:18px;
    right:18px;
    display:flex;
    align-items:center;
    gap:10px;
  }
  .arenaProfile {
    flex:1;
    min-height:60px;
    border-radius:30px;
    border:1px solid rgba(0,136,255,.78);
    background:linear-gradient(90deg, rgba(0,18,48,.88), rgba(0,7,22,.62));
    box-shadow:0 0 26px rgba(0,82,255,.38), inset 0 0 24px rgba(0,132,255,.10);
    display:flex;
    align-items:center;
    gap:12px;
    padding:8px 12px;
  }
  .arenaAvatar {
    width:44px;
    height:44px;
    border-radius:50%;
    background:radial-gradient(circle at 32% 24%, #fff, #84bdff 17%, #0052ff 54%, #00163d 100%);
    box-shadow:0 0 24px rgba(0,132,255,.92);
    color:white;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:23px;
    font-weight:1000;
    font-style:italic;
  }
  .arenaName {
    font-size:20px;
    line-height:1;
    font-weight:1000;
    letter-spacing:.04em;
    text-shadow:0 0 12px rgba(255,255,255,.35);
  }
  .arenaOnline {
    margin-top:7px;
    color:#30ff77;
    font-size:10px;
    font-weight:1000;
    letter-spacing:.20em;
  }
  .arenaEdit, .arenaHelp {
    width:46px;
    height:46px;
    border-radius:20px;
    border:1px solid rgba(0,136,255,.72);
    background:rgba(0,13,35,.72);
    color:#5ee7ff;
    font-size:20px;
    font-weight:1000;
    box-shadow:0 0 20px rgba(0,82,255,.32), inset 0 0 18px rgba(0,132,255,.08);
    touch-action:manipulation;
  }
  .arenaLogoWrap {
    position:absolute;
    z-index:3;
    left:0;
    right:0;
    top:146px;
    text-align:center;
  }
  .arenaBigB {
    position:absolute;
    left:50%;
    top:-72px;
    transform:translateX(-50%) skewX(-8deg);
    font-size:270px;
    line-height:.8;
    font-weight:1000;
    color:transparent;
    -webkit-text-stroke:2px rgba(0,82,255,.28);
    text-shadow:0 0 42px rgba(0,82,255,.18);
    opacity:.82;
  }
  .arenaLogoBase {
    position:relative;
    z-index:2;
    display:block;
    font-size:76px;
    line-height:.82;
    font-weight:1000;
    font-style:italic;
    letter-spacing:.01em;
    color:#23a4ff;
    -webkit-text-stroke:1px rgba(179,235,255,.65);
    text-shadow:
      0 3px 0 #00358d,
      0 0 18px rgba(0,180,255,.95),
      0 0 44px rgba(0,82,255,.72);
    transform:skewX(-8deg);
  }
  .arenaLogoSub {
    position:relative;
    z-index:2;
    margin-top:12px;
    color:white;
    font-size:22px;
    font-weight:1000;
    letter-spacing:.34em;
    text-indent:.34em;
    text-shadow:0 0 16px rgba(255,255,255,.80), 0 0 28px rgba(0,82,255,.62);
  }
  .arenaStands {
    position:absolute;
    z-index:1;
    left:-28px;
    right:-28px;
    top:285px;
    height:195px;
    border-radius:50% 50% 0 0;
    background:
      radial-gradient(ellipse at center, rgba(0,82,255,.22), transparent 46%),
      repeating-linear-gradient(90deg, rgba(40,160,255,.16) 0 2px, transparent 2px 18px),
      linear-gradient(180deg, rgba(10,25,55,.0), rgba(8,18,42,.52));
    border-top:1px solid rgba(0,140,255,.35);
    opacity:.76;
  }
  .arenaBanners {
    position:absolute;
    z-index:2;
    top:328px;
    left:18px;
    right:18px;
    display:flex;
    justify-content:space-between;
    pointer-events:none;
  }
  .arenaBanner {
    width:38px;
    height:108px;
    border:1px solid rgba(0,136,255,.70);
    background:linear-gradient(180deg, rgba(0,82,255,.22), rgba(0,0,0,.38));
    box-shadow:0 0 18px rgba(0,82,255,.34);
    color:#4e9dff;
    font-size:13px;
    font-weight:1000;
    letter-spacing:.12em;
    display:flex;
    align-items:center;
    justify-content:center;
    writing-mode:vertical-rl;
  }
  .arenaBallStage {
    position:absolute;
    z-index:4;
    left:0;
    right:0;
    top:374px;
    height:170px;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .arenaBall {
    width:142px;
    height:142px;
    border-radius:50%;
    background:
      radial-gradient(circle at 28% 20%, rgba(255,255,255,.98) 0 13%, rgba(145,225,255,.96) 18%, #28a6ff 43%, #0052ff 66%, #001946 100%);
    box-shadow:
      0 0 36px rgba(0,180,255,.98),
      0 0 76px rgba(0,82,255,.75),
      inset -18px -22px 38px rgba(0,0,0,.35);
    position:relative;
    animation:arenaFloat 2.7s ease-in-out infinite;
  }
  @keyframes arenaFloat { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-14px); } }
  .arenaBall:before {
    content:"";
    position:absolute;
    left:32px;
    right:32px;
    top:65px;
    height:14px;
    border-radius:999px;
    background:#010611;
    transform:rotate(-6deg);
  }
  .arenaBall:after {
    content:"";
    position:absolute;
    left:48px;
    top:55px;
    width:17px;
    height:32px;
    border-radius:999px;
    background:#010611;
    box-shadow:42px 0 0 #010611;
    transform:rotate(-3deg);
  }
  .arenaPlatform {
    position:absolute;
    z-index:3;
    left:50%;
    top:506px;
    width:260px;
    height:76px;
    transform:translateX(-50%);
    border-radius:50%;
    background:radial-gradient(ellipse at 50% 38%, rgba(0,225,255,.9), rgba(0,82,255,.28) 42%, transparent 72%);
    filter:drop-shadow(0 0 26px rgba(0,174,255,.82));
  }
  .arenaPlatform:after {
    content:"";
    position:absolute;
    left:24px;
    right:24px;
    top:18px;
    height:36px;
    border-radius:50%;
    border:3px solid rgba(62,220,255,.86);
    box-shadow:0 0 28px rgba(0,200,255,.9), inset 0 0 18px rgba(0,82,255,.52);
  }
  .arenaPlay {
    position:absolute;
    z-index:7;
    left:22px;
    right:22px;
    bottom:118px;
    min-height:86px;
    border:1px solid rgba(124,229,255,.98);
    color:white;
    font-size:42px;
    font-style:italic;
    font-weight:1000;
    letter-spacing:.12em;
    background:linear-gradient(180deg, rgba(0,35,104,.98), rgba(0,82,255,.48) 50%, rgba(0,18,58,.96));
    clip-path:polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%);
    box-shadow:0 0 34px rgba(0,170,255,.9), inset 0 0 38px rgba(0,132,255,.38), inset 0 2px 0 rgba(255,255,255,.34);
    text-shadow:0 0 18px rgba(255,255,255,.85);
    touch-action:manipulation;
  }
  .arenaPlay span {
    color:#49f1ff;
    font-size:32px;
    letter-spacing:0;
    margin:0 18px;
    text-shadow:0 0 18px rgba(0,240,255,.95);
  }
  .arenaSettings {
    position:absolute;
    z-index:7;
    left:50%;
    bottom:72px;
    transform:translateX(-50%);
    border:0;
    background:transparent;
    color:#65efff;
    font-size:16px;
    font-weight:1000;
    letter-spacing:.28em;
    text-shadow:0 0 16px rgba(0,220,255,.88);
    touch-action:manipulation;
  }
  .arenaBuilt {
    position:absolute;
    z-index:7;
    left:0;
    right:0;
    bottom:28px;
    color:#0078ff;
    text-align:center;
    font-size:13px;
    font-weight:1000;
    letter-spacing:.28em;
    text-shadow:0 0 14px rgba(0,82,255,.72);
  }
  #nameEditPanel { display:none !important; }
  @media (max-height:700px) {
    .arenaLogoWrap { top:128px; }
    .arenaLogoBase { font-size:66px; }
    .arenaLogoSub { font-size:19px; }
    .arenaBallStage { top:342px; }
    .arenaBall { width:122px; height:122px; }
    .arenaBall:before { top:56px; left:28px; right:28px; }
    .arenaBall:after { top:48px; left:41px; box-shadow:36px 0 0 #010611; }
    .arenaPlatform { top:458px; width:235px; }
    .arenaPlay { bottom:104px; min-height:76px; font-size:36px; }
    .arenaSettings { bottom:64px; }
    .arenaBuilt { bottom:25px; }
  }



  /* ARTWORK BACKGROUND PREMIUM LOBBY */
  #menuScreen.artworkMenu {
    padding:0 !important;
    overflow:hidden !important;
    background:#02040a !important;
  }
  .artLobby {
    position:relative;
    width:100%;
    height:100%;
    overflow:hidden;
    background-image:
      linear-gradient(180deg, rgba(0,0,0,.06), rgba(0,0,0,.02) 48%, rgba(0,0,0,.12)),
      url("/mobile-lobby.png");
    background-size:cover;
    background-position:center center;
    background-repeat:no-repeat;
  }
  .artLobby:after {
    content:"";
    position:absolute;
    inset:0;
    pointer-events:none;
    background:
      radial-gradient(circle at 50% 62%, rgba(0,82,255,.06), transparent 38%),
      linear-gradient(90deg, rgba(0,0,0,.12), transparent 12%, transparent 88%, rgba(0,0,0,.12));
  }
  .artTop {
    position:absolute;
    z-index:5;
    top:calc(env(safe-area-inset-top) + 18px);
    left:16px;
    right:16px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
  }
  .artProfile {
    flex:1;
    height:58px;
    border-radius:24px;
    border:1px solid rgba(0,174,255,.85);
    background:linear-gradient(180deg, rgba(0,20,55,.92), rgba(0,5,18,.68));
    box-shadow:0 0 24px rgba(0,82,255,.42), inset 0 0 24px rgba(0,82,255,.18);
    display:flex;
    align-items:center;
    gap:11px;
    padding:7px 11px;
  }
  .artAvatar {
    width:44px;
    height:44px;
    border-radius:999px;
    background:radial-gradient(circle at 35% 24%, #fff, #8fbdff 18%, #0052ff 54%, #061b4c 100%);
    box-shadow:0 0 22px rgba(0,120,255,.9);
    display:flex;
    align-items:center;
    justify-content:center;
    color:white;
    font-size:24px;
    font-weight:1000;
    font-style:italic;
    text-shadow:0 0 10px rgba(255,255,255,.65);
    flex:0 0 auto;
  }
  .artPlayerName {
    color:#fff;
    font-size:18px;
    line-height:1;
    font-weight:1000;
    letter-spacing:.04em;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    max-width:165px;
    text-shadow:0 0 12px rgba(255,255,255,.22);
  }
  .artOnline {
    margin-top:7px;
    color:#43ff7b;
    font-size:10px;
    font-weight:1000;
    letter-spacing:.22em;
    text-shadow:0 0 10px rgba(67,255,123,.55);
  }
  .artEdit, .artHow {
    width:44px;
    height:44px;
    border-radius:18px;
    border:1px solid rgba(0,174,255,.85);
    background:linear-gradient(180deg, rgba(0,20,55,.88), rgba(0,5,18,.62));
    color:#62d8ff;
    font-size:22px;
    font-weight:1000;
    box-shadow:0 0 22px rgba(0,82,255,.35), inset 0 0 18px rgba(0,82,255,.14);
    touch-action:manipulation;
  }
  .artHow { font-size:24px; color:#8be7ff; }
  .artClickPlay {
    position:absolute;
    z-index:6;
    left:7%;
    right:7%;
    bottom:126px;
    height:92px;
    border:0;
    background:rgba(0,82,255,.001);
    touch-action:manipulation;
  }
  .artClickSettings {
    position:absolute;
    z-index:6;
    left:28%;
    right:28%;
    bottom:74px;
    height:44px;
    border:0;
    background:rgba(0,82,255,.001);
    touch-action:manipulation;
  }
  .artHiddenInput {
    position:absolute;
    left:-9999px;
    top:-9999px;
    width:1px;
    height:1px;
    opacity:0;
    pointer-events:none;
  }
  .artClickPlay:active, .artClickSettings:active, .artEdit:active, .artHow:active { transform:scale(.975); }

  @media (max-height:700px) {
    .artTop { top:calc(env(safe-area-inset-top) + 12px); }
    .artProfile { height:52px; border-radius:22px; }
    .artAvatar { width:38px; height:38px; font-size:21px; }
    .artPlayerName { font-size:16px; }
    .artOnline { font-size:9px; margin-top:5px; }
    .artEdit, .artHow { width:40px; height:40px; border-radius:16px; font-size:20px; }
    .artClickPlay { bottom:112px; height:84px; }
    .artClickSettings { bottom:62px; }
  }


  /* FINAL POLISH: use artwork itself, no duplicate visible top UI */
  .artTop {
    top:calc(env(safe-area-inset-top) + 18px) !important;
    left:0 !important;
    right:0 !important;
    height:72px !important;
    pointer-events:none;
  }
  .artProfile {
    position:absolute !important;
    left:34px !important;
    top:0 !important;
    width:238px !important;
    height:64px !important;
    min-height:0 !important;
    padding:0 !important;
    border:0 !important;
    background:transparent !important;
    box-shadow:none !important;
    pointer-events:auto;
  }
  .artAvatar, .artOnline { display:none !important; }
  .artPlayerName {
    position:absolute;
    left:58px;
    top:15px;
    max-width:148px;
    font-size:18px;
    letter-spacing:.03em;
    color:white;
    text-shadow:0 0 10px rgba(255,255,255,.45), 0 0 18px rgba(0,82,255,.55);
  }
  .artEdit {
    position:absolute !important;
    right:-6px !important;
    top:10px !important;
    width:40px !important;
    height:40px !important;
    border:0 !important;
    background:rgba(0,82,255,.001) !important;
    box-shadow:none !important;
    color:transparent !important;
    pointer-events:auto;
  }
  .artHow {
    position:absolute !important;
    right:22px !important;
    top:10px !important;
    width:48px !important;
    height:48px !important;
    border:0 !important;
    background:rgba(0,82,255,.001) !important;
    box-shadow:none !important;
    color:transparent !important;
    pointer-events:auto;
  }
  .artClickPlay {
    animation:artPlayPulse 2.2s ease-in-out infinite;
  }
  @keyframes artPlayPulse {
    0%,100% { filter:drop-shadow(0 0 0 rgba(0,200,255,0)); transform:scale(1); }
    50% { filter:drop-shadow(0 0 16px rgba(0,220,255,.60)); transform:scale(1.018); }
  }

  /* PLAY / SETTINGS sub screens now share the premium arena mood */
  .screen.artSubScreen {
    padding:0 !important;
    overflow:hidden !important;
    background:#02040a !important;
  }
  .artSubBg {
    position:absolute;
    inset:0;
    background-image:
      linear-gradient(180deg, rgba(0,0,0,.52), rgba(0,0,0,.62)),
      url("/mobile-lobby.png");
    background-size:cover;
    background-position:center center;
    filter:saturate(1.08);
  }
  .artSubPage {
    position:relative;
    z-index:2;
    min-height:100%;
    max-width:430px;
    margin:0 auto;
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:14px;
    padding:calc(env(safe-area-inset-top) + 18px) 22px calc(env(safe-area-inset-bottom) + 18px);
  }
  .artSubTitle {
    text-align:center;
    font-size:46px;
    line-height:.9;
    font-weight:1000;
    font-style:italic;
    letter-spacing:.08em;
    color:#ffffff;
    text-shadow:0 0 18px rgba(255,255,255,.55), 0 0 42px rgba(0,82,255,.95);
    margin-bottom:8px;
  }
  .artModeGrid { display:grid; gap:12px; }
  .artModeBtn {
    min-height:82px;
    border-radius:26px;
    border:1px solid rgba(92,215,255,.58);
    background:linear-gradient(180deg, rgba(0,39,105,.78), rgba(0,9,28,.72));
    box-shadow:0 0 24px rgba(0,82,255,.32), inset 0 0 24px rgba(0,132,255,.14);
    color:white;
    text-align:left;
    padding:0 20px;
    font-weight:1000;
    touch-action:manipulation;
  }
  .artModeBtn strong { display:block; font-size:20px; letter-spacing:.10em; }
  .artModeBtn span { display:block; margin-top:7px; font-size:10px; color:rgba(128,231,255,.78); letter-spacing:.14em; }
  .artModeBtn.primary {
    background:linear-gradient(180deg, rgba(0,102,255,.82), rgba(0,19,68,.78));
    box-shadow:0 0 34px rgba(0,132,255,.48), inset 0 0 26px rgba(98,220,255,.20);
  }
  .artSettingsPanel {
    border-radius:30px;
    padding:16px;
    border:1px solid rgba(92,215,255,.48);
    background:linear-gradient(180deg, rgba(0,28,76,.70), rgba(0,8,24,.72));
    box-shadow:0 0 28px rgba(0,82,255,.30), inset 0 0 26px rgba(0,132,255,.11);
  }
  .artSettingsLabel {
    color:#72e7ff;
    font-size:13px;
    font-weight:1000;
    letter-spacing:.22em;
    margin:0 0 12px 3px;
  }
  .artTwoGrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .artTwoGrid .region, .artTwoGrid .toggleBtn {
    width:100%;
    min-height:60px;
    border-radius:22px;
    border:1px solid rgba(255,255,255,.13);
    background:rgba(255,255,255,.07);
    color:white;
    font-weight:1000;
    letter-spacing:.10em;
  }
  .artTwoGrid .region.selected, .artTwoGrid .toggleBtn.on {
    border-color:#5ee7ff;
    background:linear-gradient(180deg, rgba(0,108,255,.66), rgba(0,82,255,.22));
    box-shadow:0 0 22px rgba(0,200,255,.34);
  }
  .artBackBtn {
    min-height:56px;
    border-radius:22px;
    border:1px solid rgba(92,215,255,.38);
    background:rgba(0,8,25,.66);
    color:#86eaff;
    font-size:13px;
    font-weight:1000;
    letter-spacing:.22em;
    box-shadow:0 0 20px rgba(0,82,255,.22);
  }
  .artModeBtn:active, .artBackBtn:active, .artTwoGrid button:active { transform:scale(.975); }



  /* LOBBY FIXES: cleaner username + room code display */
  .artTop {
    top:calc(env(safe-area-inset-top) + 14px) !important;
    left:18px !important;
    right:18px !important;
    height:54px !important;
    pointer-events:none;
  }
  .artProfile {
    position:relative !important;
    left:auto !important;
    top:auto !important;
    width:auto !important;
    max-width:235px !important;
    height:46px !important;
    padding:0 14px !important;
    border:1px solid rgba(107,219,255,.42) !important;
    border-radius:999px !important;
    background:linear-gradient(180deg, rgba(4,24,64,.72), rgba(0,8,25,.46)) !important;
    box-shadow:0 0 22px rgba(0,132,255,.28), inset 0 0 18px rgba(255,255,255,.05) !important;
    backdrop-filter:blur(10px);
    display:flex !important;
    align-items:center !important;
    gap:8px !important;
    pointer-events:auto;
  }
  .artProfile:before {
    content:"";
    width:10px;
    height:10px;
    border-radius:999px;
    background:#42ff9c;
    box-shadow:0 0 12px rgba(66,255,156,.8);
    flex:0 0 auto;
  }
  .artAvatar, .artOnline { display:none !important; }
  .artPlayerName {
    position:static !important;
    max-width:160px !important;
    font-size:15px !important;
    line-height:1 !important;
    letter-spacing:.08em !important;
    color:#ecfbff !important;
    text-shadow:0 0 12px rgba(0,200,255,.55) !important;
  }
  .artEdit {
    position:static !important;
    width:24px !important;
    height:24px !important;
    border:1px solid rgba(107,219,255,.28) !important;
    border-radius:999px !important;
    background:rgba(0,82,255,.14) !important;
    color:#9aeaff !important;
    font-size:12px !important;
    box-shadow:none !important;
    pointer-events:auto;
    flex:0 0 auto;
  }
  .artHow {
    position:relative !important;
    right:auto !important;
    top:auto !important;
    width:46px !important;
    height:46px !important;
    border:1px solid rgba(107,219,255,.42) !important;
    border-radius:999px !important;
    background:linear-gradient(180deg, rgba(4,24,64,.72), rgba(0,8,25,.46)) !important;
    color:#9aeaff !important;
    font-size:20px !important;
    box-shadow:0 0 22px rgba(0,132,255,.24), inset 0 0 18px rgba(255,255,255,.05) !important;
    backdrop-filter:blur(10px);
    pointer-events:auto;
  }
  .roomCodeBox {
    display:none;
    margin-top:14px;
    padding:16px;
    border-radius:24px;
    border:1px solid rgba(94,231,255,.42);
    background:linear-gradient(180deg, rgba(0,82,255,.22), rgba(0,8,25,.62));
    box-shadow:0 0 28px rgba(0,132,255,.22), inset 0 0 22px rgba(255,255,255,.04);
    text-align:center;
  }
  .roomCodeBox.active { display:block; }
  .roomCodeLabel {
    color:rgba(255,255,255,.58);
    font-size:10px;
    font-weight:1000;
    letter-spacing:.24em;
  }
  .roomCodeValue {
    margin-top:8px;
    color:#eafcff;
    font-size:34px;
    line-height:1;
    font-weight:1000;
    letter-spacing:.16em;
    text-shadow:0 0 18px rgba(0,200,255,.72);
  }
  .copyRoomBtn {
    margin-top:12px;
    width:100%;
    min-height:46px;
    border-radius:18px;
    border:1px solid rgba(94,231,255,.38);
    background:rgba(0,82,255,.28);
    color:#9aeaff;
    font-size:12px;
    font-weight:1000;
    letter-spacing:.18em;
  }


  /* === HOTFIX: clean single username bar + stable room code === */
  #menuScreen.artworkMenu {
    overflow:hidden !important;
    touch-action:manipulation;
  }
  .artTop {
    top:calc(env(safe-area-inset-top) + 12px) !important;
    left:14px !important;
    right:14px !important;
    height:58px !important;
    display:flex !important;
    align-items:center !important;
    justify-content:space-between !important;
    gap:8px !important;
    pointer-events:none !important;
    z-index:20 !important;
  }
  .artProfile {
    position:relative !important;
    left:auto !important;
    top:auto !important;
    width:min(262px, calc(100% - 64px)) !important;
    height:52px !important;
    min-height:52px !important;
    border-radius:999px !important;
    border:1px solid rgba(64,184,255,.72) !important;
    background:linear-gradient(90deg, rgba(1,15,42,.96), rgba(0,7,24,.88)) !important;
    box-shadow:0 0 22px rgba(0,82,255,.44), inset 0 0 22px rgba(0,132,255,.14) !important;
    padding:6px 9px !important;
    display:flex !important;
    align-items:center !important;
    gap:9px !important;
    overflow:hidden !important;
    pointer-events:auto !important;
    backdrop-filter:blur(10px);
  }
  .artProfile:before {
    content:"";
    position:absolute;
    inset:1px;
    border-radius:999px;
    background:linear-gradient(90deg, rgba(255,255,255,.08), transparent 52%);
    pointer-events:none;
  }
  .artAvatar {
    display:flex !important;
    width:38px !important;
    height:38px !important;
    border-radius:999px !important;
    flex:0 0 auto !important;
    align-items:center !important;
    justify-content:center !important;
    background:radial-gradient(circle at 32% 22%, #fff, #9fd0ff 18%, #0052ff 58%, #061a4b 100%) !important;
    box-shadow:0 0 20px rgba(0,132,255,.86) !important;
    color:white !important;
    font-size:21px !important;
    font-weight:1000 !important;
    font-style:italic !important;
  }
  .artPlayerName {
    position:relative !important;
    left:auto !important;
    top:auto !important;
    max-width:145px !important;
    color:#fff !important;
    font-size:16px !important;
    line-height:1 !important;
    font-weight:1000 !important;
    letter-spacing:.04em !important;
    white-space:nowrap !important;
    overflow:hidden !important;
    text-overflow:ellipsis !important;
    text-shadow:0 0 10px rgba(255,255,255,.45), 0 0 18px rgba(0,132,255,.65) !important;
  }
  .artOnline {
    display:block !important;
    margin-top:5px !important;
    color:#38ff7f !important;
    font-size:9px !important;
    font-weight:1000 !important;
    letter-spacing:.20em !important;
    text-shadow:0 0 10px rgba(56,255,127,.55) !important;
  }
  .artEdit {
    position:relative !important;
    right:auto !important;
    top:auto !important;
    margin-left:auto !important;
    width:30px !important;
    height:30px !important;
    flex:0 0 auto !important;
    border-radius:999px !important;
    border:1px solid rgba(107,219,255,.38) !important;
    background:rgba(0,82,255,.16) !important;
    color:#9aeaff !important;
    font-size:13px !important;
    box-shadow:inset 0 0 12px rgba(0,132,255,.12) !important;
    pointer-events:auto !important;
  }
  .artHow {
    position:relative !important;
    right:auto !important;
    top:auto !important;
    width:52px !important;
    height:52px !important;
    border:0 !important;
    background:rgba(0,82,255,.001) !important;
    color:transparent !important;
    box-shadow:none !important;
    pointer-events:auto !important;
    flex:0 0 auto !important;
  }
  @media (max-width:380px) {
    .artProfile { width:min(236px, calc(100% - 60px)) !important; }
    .artPlayerName { max-width:122px !important; font-size:15px !important; }
    .artAvatar { width:34px !important; height:34px !important; font-size:19px !important; }
  }


  /* FINAL FIX: remove baked artwork header + clean real username */
  .artHeaderMask {
    position:absolute;
    z-index:4;
    left:0; right:0; top:0;
    height:calc(env(safe-area-inset-top) + 96px);
    pointer-events:none;
    background:linear-gradient(180deg, rgba(0,3,14,.98) 0%, rgba(0,6,20,.90) 55%, rgba(0,6,20,.35) 82%, transparent 100%);
    box-shadow:0 18px 42px rgba(0,0,0,.34);
    backdrop-filter:blur(3px);
  }
  .artTop {
    top:calc(env(safe-area-inset-top) + 12px) !important;
    left:16px !important;
    right:16px !important;
    height:46px !important;
    z-index:30 !important;
    pointer-events:none !important;
  }
  .artProfile {
    width:min(232px, calc(100% - 68px)) !important;
    height:46px !important;
    min-height:46px !important;
    padding:0 10px 0 15px !important;
    border-radius:999px !important;
    border:1px solid rgba(95,205,255,.64) !important;
    background:linear-gradient(90deg, rgba(2,18,48,.92), rgba(0,8,26,.72)) !important;
    box-shadow:0 0 24px rgba(0,82,255,.40), inset 0 0 20px rgba(0,132,255,.12) !important;
    backdrop-filter:blur(12px);
    display:flex !important;
    align-items:center !important;
    gap:8px !important;
    pointer-events:auto !important;
  }
  .artProfile:before {
    content:"" !important;
    position:static !important;
    width:8px !important;
    height:8px !important;
    border-radius:999px !important;
    flex:0 0 auto !important;
    background:#35ff92 !important;
    box-shadow:0 0 12px rgba(53,255,146,.86) !important;
  }
  .artAvatar, .artOnline { display:none !important; }
  .artPlayerName {
    position:relative !important;
    left:auto !important;
    top:auto !important;
    max-width:154px !important;
    color:#f3fbff !important;
    font-size:16px !important;
    line-height:1 !important;
    font-weight:1000 !important;
    letter-spacing:.06em !important;
    white-space:nowrap !important;
    overflow:hidden !important;
    text-overflow:ellipsis !important;
    text-shadow:0 0 12px rgba(0,174,255,.68) !important;
  }
  .artEdit {
    position:relative !important;
    margin-left:auto !important;
    width:28px !important;
    height:28px !important;
    border-radius:999px !important;
    border:1px solid rgba(95,205,255,.36) !important;
    background:rgba(0,82,255,.14) !important;
    color:#a9ecff !important;
    font-size:12px !important;
    box-shadow:inset 0 0 12px rgba(0,132,255,.14) !important;
    pointer-events:auto !important;
  }
  .artHow {
    position:relative !important;
    width:46px !important;
    height:46px !important;
    border-radius:999px !important;
    border:1px solid rgba(95,205,255,.56) !important;
    background:linear-gradient(180deg, rgba(2,18,48,.82), rgba(0,8,26,.62)) !important;
    color:#c6f4ff !important;
    font-size:20px !important;
    box-shadow:0 0 20px rgba(0,82,255,.28), inset 0 0 14px rgba(0,132,255,.10) !important;
    pointer-events:auto !important;
    flex:0 0 auto !important;
  }
  @media (max-width:380px) {
    .artProfile { width:min(220px, calc(100% - 62px)) !important; }
    .artPlayerName { max-width:134px !important; font-size:15px !important; }
  }



  /* PREMIUM VS AI DIFFICULTY SCREEN */
  .premiumDiffPage { min-height:100%; max-width:430px; margin:0 auto; display:flex; flex-direction:column; justify-content:center; gap:16px; padding:calc(env(safe-area-inset-top) + 16px) 0 calc(env(safe-area-inset-bottom) + 16px); }
  .premiumDiffTitle { text-align:center; font-size:38px; line-height:.92; font-weight:1000; letter-spacing:.08em; color:#f7fbff; text-shadow:0 0 22px rgba(0,174,255,.85), 0 0 44px rgba(0,82,255,.55); }
  .premiumDiffSub { text-align:center; color:#85dfff; font-size:10px; font-weight:1000; letter-spacing:.32em; text-indent:.32em; }
  .premiumDiffOrb { position:relative; height:150px; border-radius:34px; border:1px solid rgba(0,160,255,.28); background:radial-gradient(circle at 50% 45%, rgba(0,82,255,.42), rgba(0,12,36,.68) 48%, rgba(0,0,0,.38) 100%); box-shadow:0 0 36px rgba(0,82,255,.22), inset 0 0 42px rgba(0,136,255,.10); overflow:hidden; }
  .premiumDiffOrb:before { content:""; position:absolute; left:50%; top:50%; width:190px; height:74px; transform:translate(-50%,-50%) rotate(-10deg); border-radius:50%; border:1px solid rgba(130,220,255,.26); box-shadow:0 0 28px rgba(0,174,255,.20); }
  .premiumDiffOrb:after { content:""; position:absolute; left:50%; top:50%; width:76px; height:76px; margin:-38px 0 0 -38px; border-radius:999px; background:radial-gradient(circle at 32% 22%, #fff, #d8e7ff 18%, #0052ff 58%, #031741 100%); box-shadow:0 0 38px rgba(0,132,255,.95), 0 18px 38px rgba(0,0,0,.50); animation:floatBall 2.4s ease-in-out infinite; }
  .premiumDiffGrid { display:grid; grid-template-columns:1fr; gap:12px; }
  .premiumDiffBtn { min-height:78px; border-radius:26px; border:1px solid rgba(120,210,255,.18); background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.022)); color:white; text-align:left; padding:0 18px; display:grid; grid-template-columns:1fr auto; align-items:center; box-shadow:0 0 24px rgba(0,82,255,.12), inset 0 0 22px rgba(255,255,255,.018); touch-action:manipulation; }
  .premiumDiffBtn strong { display:block; font-size:20px; font-weight:1000; letter-spacing:.12em; }
  .premiumDiffBtn span { display:block; margin-top:6px; font-size:9px; color:rgba(210,240,255,.55); font-weight:1000; letter-spacing:.18em; }
  .premiumDiffBtn em { font-style:normal; color:#60d8ff; font-size:28px; text-shadow:0 0 18px rgba(0,174,255,.75); }
  .premiumDiffBtn.selected { border-color:rgba(73,190,255,.78); background:linear-gradient(180deg,rgba(0,82,255,.42),rgba(0,82,255,.13)); box-shadow:0 0 34px rgba(0,132,255,.36), inset 0 0 28px rgba(0,174,255,.10); }
  .premiumStartBtn { min-height:72px; border:0; border-radius:26px; background:linear-gradient(180deg,#28a8ff,#0052ff 60%,#04236b); color:white; font-size:21px; font-weight:1000; letter-spacing:.18em; box-shadow:0 0 38px rgba(0,82,255,.58), inset 0 2px 0 rgba(255,255,255,.25); clip-path:polygon(7% 0,93% 0,100% 50%,93% 100%,7% 100%,0 50%); }


  /* === BUGFIX FINAL PATCH === */
  .artTop { gap:8px !important; }
  .artProfile { min-height:50px !important; padding:7px 12px !important; }
  .artEdit { display:none !important; }
  .artPlayerName { font-size:17px !important; }
  .artOnline { font-size:9px !important; opacity:.88 !important; }
  #difficultyScreen { display:none; }
  #difficultyScreen.active { display:block !important; }
  #difficultyScreen .artSubBg { z-index:0 !important; pointer-events:none !important; }
  .premiumDiffPage {
    position:relative !important;
    z-index:3 !important;
    min-height:100dvh !important;
    max-width:430px !important;
    margin:0 auto !important;
    display:flex !important;
    flex-direction:column !important;
    justify-content:center !important;
    gap:16px !important;
    padding:calc(env(safe-area-inset-top) + 18px) 22px calc(env(safe-area-inset-bottom) + 18px) !important;
  }
  .premiumDiffBtn {
    display:grid !important;
    opacity:1 !important;
    visibility:visible !important;
    pointer-events:auto !important;
  }


  /* === PATCH: online leave warning + in-game username modal + VS AI polish === */
  .artClickPlay,
  .bigPlay,
  .mobileMegaPlay,
  #playBtn {
    filter:drop-shadow(0 0 18px rgba(0,220,255,.88)) drop-shadow(0 0 42px rgba(0,82,255,.86)) !important;
    box-shadow:0 0 34px rgba(0,174,255,.95), 0 0 78px rgba(0,82,255,.78), 0 0 128px rgba(34,211,238,.40), inset 0 2px 0 rgba(255,255,255,.34) !important;
  }
  @keyframes artPlayPulse {
    0%,100% { filter:drop-shadow(0 0 16px rgba(0,200,255,.55)) drop-shadow(0 0 34px rgba(0,82,255,.55)); transform:scale(1); }
    50% { filter:drop-shadow(0 0 30px rgba(0,240,255,.98)) drop-shadow(0 0 72px rgba(0,82,255,.92)); transform:scale(1.03); }
  }
  #difficultyScreen .premiumDiffOrb:after { display:none !important; }
  #difficultyScreen .premiumDiffOrb {
    height:118px !important;
    background:radial-gradient(circle at 50% 50%, rgba(0,82,255,.30), rgba(0,12,36,.88) 54%, rgba(0,0,0,.62) 100%) !important;
  }
  #difficultyScreen .premiumDiffBtn,
  #difficultyScreen .artModeBtn,
  #difficultyScreen .mobileOptionPanel {
    background:#06152e !important;
    opacity:1 !important;
    backdrop-filter:none !important;
    box-shadow:0 0 24px rgba(0,82,255,.28), inset 0 0 22px rgba(0,132,255,.08) !important;
  }
  #difficultyScreen .premiumDiffBtn.selected {
    background:#07347a !important;
    box-shadow:0 0 36px rgba(0,174,255,.42), inset 0 0 26px rgba(98,220,255,.14) !important;
  }
  #usernameModal {
    position:absolute;
    inset:0;
    z-index:80;
    display:none;
    align-items:center;
    justify-content:center;
    padding:22px;
    background:rgba(0,0,0,.68);
    backdrop-filter:blur(10px);
  }
  #usernameModal.active { display:flex; }
  .usernameModalCard {
    width:min(100%,390px);
    border-radius:34px;
    padding:22px;
    border:1px solid rgba(94,231,255,.48);
    background:linear-gradient(180deg, rgba(3,24,64,.96), rgba(0,5,18,.96));
    box-shadow:0 0 54px rgba(0,132,255,.42), inset 0 0 32px rgba(255,255,255,.045);
  }
  .usernameModalTitle {
    text-align:center;
    font-size:31px;
    line-height:.95;
    font-weight:1000;
    letter-spacing:.10em;
    color:#fff;
    text-shadow:0 0 24px rgba(0,200,255,.86);
    margin-bottom:10px;
  }
  .usernameModalSub {
    text-align:center;
    color:rgba(159,235,255,.70);
    font-size:10px;
    font-weight:1000;
    letter-spacing:.22em;
    margin-bottom:16px;
  }
  .usernameModalForm {
    display:grid;
    grid-template-columns:1fr;
    gap:12px;
  }
  #usernameInput {
    height:66px !important;
    border-radius:24px !important;
    font-size:22px !important;
    letter-spacing:.16em !important;
    background:rgba(255,255,255,.09) !important;
    border:1px solid rgba(94,231,255,.34) !important;
    box-shadow:inset 0 0 22px rgba(0,132,255,.10) !important;
  }
  #saveNameBtn, #usernameCancelBtn {
    height:60px !important;
    border-radius:22px !important;
    font-size:14px !important;
    font-weight:1000 !important;
    letter-spacing:.18em !important;
    touch-action:manipulation;
  }
  #saveNameBtn {
    width:100% !important;
    background:linear-gradient(180deg,#7ee9ff,#0052ff 68%,#04236b) !important;
    color:white !important;
    box-shadow:0 0 30px rgba(0,174,255,.48) !important;
  }
  #usernameCancelBtn {
    width:100%;
    border:1px solid rgba(255,255,255,.14);
    background:rgba(255,255,255,.07);
    color:rgba(255,255,255,.78);
  }
  #nameWarn {
    min-height:20px !important;
    font-size:11px !important;
    letter-spacing:.15em !important;
    margin-top:0 !important;
  }


  /* === PATCH: main menu PLAY / SETTINGS alignment on mobile === */
  .artClickPlay,
  #playBtn.artClickPlay {
    left:6.2% !important;
    right:6.2% !important;
    bottom:126px !important;
    height:96px !important;
    border:0 !important;
    border-radius:0 !important;
    background:transparent !important;
    box-shadow:none !important;
    filter:none !important;
    outline:none !important;
    clip-path:polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%) !important;
  }

  .artClickPlay:before,
  #playBtn.artClickPlay:before {
    content:"";
    position:absolute;
    inset:8px 12px;
    pointer-events:none;
    border-radius:24px;
    clip-path:polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%);
    border:1px solid rgba(90,230,255,.50);
    box-shadow:
      0 0 18px rgba(0,210,255,.52),
      0 0 42px rgba(0,82,255,.34),
      inset 0 0 18px rgba(0,132,255,.20);
    opacity:.58;
  }

  .artClickSettings,
  #settingsBtn.artClickSettings {
    left:31% !important;
    right:31% !important;
    bottom:58px !important;
    height:58px !important;
    border:0 !important;
    background:transparent !important;
    box-shadow:none !important;
    filter:none !important;
    outline:none !important;
  }

  @media (max-height:760px) {
    .artClickPlay,
    #playBtn.artClickPlay {
      bottom:116px !important;
      height:90px !important;
      left:6.5% !important;
      right:6.5% !important;
    }

    .artClickSettings,
    #settingsBtn.artClickSettings {
      bottom:50px !important;
      height:54px !important;
      left:32% !important;
      right:32% !important;
    }
  }

  @media (max-height:700px) {
    .artClickPlay,
    #playBtn.artClickPlay {
      bottom:106px !important;
      height:84px !important;
    }

    .artClickSettings,
    #settingsBtn.artClickSettings {
      bottom:44px !important;
      height:50px !important;
    }
  }


  /* === PATCH: username hidden from main menu; PLAY asks username first === */
  #menuScreen .artProfile,
  #menuScreen #profileTapArea,
  #menuScreen #editNameBtn {
    display:none !important;
    pointer-events:none !important;
  }
  #menuScreen .artTop {
    justify-content:flex-end !important;
  }
  #menuScreen .artHow,
  #howBtnTop {
    margin-left:auto !important;
  }
  #usernameModal {
    z-index:120 !important;
  }
  .usernameModalSub:after {
    content:"";
  }



  /* === PATCH: restore username on main menu === */
  #menuScreen .artProfile,
  #menuScreen #profileTapArea {
    display:flex !important;
    pointer-events:auto !important;
  }
  #menuScreen #editNameBtn,
  #menuScreen .artEdit {
    display:block !important;
    pointer-events:auto !important;
  }
  #menuScreen .artTop {
    justify-content:space-between !important;
  }
  #menuScreen .artHow,
  #howBtnTop {
    margin-left:0 !important;
  }

  /* Full-width player identity: help remains available from the later menu. */
  #menuScreen .artTop { display:block !important; }
  #menuScreen #profileTapArea { width:100% !important; max-width:none !important; }
  #menuScreen #howBtnTop { display:none !important; }


  /* === PATCH: VS AI remove empty orb gap === */
  #difficultyScreen .premiumDiffOrb {
    display:none !important;
    height:0 !important;
    min-height:0 !important;
    margin:0 !important;
    padding:0 !important;
    border:0 !important;
    box-shadow:none !important;
    background:transparent !important;
  }
  #difficultyScreen .premiumDiffOrb:before,
  #difficultyScreen .premiumDiffOrb:after {
    display:none !important;
  }
  #difficultyScreen .premiumDiffPage {
    gap:14px !important;
    justify-content:center !important;
  }
  #difficultyScreen .premiumDiffTitle {
    margin-bottom:8px !important;
  }

  /* === PREMIUM MOBILE IDENTITY + MATCH HUD === */
  #menuScreen .artTop {
    top:calc(env(safe-area-inset-top) + 14px) !important;
    left:14px !important;
    right:14px !important;
    height:56px !important;
  }
  #menuScreen .artProfile {
    height:56px !important;
    max-width:245px !important;
    padding:7px 9px !important;
    border:1px solid rgba(91,209,255,.55) !important;
    border-radius:22px !important;
    background:linear-gradient(120deg,rgba(4,31,78,.88),rgba(0,7,24,.76)) !important;
    box-shadow:0 12px 30px rgba(0,10,42,.48),0 0 24px rgba(0,132,255,.28),inset 0 1px 0 rgba(255,255,255,.12) !important;
    backdrop-filter:blur(16px) saturate(1.35);
  }
  #menuScreen .artProfile:before {
    display:none !important;
  }
  #menuScreen .artAvatar {
    display:grid !important;
    place-items:center !important;
    width:40px !important;
    height:40px !important;
    flex:0 0 40px !important;
    border:1px solid rgba(154,231,255,.55) !important;
    background:radial-gradient(circle at 32% 22%,#fff,#9fd8ff 18%,#087dff 52%,#061942 100%) !important;
    box-shadow:0 0 19px rgba(0,153,255,.72),inset 0 1px 0 rgba(255,255,255,.45) !important;
    color:#fff !important;
    font-size:19px !important;
  }
  #menuScreen .artOnline {
    display:block !important;
    margin-top:5px !important;
    color:#52ffb3 !important;
    font-size:7px !important;
    line-height:1 !important;
    letter-spacing:.18em !important;
    text-shadow:0 0 9px rgba(82,255,179,.5) !important;
  }
  #menuScreen .artPlayerName {
    color:#f3fbff !important;
    font-size:16px !important;
    letter-spacing:.07em !important;
    text-shadow:0 0 14px rgba(93,214,255,.5) !important;
  }
  #menuScreen .artEdit {
    display:grid !important;
    place-items:center !important;
    width:30px !important;
    height:30px !important;
    border:1px solid rgba(91,209,255,.35) !important;
    background:linear-gradient(180deg,rgba(30,132,255,.26),rgba(0,34,92,.32)) !important;
    color:#b9efff !important;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.1) !important;
  }
  #menuScreen .artHow {
    width:50px !important;
    height:50px !important;
    border:1px solid rgba(91,209,255,.52) !important;
    background:linear-gradient(145deg,rgba(6,38,91,.9),rgba(0,8,27,.8)) !important;
    color:#c8f4ff !important;
    box-shadow:0 12px 30px rgba(0,10,42,.42),0 0 22px rgba(0,132,255,.25),inset 0 1px 0 rgba(255,255,255,.12) !important;
    backdrop-filter:blur(16px);
  }
  #hudTop {
    top:calc(env(safe-area-inset-top) + 11px) !important;
    left:12px !important;
    right:12px !important;
    gap:9px !important;
    align-items:stretch !important;
  }
  #hudTop .pill {
    min-height:44px;
    padding:0 13px !important;
    border:1px solid rgba(107,219,255,.36) !important;
    border-radius:17px !important;
    background:linear-gradient(180deg,rgba(4,25,65,.88),rgba(0,5,18,.76)) !important;
    box-shadow:0 10px 28px rgba(0,9,36,.5),inset 0 1px 0 rgba(255,255,255,.09),0 0 18px rgba(0,82,255,.14) !important;
    backdrop-filter:blur(14px) saturate(1.3);
    color:#eafaff !important;
    font-size:10px !important;
    letter-spacing:.14em !important;
  }
  #scoreHud {
    display:flex;
    align-items:center;
    justify-content:center;
    border-color:rgba(93,178,255,.5) !important;
    background:linear-gradient(180deg,rgba(5,31,78,.94),rgba(0,7,24,.82)) !important;
    text-shadow:0 0 12px rgba(103,203,255,.55);
  }
  #menuBtn:before { content:"‹ "; color:#6fe3ff; }
  #restartBtn:after { content:" ↻"; color:#6fe3ff; }
  #roundHint {
    top:calc(env(safe-area-inset-top) + 67px) !important;
    width:max-content;
    left:50% !important;
    right:auto !important;
    transform:translateX(-50%);
    padding:6px 12px;
    border:1px solid rgba(255,255,255,.08);
    border-radius:999px;
    background:rgba(0,8,25,.5);
    color:rgba(190,232,255,.72) !important;
    font-size:8px !important;
    letter-spacing:.24em !important;
    backdrop-filter:blur(8px);
  }

  /* Base-only energy control rendered by React above the legacy game shell. */
  .mobileEnergyCard {
    position:fixed; z-index:110;
    top:calc(env(safe-area-inset-top) + 80px);
    left:max(16px,calc((100vw - 430px)/2 + 16px));
    right:max(16px,calc((100vw - 430px)/2 + 16px));
    min-height:64px; padding:9px 10px;
    display:grid; grid-template-columns:42px minmax(0,1fr) auto; align-items:center; gap:10px;
    border:1px solid rgba(91,209,255,.42); border-radius:22px;
    background:linear-gradient(115deg,rgba(5,29,76,.93),rgba(0,7,24,.9));
    box-shadow:0 14px 38px rgba(0,20,70,.5),0 0 28px rgba(0,132,255,.25),inset 0 1px 0 rgba(255,255,255,.1);
    backdrop-filter:blur(16px) saturate(1.35); font-family:Arial,Helvetica,sans-serif;
    animation:energyCardIn .42s ease-out both;
    pointer-events:auto !important;
    isolation:isolate;
  }
  .mobileEnergyCard.active { border-color:rgba(63,255,177,.48); box-shadow:0 14px 38px rgba(0,20,70,.45),0 0 28px rgba(34,255,167,.2),inset 0 1px 0 rgba(255,255,255,.1); }
  .mobileEnergyCard.required { animation:energyRequired .65s ease both; border-color:rgba(255,190,72,.78); }
  .mobileEnergyOrb { width:42px; height:42px; display:grid; place-items:center; border-radius:15px; color:#b9efff; background:radial-gradient(circle at 34% 24%,#effcff,#168cff 42%,#05245f 72%); box-shadow:0 0 22px rgba(0,153,255,.58),inset 0 1px 0 rgba(255,255,255,.42); font-size:18px; }
  .mobileEnergyCard.active .mobileEnergyOrb { color:#06150f; background:radial-gradient(circle at 34% 24%,#effff8,#3cffad 45%,#08744c 78%); box-shadow:0 0 22px rgba(34,255,167,.48); }
  .mobileEnergyCopy { min-width:0; }
  .mobileEnergyCopy span { display:block; color:#76dcff; font-size:8px; line-height:1; font-weight:1000; letter-spacing:.22em; }
  .mobileEnergyCopy strong { display:block; margin-top:6px; overflow:hidden; color:#f5fbff; font-size:10px; line-height:1.15; font-weight:1000; letter-spacing:.08em; white-space:nowrap; text-overflow:ellipsis; }
  .mobileEnergyCard.active .mobileEnergyCopy span { color:#4dffb9; }
  .mobileEnergyCard button,.mobileEnergyCard a { position:relative; z-index:2; min-width:108px; min-height:40px; padding:0 11px; border:1px solid rgba(107,219,255,.5); border-radius:15px; color:white; background:linear-gradient(180deg,#1687ff,#0052ff 58%,#07327e); box-shadow:0 0 20px rgba(0,82,255,.4),inset 0 1px 0 rgba(255,255,255,.28); font-size:8px; font-weight:1000; letter-spacing:.09em; touch-action:manipulation; pointer-events:auto !important; cursor:pointer; -webkit-user-select:none; user-select:none; display:flex; align-items:center; justify-content:center; text-decoration:none; box-sizing:border-box; }
  .mobileEnergyCard.active button { border-color:rgba(69,255,185,.45); color:#b8ffdf; background:rgba(23,135,89,.35); box-shadow:0 0 18px rgba(34,255,167,.18); }
  .mobileEnergyCard button:disabled { opacity:.9; }
  html[data-username-modal="open"] .mobileEnergyCard { display:none !important; pointer-events:none !important; }
  @keyframes energyCardIn { from{opacity:0;transform:translateY(-8px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes energyRequired { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-7px)} 50%{transform:translateX(7px)} 75%{transform:translateX(-4px)} }
  @media(max-width:360px){ .mobileEnergyCard{grid-template-columns:36px minmax(0,1fr) auto;gap:7px;padding:8px}.mobileEnergyOrb{width:36px;height:36px;border-radius:13px}.mobileEnergyCard button,.mobileEnergyCard a{min-width:90px;padding:0 8px;font-size:7px} }
  /* STORE EXCLUSIVE — COSMIC VAULT */
  #menuScreen.storeCosmicScreen { padding:0 !important; overflow:hidden !important; background:#050713 !important; }
  #menuScreen.storeCosmicScreen > .artLobby { display:none !important; }
  .storeCosmic { position:relative; width:100%; min-height:100dvh; max-width:430px; margin:0 auto; overflow:hidden; padding:calc(env(safe-area-inset-top) + 20px) 20px calc(env(safe-area-inset-bottom) + 92px); display:flex; flex-direction:column; background:radial-gradient(circle at 50% 30%,rgba(139,92,246,.24),transparent 29%),radial-gradient(circle at 84% 8%,rgba(34,211,238,.10),transparent 20%),linear-gradient(180deg,#080a20 0%,#050713 58%,#03040c 100%); }
  .storeCosmic:before { content:""; position:absolute; inset:-10%; opacity:.7; pointer-events:none; will-change:transform,opacity; background-image:radial-gradient(circle at 12% 16%,rgba(255,255,255,.98) 0 1.2px,transparent 1.9px),radial-gradient(circle at 83% 22%,rgba(123,231,255,.94) 0 1.2px,transparent 1.9px),radial-gradient(circle at 31% 67%,rgba(255,255,255,.78) 0 1px,transparent 1.8px),radial-gradient(circle at 73% 75%,rgba(165,115,255,.92) 0 1.2px,transparent 1.9px); background-size:83px 91px,117px 129px,139px 151px,101px 113px; animation:storeStarDrift 13s linear infinite,storeStarTwinkle 2.8s ease-in-out infinite alternate; }
  .storeCosmic:after { content:""; position:absolute; inset:0; pointer-events:none; background:radial-gradient(circle at 50% 26%,rgba(34,211,238,.13),transparent 21%),linear-gradient(110deg,transparent 30%,rgba(139,92,246,.05) 48%,transparent 64%); animation:storeNebula 7s ease-in-out infinite; }
  .storeTop,.storePortal,.storeActions,.storeArenas,.storeNav { position:relative; z-index:2; }
  .storeTop { display:flex; align-items:center; justify-content:space-between; }
  .storeBrand small { display:block; color:rgba(205,205,232,.58); font-size:8px; font-weight:1000; letter-spacing:.34em; }
  .storeBrand strong { display:block; margin-top:6px; color:#fff; font-size:20px; font-weight:1000; letter-spacing:.07em; }
  .storeBrand strong.mobileBaseBrand { font-size:17px; letter-spacing:.055em; background:linear-gradient(95deg,#f7fbff 0%,#9fc4ff 24%,#2474ff 52%,#0052ff 72%,#75e6ff 100%); background-size:180% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; filter:drop-shadow(0 0 8px rgba(0,82,255,.72)) drop-shadow(0 0 18px rgba(34,211,238,.28)); animation:mobileBaseBrandFlow 4.2s ease-in-out infinite alternate; }
  #storeProfileTapArea { display:flex; align-items:center; gap:8px; min-width:90px; min-height:42px; padding:6px 10px 6px 7px; border:1px solid rgba(139,92,246,.34); border-radius:15px; background:linear-gradient(120deg,rgba(139,92,246,.20),rgba(34,211,238,.07)); box-shadow:0 0 22px rgba(139,92,246,.14),inset 0 1px 0 rgba(255,255,255,.08); }
  .storeAvatar { width:29px; height:29px; display:grid; place-items:center; border-radius:10px; color:#fff; font-size:11px; font-weight:1000; background:linear-gradient(135deg,#8b5cf6,#22d3ee); box-shadow:0 0 15px rgba(139,92,246,.48); }
  .storePlayerLabel { color:rgba(255,255,255,.45); font-size:6px; letter-spacing:.18em; }
  #storeProfileName { margin-top:2px; color:#fff; font-size:10px; font-weight:1000; letter-spacing:.12em; }
  .storePortal { height:295px; display:grid; place-items:center; text-align:center; }
  .storeDimension { position:absolute; top:25px; left:0; color:rgba(210,211,239,.64); font-size:7px; font-weight:1000; letter-spacing:.32em; }
  .storeOrbit { position:absolute; top:45px; left:50%; width:176px; height:176px; transform:translateX(-50%); border:1px solid rgba(34,211,238,.75); border-radius:50%; box-shadow:0 0 28px rgba(34,211,238,.18),inset 0 0 34px rgba(139,92,246,.16); animation:storePortalBreath 3.2s ease-in-out infinite; }
  .storeOrbit:before,.storeOrbit:after { content:""; position:absolute; inset:17px -15px; border:1px solid rgba(139,92,246,.62); border-radius:50%; transform:rotate(-19deg) scaleY(.55); }
  .storeOrbit:before { animation:storeRingLeft 8s linear infinite; }
  .storeOrbit:after { inset:29px -7px; border-color:rgba(34,211,238,.42); transform:rotate(58deg) scaleY(.48); animation:storeRingRight 6s linear infinite reverse; }
  .storeCore { position:absolute; top:92px; left:50%; width:88px; height:88px; transform:translateX(-50%); border-radius:50%; will-change:transform,filter; background:radial-gradient(circle at 35% 27%,#fff 0 5%,#49e8ff 9%,#7c3aed 28%,#12123d 59%,#03040d 100%); box-shadow:0 0 24px rgba(34,211,238,.72),0 0 58px rgba(139,92,246,.55); animation:storeWorldFloat 3.4s ease-in-out infinite; }
  .storeCore:before { content:""; position:absolute; inset:-10px; border:1px solid rgba(106,238,255,.38); border-radius:50%; box-shadow:0 0 22px rgba(34,211,238,.24); animation:storeCoreHalo 2.2s ease-in-out infinite; }
  .storeCore:after { content:"↗"; position:absolute; inset:0; display:grid; place-items:center; color:white; font-size:27px; font-weight:1000; }
  .storePortalStatus { position:absolute; top:188px; isolation:isolate; overflow:hidden; display:inline-flex; align-items:center; gap:7px; padding:7px 14px; border:1px solid rgba(96,235,255,.52); border-radius:999px; color:#d9fcff; background:linear-gradient(110deg,rgba(5,13,38,.94),rgba(24,20,67,.92)); box-shadow:0 0 22px rgba(34,211,238,.22),inset 0 1px 0 rgba(255,255,255,.15),inset 0 0 18px rgba(34,211,238,.06); font-size:7px; font-weight:1000; letter-spacing:.22em; text-shadow:0 0 10px rgba(111,239,255,.9); }
  .storePortalStatus:before { content:""; width:6px; height:6px; flex:0 0 auto; border-radius:50%; background:#63ffd1; box-shadow:0 0 7px #63ffd1,0 0 16px rgba(99,255,209,.75); animation:storeStatusLive 1.45s ease-in-out infinite; }
  .storePortalStatus:after { content:""; position:absolute; z-index:-1; inset:-40% auto -40% -45%; width:42%; transform:skewX(-22deg); background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent); animation:storeStatusScan 3.2s ease-in-out infinite; }
  .storePortal h1 { position:absolute; top:217px; margin:0; color:#f7f7ff; font-size:15px; letter-spacing:.29em; text-shadow:0 0 18px rgba(139,92,246,.48); }
  .storePortalTag { position:absolute; top:241px; margin:0; display:flex; align-items:center; gap:7px; padding:8px 12px; border:1px solid rgba(125,143,255,.25); border-radius:999px; background:linear-gradient(100deg,rgba(7,12,35,.78),rgba(37,24,83,.72),rgba(7,12,35,.78)); box-shadow:0 9px 28px rgba(0,0,0,.28),0 0 24px rgba(112,75,255,.12),inset 0 1px 0 rgba(255,255,255,.1); backdrop-filter:blur(10px); animation:storeTagPulse 2.6s ease-in-out infinite; }
  .storePortalTag span { color:#effdff; font-size:7px; font-weight:1000; letter-spacing:.18em; text-shadow:0 0 8px rgba(34,211,238,.8); }
  .storePortalTag span:nth-of-type(2) { color:#d9c6ff; text-shadow:0 0 9px rgba(139,92,246,.9); }
  .storePortalTag i { width:3px; height:3px; border-radius:50%; background:#60eaff; box-shadow:0 0 7px #60eaff; }
  .storeActions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
  #storePlayBtn,#storeOnlineBtn,#storeCreateBtn,#storeJoinBtn { position:relative; width:100%; border-radius:16px; font-family:Arial,Helvetica,sans-serif; font-weight:1000; letter-spacing:.10em; touch-action:manipulation; }
  #storePlayBtn { grid-column:1/-1; height:58px; border:0; color:white; background:linear-gradient(105deg,#7c3aed 0%,#8b5cf6 45%,#22d3ee 100%); box-shadow:0 0 30px rgba(139,92,246,.35),inset 0 1px 0 rgba(255,255,255,.28); font-size:13px; }
  #storePlayBtn small { display:block; margin-top:4px; color:rgba(255,255,255,.72); font-size:6px; letter-spacing:.24em; }
  #storeOnlineBtn,#storeCreateBtn,#storeJoinBtn { min-height:48px; padding:0 5px; border:1px solid rgba(34,211,238,.34); color:#dffcff; background:linear-gradient(110deg,rgba(34,211,238,.07),rgba(139,92,246,.13)); font-size:7px; }
  .storeArenas { margin-top:20px; }
  .storeArenaHead { display:flex; align-items:center; justify-content:space-between; margin-bottom:11px; }
  .storeArenaHead strong { color:#fff; font-size:11px; letter-spacing:.20em; }
  .storeArenaHead span { color:rgba(201,202,231,.48); font-size:7px; letter-spacing:.18em; }
  .storeArenaGrid { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; }
  .storeArena { min-height:112px; padding:8px; border:1px solid rgba(139,92,246,.24); border-radius:16px; color:white; background:linear-gradient(160deg,rgba(139,92,246,.15),rgba(7,9,30,.88)); text-align:left; touch-action:manipulation; }
  .storeArena.selected { border-color:#22d3ee; box-shadow:0 0 18px rgba(34,211,238,.20),inset 0 0 20px rgba(34,211,238,.06); }
  .storeArenaVisual { position:relative; display:block; height:65px; border:1px solid rgba(113,205,255,.38); border-radius:10px; background:radial-gradient(circle at 50% 50%,#fff 0 4px,rgba(139,92,246,.72) 5px,rgba(13,18,50,.8) 34%,#050713 70%); box-shadow:inset 0 0 18px rgba(139,92,246,.24); }
  .storeArenaVisual:before { content:""; position:absolute; inset:14px 9px; border:1px solid rgba(34,211,238,.26); border-radius:50%; transform:scaleY(.48) rotate(-14deg); }
  .storeArena[data-store-arena="soccer"] .storeArenaVisual { background:repeating-linear-gradient(90deg,#0e652c 0 18px,#118039 18px 36px); box-shadow:inset 0 0 20px rgba(0,0,0,.36),0 0 15px rgba(92,255,133,.13); }
  .storeArena[data-store-arena="soccer"] .storeArenaVisual:before { inset:5px; border:1px solid rgba(255,255,255,.82); border-radius:2px; transform:none; background:linear-gradient(90deg,transparent 49.4%,rgba(255,255,255,.82) 49.4% 50.6%,transparent 50.6%); }
  .storeArena[data-store-arena="soccer"] .storeArenaVisual:after { content:""; position:absolute; left:50%; top:50%; width:18px; height:18px; transform:translate(-50%,-50%); border:1px solid rgba(255,255,255,.86); border-radius:50%; box-shadow:0 0 8px rgba(255,255,255,.25); }
  .storeArena strong { display:block; margin-top:8px; font-size:7px; line-height:1.2; letter-spacing:.05em; }
  .storeNav { position:absolute; left:20px; right:20px; bottom:calc(env(safe-area-inset-bottom) + 14px); height:58px; display:grid; grid-template-columns:repeat(4,1fr); border:1px solid rgba(139,92,246,.22); border-radius:17px; background:rgba(8,8,28,.88); backdrop-filter:blur(16px); }
  .storeNav button,.storeNav a { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border:0; color:rgba(222,223,246,.48); background:transparent; font-family:inherit; font-size:6px; font-weight:1000; letter-spacing:.12em; text-decoration:none; touch-action:manipulation; }
  .storeNavIcon { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.8; filter:drop-shadow(0 0 6px currentColor); }
  .storeNav button:first-child { color:#7ff2ff; }
  #storePlayNav { cursor:pointer; }
  #storePlayNav:active { transform:translateY(1px) scale(.96); }
  #feedbackModal { position:absolute; inset:0; z-index:160; display:none; align-items:center; justify-content:center; padding:22px; background:rgba(2,3,14,.82); backdrop-filter:blur(18px) saturate(1.25); }
  #feedbackModal.active { display:flex; animation:feedbackFadeIn .22s ease-out; }
  .feedbackCard { position:relative; width:min(100%,390px); overflow:hidden; padding:24px; border:1px solid rgba(94,234,255,.36); border-radius:30px; background:radial-gradient(circle at 82% 0%,rgba(139,92,246,.26),transparent 34%),linear-gradient(160deg,rgba(12,15,46,.98),rgba(4,6,22,.99)); box-shadow:0 28px 80px rgba(0,0,0,.62),0 0 42px rgba(34,211,238,.14),inset 0 1px 0 rgba(255,255,255,.12); }
  .feedbackCard:before { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(120deg,transparent 20%,rgba(255,255,255,.055),transparent 58%); }
  .feedbackKicker { color:#76efff; font-size:8px; font-weight:1000; letter-spacing:.28em; }
  .feedbackTitle { margin:9px 0 5px; color:white; font-size:27px; font-weight:1000; letter-spacing:.08em; }
  .feedbackSub { margin:0 0 18px; color:rgba(221,226,255,.55); font-size:9px; font-weight:800; line-height:1.55; letter-spacing:.08em; }
  .feedbackGrid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .feedbackField { display:grid; gap:7px; margin-top:11px; }
  .feedbackField label { color:rgba(157,244,255,.72); font-size:7px; font-weight:1000; letter-spacing:.2em; }
  .feedbackField input,.feedbackField select,.feedbackField textarea { width:100%; border:1px solid rgba(124,141,255,.24); border-radius:15px; outline:0; color:white; background:rgba(4,7,27,.78); font:800 11px Arial,sans-serif; box-shadow:inset 0 0 16px rgba(34,211,238,.035); }
  .feedbackField input,.feedbackField select { height:46px; padding:0 13px; }
  .feedbackField textarea { min-height:132px; resize:none; padding:13px; line-height:1.55; }
  .feedbackField input:focus,.feedbackField select:focus,.feedbackField textarea:focus { border-color:#43dff3; box-shadow:0 0 0 3px rgba(34,211,238,.08),inset 0 0 18px rgba(34,211,238,.05); }
  .feedbackActions { display:grid; grid-template-columns:.7fr 1.3fr; gap:9px; margin-top:15px; }
  .feedbackActions button { min-height:50px; border-radius:16px; font-size:9px; font-weight:1000; letter-spacing:.16em; touch-action:manipulation; }
  #feedbackCloseBtn { border:1px solid rgba(255,255,255,.16); color:rgba(255,255,255,.68); background:rgba(255,255,255,.055); }
  #feedbackSendBtn { border:0; color:white; background:linear-gradient(110deg,#7c3aed,#8b5cf6 48%,#22d3ee); box-shadow:0 0 25px rgba(93,91,255,.34),inset 0 1px 0 rgba(255,255,255,.25); }
  #feedbackSendBtn:disabled { opacity:.55; }
  #feedbackStatus { min-height:17px; margin-top:10px; color:#86f7d0; font-size:8px; font-weight:1000; line-height:1.45; letter-spacing:.1em; text-align:center; }
  .feedbackHoney { position:absolute !important; left:-10000px !important; width:1px !important; height:1px !important; opacity:0 !important; pointer-events:none !important; }
  @keyframes storePortalBreath { 0%,100%{transform:translateX(-50%) scale(.98);opacity:.78} 50%{transform:translateX(-50%) scale(1.04);opacity:1} }
  @keyframes storeStarDrift { from{transform:translate3d(-2.5%,-1.8%,0) rotate(0deg)} to{transform:translate3d(2.5%,1.8%,0) rotate(2deg)} }
  @keyframes storeStarTwinkle { 0%{opacity:.48;filter:brightness(.86)} 45%{opacity:.88;filter:brightness(1.24)} 100%{opacity:.63;filter:brightness(1.55)} }
  @keyframes storeNebula { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:.85;transform:scale(1.06)} }
  @keyframes storeRingLeft { from{transform:rotate(-19deg) scaleY(.55)} to{transform:rotate(341deg) scaleY(.55)} }
  @keyframes storeRingRight { from{transform:rotate(58deg) scaleY(.48)} to{transform:rotate(418deg) scaleY(.48)} }
  @keyframes storeWorldFloat { 0%,100%{transform:translateX(-50%) translateY(4px) rotate(-2deg) scale(.97);filter:brightness(.95)} 50%{transform:translateX(-50%) translateY(-11px) rotate(2deg) scale(1.07);filter:brightness(1.16)} }
  @keyframes storeCoreHalo { 0%,100%{transform:scale(.9);opacity:.25} 50%{transform:scale(1.16);opacity:.9} }
  @keyframes storeTagPulse { 0%,100%{opacity:.72;transform:scale(.98)} 50%{opacity:1;transform:scale(1.035)} }
  @keyframes storeStatusLive { 0%,100%{opacity:.45;transform:scale(.72)} 50%{opacity:1;transform:scale(1.18)} }
  @keyframes storeStatusScan { 0%,30%{left:-45%;opacity:0} 48%{opacity:1} 70%,100%{left:112%;opacity:0} }
  @keyframes mobileBaseBrandFlow { from{background-position:0% 50%;filter:drop-shadow(0 0 7px rgba(0,82,255,.58)) drop-shadow(0 0 14px rgba(34,211,238,.18))} to{background-position:100% 50%;filter:drop-shadow(0 0 11px rgba(0,82,255,.9)) drop-shadow(0 0 22px rgba(34,211,238,.34))} }
  @keyframes feedbackFadeIn { from{opacity:0} to{opacity:1} }
  @media(max-height:760px) { .storeCosmic{padding-top:calc(env(safe-area-inset-top) + 12px)} .storePortal{height:252px;transform:scale(.88);margin:-13px 0} .storeArenas{margin-top:13px} .storeArena{min-height:100px} .storeArenaVisual{height:54px} }
  @media(prefers-reduced-motion:reduce) { .storeOrbit{animation-duration:5.5s} .storeOrbit:before{animation-duration:12s} .storeOrbit:after{animation-duration:10s} .storeCore{animation-duration:5.5s} .storeCore:before{animation-duration:4s} .storeCosmic:before{animation-duration:22s,5s} .storeCosmic:after{animation-duration:12s} .storePortalTag{animation-duration:4.5s} }
</style>
<div id="app">
  <div id="noise"></div>

  <div id="usernameModal" aria-hidden="true">
    <div class="usernameModalCard">
      <div class="usernameModalTitle">USERNAME</div>
      <div class="usernameModalSub">CHOOSE YOUR PLAYER NAME</div>
      <div class="usernameModalForm">
        <input id="usernameInput" maxlength="10" placeholder="PLAYER" />
        <button id="saveNameBtn">SAVE</button>
        <button id="usernameCancelBtn">CANCEL</button>
        <div id="nameWarn"></div>
      </div>
    </div>
  </div>
  <div id="feedbackModal" aria-hidden="true">
    <form id="feedbackForm" class="feedbackCard">
      <div class="feedbackKicker">PLAYER SUPPORT</div>
      <div class="feedbackTitle">SEND FEEDBACK</div>
      <p class="feedbackSub">REPORT A BUG, SHARE AN IDEA OR TELL US WHAT THE GAME IS MISSING.</p>
      <div class="feedbackGrid">
        <div class="feedbackField">
          <label for="feedbackType">CATEGORY</label>
          <select id="feedbackType" name="category">
            <option value="Bug Report">BUG REPORT</option>
            <option value="Suggestion">SUGGESTION</option>
            <option value="Gameplay">GAMEPLAY</option>
            <option value="Other">OTHER</option>
          </select>
        </div>
        <div class="feedbackField">
          <label for="feedbackEmail">YOUR EMAIL (OPTIONAL)</label>
          <input id="feedbackEmail" name="email" type="email" maxlength="120" placeholder="YOU@EMAIL.COM" />
        </div>
      </div>
      <div class="feedbackField">
        <label for="feedbackMessage">MESSAGE</label>
        <textarea id="feedbackMessage" name="message" minlength="10" maxlength="1200" placeholder="TELL US WHAT HAPPENED..."></textarea>
      </div>
      <input id="feedbackHoney" class="feedbackHoney" name="_honey" tabindex="-1" autocomplete="off" />
      <div class="feedbackActions">
        <button id="feedbackCloseBtn" type="button">CANCEL</button>
        <button id="feedbackSendBtn" type="submit">SEND MESSAGE</button>
      </div>
      <div id="feedbackStatus" role="status" aria-live="polite"></div>
    </form>
  </div>
  <section id="menuScreen" class="screen active storeCosmicScreen">
    <div class="storeCosmic">
      <div class="storeTop">
        <div class="storeBrand"><strong class="mobileBaseBrand">BASE BOING BATTLE</strong></div>
        <div id="storeProfileTapArea">
          <div class="storeAvatar">M</div>
          <div><div class="storePlayerLabel">PLAYER</div><div id="storeProfileName">MINA</div></div>
        </div>
      </div>
      <div class="storePortal">
        <div class="storeOrbit"></div>
        <div class="storeCore"></div>
        <div class="storePortalStatus">PORTAL ONLINE</div>
        <p class="storePortalTag"><span>DEFLECT</span><i></i><span>OUTPLAY</span><i></i><span>DOMINATE</span></p>
      </div>
      <div class="storeActions">
        <button id="storePlayBtn" aria-label="Play versus AI">PLAY VS AI<small>INSTANT MATCH</small></button>
        <button id="storeOnlineBtn">ONLINE 1V1</button>
        <button id="storeCreateBtn">CREATE ROOM</button>
        <button id="storeJoinBtn">JOIN ROOM</button>
      </div>
      <div class="storeArenas">
        <div class="storeArenaHead"><strong>ARENAS</strong><span>4 STADIUMS</span></div>
        <div class="storeArenaGrid">
          <button class="storeArena selected" data-store-arena="base"><span class="storeArenaVisual"></span><strong>CORE ARENA</strong></button>
          <button class="storeArena" data-store-arena="space"><span class="storeArenaVisual"></span><strong>NEON ORBIT</strong></button>
          <button class="storeArena" data-store-arena="temple"><span class="storeArenaVisual"></span><strong>VOID TEMPLE</strong></button>
          <button class="storeArena" data-store-arena="soccer"><span class="storeArenaVisual"></span><strong>CHAMPIONS PITCH</strong></button>
        </div>
      </div>
      <div class="storeNav">
        <button id="storePlayNav" type="button" aria-label="Open play menu" aria-controls="modeScreen"><svg class="storeNavIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg><span>PLAY</span></button>
        <button id="storeProfileNav" type="button" aria-label="Profile"><svg class="storeNavIcon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4.2 3.3-6.3 7.5-6.3s6.7 2.1 7.5 6.3"/></svg><span>PROFILE</span></button>
        <button id="storeSettingsNav" type="button" aria-label="Settings"><svg class="storeNavIcon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 13.5l1.4 1.1-2 3.4-1.8-.7a7.9 7.9 0 0 1-2.6 1.5l-.3 1.9H9.8l-.3-1.9a7.9 7.9 0 0 1-2.6-1.5l-1.8.7-2-3.4 1.4-1.1a8 8 0 0 1 0-3L3.1 9.4l2-3.4 1.8.7a7.9 7.9 0 0 1 2.6-1.5l.3-1.9h3.9l.3 1.9a7.9 7.9 0 0 1 2.6 1.5l1.8-.7 2 3.4-1.4 1.1a8 8 0 0 1 0 3z"/></svg><span>SETTINGS</span></button>
        <button id="storeFeedbackNav" type="button" aria-label="Feedback"><svg class="storeNavIcon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3z"/><path d="M8 9h8M8 13h5"/></svg><span>FEEDBACK</span></button>
      </div>
    </div>
    <div class="artLobby">
      <div class="artHeaderMask"></div>
      <div class="artTop">
        <div id="profileTapArea" class="artProfile">
          <div class="artAvatar">B</div>
          <div style="min-width:0;flex:1">
            <div id="profileName" class="artPlayerName">@PLAYER</div>
            <div class="artOnline">● BASE PLAYER</div>
          </div>
          <button id="editNameBtn" class="artEdit">✎</button>
        </div>
      </div>

      <button id="playBtn" class="artClickPlay" aria-label="Play"></button>
      <button id="settingsBtn" class="artClickSettings" aria-label="Settings"></button>
    </div>
  </section>


  <section id="settingsScreen" class="screen artSubScreen">
    <div class="artSubBg"></div>
    <div class="artSubPage">
      <div class="artSubTitle">SETTINGS</div>

      <div class="artSettingsPanel">
        <div class="artSettingsLabel">REGION</div>
        <div class="artTwoGrid">
          <button class="region selected" data-region="EU"><strong>EU</strong><span>FRANKFURT</span></button>
          <button class="region" data-region="US"><strong>US</strong><span>VIRGINIA</span></button>
        </div>
      </div>

      <div class="artSettingsPanel">
        <div class="artSettingsLabel">SOUND</div>
        <div class="artTwoGrid">
          <button id="soundToggleBtn" class="toggleBtn on">ON</button>
          <button id="soundOffBtn" class="toggleBtn">OFF</button>
        </div>
      </div>

      <button id="settingsBackBtn" class="artBackBtn">BACK</button>
    </div>
  </section>

  <section id="modeScreen" class="screen artSubScreen">
    <div class="artSubBg"></div>
    <div class="artSubPage">
      <div class="artSubTitle">PLAY</div>

      <div class="artModeGrid">
        <button id="modeAiBtn" class="artModeBtn primary"><strong>VS AI</strong><span>CHOOSE ARENA + DIFFICULTY</span></button>
        <button id="modeOnlineBtn" class="artModeBtn"><strong>1V1 ONLINE</strong><span>RANDOM MATCHMAKING</span></button>
        <button id="modeCreateBtn" class="artModeBtn"><strong>CREATE ROOM</strong><span>PRIVATE ROOM WITH CODE</span></button>
        <button id="modeJoinBtn" class="artModeBtn"><strong>JOIN ROOM</strong><span>ENTER FRIEND ROOM CODE</span></button>
      </div>

      <button id="modeBackBtn" class="artBackBtn">BACK</button>
    </div>
  </section>

  <section id="arenaScreen" class="screen">
    <div class="center">
      <div>
        <div class="titleBadge">SELECT ARENA</div>
        <div class="flowTitle">CHOOSE<br/>MAP</div>
      </div>
      <div class="card">
        <div class="grid">
          <button class="arena selected" data-arena="classic">CLASSIC<small>RETRO GRID</small></button>
          <button class="arena" data-arena="base">CORE ARENA<small>COSMIC VAULT</small></button>
          <button class="arena" data-arena="space">ORBIT<small>SPACE MODE</small></button>
          <button class="arena" data-arena="temple">TEMPLE<small>CHAIN RUNES</small></button>
          <button class="arena" data-arena="soccer">FOOTBALL<small>CHAMPIONS PITCH</small></button>
        </div>
      </div>
      <button id="arenaNextBtn" class="btn">NEXT</button>
      <button id="arenaBackBtn" class="flowBack">BACK</button>
    </div>
  </section>

  <section id="difficultyScreen" class="screen artSubScreen">
    <div class="artSubBg"></div>
    <div class="premiumDiffPage">
      <div>
        <div class="premiumDiffSub">VS AI</div>
        <div class="premiumDiffTitle">SELECT<br/>DIFFICULTY</div>
      </div>
      <div class="premiumDiffOrb"></div>
      <div class="premiumDiffGrid">
        <button class="difficulty premiumDiffBtn" data-difficulty="easy"><div><strong>EASY</strong><span>CHILL TRAINING MODE</span></div><em>Ⅰ</em></button>
        <button class="difficulty premiumDiffBtn selected" data-difficulty="normal"><div><strong>NORMAL</strong><span>BALANCED ARCADE BATTLE</span></div><em>Ⅱ</em></button>
        <button class="difficulty premiumDiffBtn" data-difficulty="hard"><div><strong>HARD</strong><span>FAST REFLEX CHALLENGE</span></div><em>Ⅲ</em></button>
      </div>
      <button id="startAiBtn" class="premiumStartBtn">START MATCH</button>
      <button id="difficultyBackBtn" class="artBackBtn">BACK</button>
    </div>
  </section>

  <section id="joinScreen" class="screen">
    <div class="center">
      <div>
        <div class="titleBadge">JOIN ROOM</div>
        <div class="flowTitle">ENTER<br/>CODE</div>
      </div>
      <div class="card">
        <input id="roomCodeInput" class="roomInput" maxlength="8" placeholder="ROOM CODE" />
        <div id="roomWarn" class="sub" style="margin-top:10px;color:#ff8585"></div>
      </div>
      <button id="joinRoomBtn" class="btn">JOIN ROOM</button>
      <button id="joinBackBtn" class="flowBack">BACK</button>
    </div>
  </section>

  <section id="howScreen" class="screen">
    <div class="center">
      <h1>HOW TO PLAY</h1>
      <div class="card" style="line-height:1.75;color:rgba(255,255,255,.80);font-weight:800">
        Draw lines only on your half of the arena. Deflect the ball past the AI. Each line costs energy. First to 7 wins.
      </div>
      <button id="backHowBtn" class="btn">GOT IT</button>
    </div>
  </section>

  <section id="matchScreen" class="screen">
    <div class="center">
      <div>
        <div class="titleBadge">ONLINE 1V1</div>
        <h1>SEARCHING<br/>OPPONENT</h1>
        <div class="sub">RANDOM MATCHMAKING</div>
      </div>
      <div class="card">
        <div id="matchStatus">CONNECTING SOCKET...</div>
        <div id="roomCodeBox" class="roomCodeBox">
          <div class="roomCodeLabel">ROOM CODE</div>
          <div id="roomCodeValue" class="roomCodeValue">----</div>
          <button id="copyRoomCodeBtn" class="copyRoomBtn">COPY CODE</button>
        </div>
      </div>
      <button id="cancelMatchBtn" class="btn red">CANCEL</button>
    </div>
  </section>

  <section id="gameScreen" class="screen">
    <div id="gameWrap">
      <canvas id="gameCanvas" width="400" height="700"></canvas>
      <div id="goalFlash"></div>
      <div id="roundHint">FIRST TO 7</div>
      <div id="hudTop">
        <button id="menuBtn" class="pill">MENU</button>
        <div id="scoreHud" class="pill">AI 0 ◇ 0 YOU</div>
        <button id="restartBtn" class="pill">RESTART</button>
      </div>
      <div id="overlayText"></div>
      <div id="resultPanel">
        <div id="resultTitle">YOU WIN</div>
        <div id="resultScore" class="sub">AI 0 ◇ 0 YOU</div>
        <button id="playAgainBtn" class="btn">PLAY AGAIN</button>
        <div style="height:10px"></div>
        <button id="resultMenuBtn" class="btn secondary">MAIN MENU</button>
      </div>
    </div>
  </section>
</div>
<script>
(function(){
  var W=400,H=700;
  var arena='base', difficulty='normal', socketRegion='EU', mode='ai';
  var canvas, ctx, raf=0, arenaPaint=null;
  var ball, lines, trail, sparks, score, energy, rallyElapsedSeconds=0, started=false, paused=false, drawing=null, goalLocked=false;
  var MAX_ACTIVE_LINES_PER_SIDE=2;
  var frame=0, lastFrameAt=Date.now(), lastDtScale=1, audioUnlocked=false, soundEnabled=true, lastWallSound=0, lastOnlineScoreTotal=null, lastOnlineRoundKey=null, onlineCountdownTimer=null, onlineBattleTimer=null, onlineRoomClosed=false, onlineServerPlaying=false, activeAudioContexts=[];
  var socket=null, socketReady=false, isHost=false, roleKnown=false, roomCode=null, mobileId='mobile_'+Math.random().toString(16).slice(2,10), onlineTarget={x:200,y:350,vx:1.2,vy:1.8}, onlineStateAt=Date.now();
  var onlineStartState=null;
  var onlineMatchId=null;
  var onlineMatchStartTimer=null;
  var onlineMatchNo=0;
  var onlineLaunchStarted=false;
  var onlineLaunchRoom=null;
  var playerName='PLAYER', rivalName='RIVAL', pendingMode='ai';
  var usernameAfterSave=null;
  var SOCKET_EU='https://base-boing-battle-1.onrender.com';
  var SOCKET_US='https://base-boing-battle-usa.onrender.com';
  function warmSocketRegion(region){
    var url=region==='US'?SOCKET_US:SOCKET_EU;
    try{ fetch(url+'/health',{mode:'cors',cache:'no-store'}).catch(function(){}); }catch(e){}
  }
  setTimeout(function(){ warmSocketRegion(socketRegion); },250);
  function flash(){ var f=$('goalFlash'); var gw=$('gameWrap'); if(f){ f.classList.add('active'); setTimeout(function(){f.classList.remove('active')},220); } if(gw){ gw.classList.add('shake'); setTimeout(function(){gw.classList.remove('shake')},330); } }

  function $(id){ return document.getElementById(id); }
  function cleanName(value){ return String(value||'').replace(/[^a-zA-Z0-9_]/g,'').slice(0,10).toUpperCase(); }
  function loadName(){
    var saved=''; try{ saved=localStorage.getItem('bbb_mobile_username')||''; }catch(e){}
    playerName=cleanName(saved)||'PLAYER';
    var input=$('usernameInput'); if(input) input.value=playerName==='PLAYER'?'':playerName;
    var profile=$('profileName'); if(profile) profile.textContent='@'+playerName;
    var storeProfile=$('storeProfileName'); if(storeProfile) storeProfile.textContent=playerName;
  }
  function openUsernameModal(message, afterSave){
    usernameAfterSave=afterSave||null;
    var modal=$('usernameModal');
    var input=$('usernameInput');
    var warn=$('nameWarn');
    if(input) input.value=playerName==='PLAYER'?'':playerName;
    if(warn) warn.textContent=message||'';
    if(modal){ modal.classList.add('active'); modal.setAttribute('aria-hidden','false'); }
    document.documentElement.setAttribute('data-username-modal','open');
    window.dispatchEvent(new CustomEvent('bbb:username-modal',{detail:{open:true}}));
    setTimeout(function(){ try{ if(input) input.focus(); }catch(e){} },80);
  }
  function closeUsernameModal(){
    var modal=$('usernameModal');
    if(modal){ modal.classList.remove('active'); modal.setAttribute('aria-hidden','true'); }
    document.documentElement.removeAttribute('data-username-modal');
    window.dispatchEvent(new CustomEvent('bbb:username-modal',{detail:{open:false}}));
  }
  function cancelUsernameModal(){
    usernameAfterSave=null;
    closeUsernameModal();
  }
  function openFeedbackModal(){
    var modal=$('feedbackModal');
    var status=$('feedbackStatus');
    var message=$('feedbackMessage');
    if(status) status.textContent='';
    if(modal){ modal.classList.add('active'); modal.setAttribute('aria-hidden','false'); }
    setTimeout(function(){ try{ if(message) message.focus(); }catch(e){} },80);
  }
  function closeFeedbackModal(){
    var modal=$('feedbackModal');
    if(modal){ modal.classList.remove('active'); modal.setAttribute('aria-hidden','true'); }
  }
  async function sendFeedback(e){
    if(e){ e.preventDefault(); e.stopPropagation(); }
    var message=$('feedbackMessage');
    var email=$('feedbackEmail');
    var category=$('feedbackType');
    var honey=$('feedbackHoney');
    var status=$('feedbackStatus');
    var send=$('feedbackSendBtn');
    var text=String(message&&message.value||'').trim();
    if(honey && honey.value) return;
    if(text.length<10){ if(status) status.textContent='PLEASE WRITE AT LEAST 10 CHARACTERS'; return; }
    var lastSent=0; try{ lastSent=Number(localStorage.getItem('bbb_feedback_sent_at')||0); }catch(_){}
    if(Date.now()-lastSent<30000){ if(status) status.textContent='PLEASE WAIT BEFORE SENDING AGAIN'; return; }
    if(send){ send.disabled=true; send.textContent='SENDING...'; }
    if(status) status.textContent='SECURELY SENDING YOUR MESSAGE';
    try{
      var response=await fetch('https://formsubmit.co/ajax/90187fdb47fa0af565e6d745c6d94bb7',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({
          _subject:'Boing Battle '+String(category&&category.value||'Feedback'),
          _template:'table',
          _captcha:'false',
          category:String(category&&category.value||'Feedback'),
          player:playerName,
          email:String(email&&email.value||'').trim(),
          message:text,
          page:window.location.href,
          device:navigator.userAgent
        })
      });
      var data=await response.json().catch(function(){ return {}; });
      if(!response.ok || data.success===false || data.success==='false') throw new Error(String(data.message||'SEND_FAILED'));
      try{ localStorage.setItem('bbb_feedback_sent_at',String(Date.now())); }catch(_){}
      if(status) status.textContent='MESSAGE SENT — THANK YOU';
      if(message) message.value='';
      setTimeout(closeFeedbackModal,1400);
    }catch(error){
      if(status) status.textContent='MESSAGE COULD NOT BE SENT — TRY AGAIN';
    }finally{
      if(send){ send.disabled=false; send.textContent='SEND MESSAGE'; }
    }
  }
  function saveName(){
    var input=$('usernameInput');
    var finalName=cleanName(input&&input.value);
    var warn=$('nameWarn');
    if(!finalName){ if(warn) warn.textContent='ENTER USERNAME FIRST'; openUsernameModal('ENTER USERNAME FIRST'); return false; }
    playerName=finalName;
    try{ localStorage.setItem('bbb_mobile_username', playerName); }catch(e){}
    if(input) input.value=playerName;
    var profile=$('profileName'); if(profile) profile.textContent='@'+playerName;
    var storeProfile=$('storeProfileName'); if(storeProfile) storeProfile.textContent=playerName;
    if(warn) warn.textContent='SAVED';
    var next=usernameAfterSave;
    usernameAfterSave=null;
    setTimeout(function(){
      if(warn && warn.textContent==='SAVED') warn.textContent='';
      closeUsernameModal();
      if(next==='openMode'){ openModeScreen(); }
    },260);
    return true;
  }
  function requireName(){
    var input=$('usernameInput');
    var candidate=cleanName(input&&input.value) || cleanName(playerName);
    if(candidate && candidate!=='PLAYER'){ playerName=candidate; saveName(); return true; }
    openUsernameModal('ENTER USERNAME FIRST');
    return false;
  }
  function displayName(name){ return cleanName(name)||'PLAYER'; }

  function pickRivalName(data){
    data=data||{};
    var candidates=[];
    // Prefer explicit opponent fields from the server.
    candidates.push(data.opponentUsername, data.opponent_username, data.rivalUsername, data.rival_username, data.otherUsername, data.other_username);
    // Fallback for room payloads that include both side names.
    if(data.role==='host' || isHost){ candidates.push(data.guestUsername, data.guest_username, data.guestName, data.guest_name); }
    if(data.role==='guest' || isHost===false){ candidates.push(data.hostUsername, data.host_username, data.hostName, data.host_name); }
    candidates.push(data.player1Username, data.player2Username, data.username2, data.username1);
    for(var i=0;i<candidates.length;i++){
      var n=cleanName(candidates[i]);
      if(n && n!==cleanName(playerName) && n!=='PLAYER') return n;
    }
    return 'RIVAL';
  }
  function updateScoreHud(){
    if(!$('scoreHud')||!score) return;
    var left = mode==='online' ? displayName(rivalName) : 'AI';
    var right = displayName(playerName);
    $('scoreHud').textContent=left+' '+score.ai+' ◇ '+score.player+' '+right;
  }
  function setMatchStatus(v){ var el=$('matchStatus'); if(el) el.textContent=v; }
  function setRoomCodeDisplay(code){
    var box=$('roomCodeBox');
    var value=$('roomCodeValue');
    if(!box || !value) return;
    if(code){ value.textContent=String(code).toUpperCase(); box.classList.add('active'); }
    else { value.textContent='----'; box.classList.remove('active'); }
  }
  function copyRoomCode(){
    if(!roomCode) return;
    try{ navigator.clipboard && navigator.clipboard.writeText(roomCode); setMatchStatus('ROOM '+roomCode+' • CODE COPIED'); }
    catch(e){ setMatchStatus('ROOM '+roomCode+' • SHARE THIS CODE'); }
  }
  function makeRoomCode(){
    var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out='';
    for(var i=0;i<5;i++){ out += chars[Math.floor(Math.random()*chars.length)]; }
    return out;
  }
  function hashString(value){
    value=String(value||'BASEBOING');
    var h=2166136261;
    for(var i=0;i<value.length;i++){
      h^=value.charCodeAt(i);
      h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);
    }
    return Math.abs(h>>>0);
  }
  function arenaFromSeed(seed){
    var list=['classic','base','space','temple'];
    return list[hashString(seed)%list.length];
  }
  function setOnlineArenaForMatch(){
    var previous=arena;
    var seed=(roomCode||'ONLINE')+'_'+onlineMatchNo;
    var picked=arenaFromSeed(seed);
    var salt=0;
    // Deterministic on both clients, but avoids repeating the same arena on Play Again.
    while(picked===previous && salt<8){
      salt++;
      picked=arenaFromSeed(seed+'_ALT_'+salt);
    }
    arena=picked;
    return arena;
  }
  function show(id){
    ['menuScreen','settingsScreen','modeScreen','arenaScreen','difficultyScreen','joinScreen','howScreen','matchScreen','gameScreen'].forEach(function(s){ $(s).classList.remove('active'); });
    $(id).classList.add('active');
  }
  function bindTap(el, fn){
    if(!el) return;
    var last=0;
    var touched=false;

    function run(e){
      unlockAudio();
      var now=Date.now();
      if(now-last<260) return;
      last=now;
      if(e){ e.preventDefault(); e.stopPropagation(); }
      fn(e);
    }

    // Android ghost-click fix:
    // Do not change screens on touchstart/pointerdown. Wait for touchend,
    // otherwise the released finger can hit a button on the newly opened screen.
    el.addEventListener('touchend', function(e){
      touched=true;
      run(e);
      setTimeout(function(){ touched=false; }, 420);
    }, {passive:false});

    el.addEventListener('click', function(e){
      if(touched){
        if(e){ e.preventDefault(); e.stopPropagation(); }
        return;
      }
      run(e);
    }, false);
  }
  function theme(){
    if(arena==='base') return {main:'#8b5cf6', glow:'rgba(139,92,246,.95)', label:'CORE', bg:'#080a20'};
    if(arena==='space') return {main:'#22d3ee', glow:'rgba(34,211,238,.95)', label:'ORBIT', bg:'#02040d'};
    if(arena==='temple') return {main:'#fbbf24', glow:'rgba(251,191,36,.95)', label:'CHAIN', bg:'#201204'};
    if(arena==='soccer') return {main:'#5cff85', glow:'rgba(92,255,133,.95)', label:'PITCH', bg:'#071c0d'};
    return {main:'#22d3ee', glow:'rgba(34,211,238,.95)', label:'CORE', bg:'#020204'};
  }

  function unlockAudio(){ audioUnlocked=true; }
  function syncSoundButton(){
    var b=$('soundToggleBtn'); var off=$('soundOffBtn');
    if(b){ b.textContent='ON'; if(soundEnabled) b.classList.add('on'); else b.classList.remove('on'); }
    if(off){ if(soundEnabled) off.classList.remove('on'); else off.classList.add('on'); }
  }
  function toggleSound(){ soundEnabled=!soundEnabled; try{ localStorage.setItem('bbb_mobile_sound', soundEnabled?'on':'off'); }catch(e){} syncSoundButton(); }
  function loadSound(){ var saved=''; try{ saved=localStorage.getItem('bbb_mobile_sound')||''; }catch(e){} soundEnabled = saved==='off' ? false : true; syncSoundButton(); }
  function playSound(type){
    if(!audioUnlocked || !soundEnabled) return;
    if(onlineRoomClosed) return;
    try{
      var AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass) return;
      var audioCtx=new AudioContextClass();
      activeAudioContexts.push(audioCtx);
      var oscillator=audioCtx.createOscillator();
      var gain=audioCtx.createGain();
      oscillator.connect(gain); gain.connect(audioCtx.destination);
      if(type==='hit'){ oscillator.frequency.value=620; gain.gain.value=.085; try{navigator.vibrate&&navigator.vibrate(18)}catch(e){} }
      if(type==='wall'){ oscillator.frequency.value=260; gain.gain.value=.06; try{navigator.vibrate&&navigator.vibrate(10)}catch(e){} }
      if(type==='goal'){ oscillator.frequency.value=135; gain.gain.value=.12; try{navigator.vibrate&&navigator.vibrate([45,25,45])}catch(e){} }
      oscillator.type='square';
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.24);
      oscillator.stop(audioCtx.currentTime+.25);
      setTimeout(function(){
        try{ audioCtx.close(); }catch(e){}
        activeAudioContexts=activeAudioContexts.filter(function(ctx){ return ctx!==audioCtx; });
      },260);
    }catch(e){}
  }
  function stopAllSounds(){
    try{
      document.querySelectorAll('audio').forEach(function(a){
        try{ a.pause(); a.currentTime=0; }catch(e){}
      });
    }catch(e){}
    try{
      activeAudioContexts.forEach(function(ctx){
        try{ ctx.close(); }catch(e){}
      });
      activeAudioContexts=[];
    }catch(e){}
    try{ if(navigator.vibrate) navigator.vibrate(0); }catch(e){}
  }
  function setOverlay(value){
    var text=$('overlayText');
    text.textContent=value;
    text.classList.remove('pop');
    void text.offsetWidth;
    text.classList.add('pop');
  }

  function clearOnlineCountdown(){
    if(onlineCountdownTimer){ clearTimeout(onlineCountdownTimer); onlineCountdownTimer=null; }
    if(onlineBattleTimer){ clearTimeout(onlineBattleTimer); onlineBattleTimer=null; }
  }


  var onlineClientReadyRoom=null;
  var onlineClientReadyTimers=[];
  var onlineClientReadySent=false;

  function clearClientReadyTimers(){
    try{
      onlineClientReadyTimers.forEach(function(t){ clearTimeout(t); });
      onlineClientReadyTimers=[];
    }catch(e){}
  }

  function emitClientReadyNow(targetRoom){
    try{
      if(!socket || !targetRoom) return;
      if(!roomCode || String(roomCode)!==String(targetRoom)) return;
      if(!$('gameScreen') || !$('gameScreen').classList.contains('active')) return;
      if(onlineClientReadySent) return;

      var payload={
        roomCode:targetRoom,
        role:isHost?'host':'guest',
        platform:'mobile',
        source:'game-screen-visible',
        matchId:onlineMatchId
      };

      socket.emit('client-ready',payload);
      onlineClientReadySent=true;
      clearClientReadyTimers();
    }catch(e){}
  }

  function emitClientReadyWhenGameVisible(){
    try{
      if(!socket || !roomCode) return;

      var targetRoom=String(roomCode);
      if(onlineClientReadyRoom===targetRoom && (onlineClientReadySent || onlineClientReadyTimers.length)) return;
      clearClientReadyTimers();
      onlineClientReadySent=false;

      // Aynı oda için ready sinyalini oyun ekranı gerçekten görünmeden gönderme.
      // Özellikle Android ikinci Create Room'da canvas geç render ettiği için
      // server countdown'u erken başlatıyordu.
      function scheduleEmit(delay){
        var t=setTimeout(function(){
          try{
            if(!roomCode || String(roomCode)!==targetRoom) return;
            if(!$('gameScreen') || !$('gameScreen').classList.contains('active')) return;

            requestAnimationFrame(function(){
              requestAnimationFrame(function(){
                emitClientReadyNow(targetRoom);
              });
            });
          }catch(e){}
        },delay);
        onlineClientReadyTimers.push(t);
      }

      onlineClientReadyRoom=targetRoom;
      // Older Android WebViews can mark the screen active before the canvas is
      // actually painted. Give the first paint enough time before telling the
      // server this player is ready to start the authoritative countdown.
      scheduleEmit(800);
      scheduleEmit(1400);
      scheduleEmit(2200);
    }catch(e){}
  }
  function startOnlineCountdown(roundRaw, serverNowRaw){
    if(!roundRaw) return;

    var key=String(roundRaw);
    if(lastOnlineRoundKey===key) return;
    lastOnlineRoundKey=key;

    clearOnlineCountdown();

    started=false;
    paused=true;
    goalLocked=true;
    onlineServerPlaying=false;

    var serverStart=typeof roundRaw==='number'?roundRaw:new Date(roundRaw).getTime();
    var serverNow=Number(serverNowRaw);
    var localStartAt=(isFinite(serverStart)&&isFinite(serverNow))
      ? Date.now()+(serverStart-serverNow)
      : serverStart;

    var lastText='';

    function tick(){
      var remaining=localStartAt-Date.now();
      var next='';

if(remaining>3000) next='GET READY';
else if(remaining>2000) next='3';
else if(remaining>1000) next='2';
else if(remaining>0) next='1';
else next='BATTLE!';

      if(next!==lastText){
        setOverlay(next);
        lastText=next;
      }

      if(remaining<=0){
        $('overlayText').textContent='';
        started=true;
        paused=false;
        goalLocked=false;
        return;
      }

      onlineCountdownTimer=setTimeout(tick,40);
    }

    tick();
  }
  function resetBall(dir){
    goalLocked=false;
    ball={x:200,y:dir==='up'?525:175,r:8,vx:dir==='up'?1.25:-1.25,vy:dir==='up'?-1.85:1.85};
    lines=[]; trail=[]; sparks=[]; energy=100; rallyElapsedSeconds=0; drawing=null;
  }
  function ensureSocket(cb){
    if(window.io){ connectSocket(cb); return; }
    var script=document.createElement('script');
    script.src='https://cdn.socket.io/4.8.1/socket.io.min.js';
    script.onload=function(){ connectSocket(cb); };
    script.onerror=function(){ setMatchStatus('SOCKET LOAD FAILED'); };
    document.head.appendChild(script);
  }
  function scheduleOnlineStart(state,launchAtRaw,serverNowRaw){
    if(state) onlineStartState=state;
    if(!roomCode) return;

    var activeCode=String(roomCode);

    onlineLaunchStarted=true;
    onlineLaunchRoom=activeCode;

    if(onlineMatchStartTimer){
      try{ clearTimeout(onlineMatchStartTimer); }catch(e){}
      onlineMatchStartTimer=null;
    }

    mode='online';
    pendingMode='onlineMatched';
    onlineRoomClosed=false;
    onlineServerPlaying=false;
    setMatchStatus('');

    var launchAt=Number(launchAtRaw);
    var serverNow=Number(serverNowRaw);
    var delay=(isFinite(launchAt)&&isFinite(serverNow))?Math.max(0,launchAt-serverNow):0;
    onlineMatchStartTimer=setTimeout(function(){
      onlineMatchStartTimer=null;
      try{ if($('gameScreen') && !$('gameScreen').classList.contains('active')) startOnlineMatch(); }catch(e){ try{ startOnlineMatch(); }catch(_){} }
      if(onlineStartState){ try{ applyOnlineState(onlineStartState); }catch(e){} onlineStartState=null; }
    },delay);
  }

  function connectSocket(cb){
    var url=socketRegion==='US'?SOCKET_US:SOCKET_EU;

    if(socket && socket.io && socket.io.uri===url){
      if(socket.connected){
        socketReady=true;
        if(cb) cb();
      } else {
        setMatchStatus('CONNECTING SOCKET...');
        try{ socket.once('connect',function(){ socketReady=true; if(cb) cb(); }); }catch(e){}
        try{ socket.connect(); }catch(e){}
      }
      return;
    }

    if(socket){ try{ socket.disconnect(); }catch(e){} }

    socket=io(url,{
      transports:['websocket','polling'],
      upgrade:true,
      reconnection:true,
      reconnectionAttempts:10,
      reconnectionDelay:500,
      reconnectionDelayMax:2000,
      timeout:10000,
      forceNew:true
    });
    socket.io.uri=url;
    socket.on('connect',function(){ socketReady=true; if(roomCode){ setMatchStatus('JOINING ROOM '+roomCode+'...'); } else { setMatchStatus('CONNECTED • SEARCHING...'); } if(cb) cb(); });
    socket.on('disconnect',function(){ socketReady=false; });

    function sendArenaVoteNow(){
      if(!socket || !roomCode) return;
      try{
        socket.emit('vote-arena',{
          roomCode:roomCode,
          arena:arena,
          role:isHost?'host':'guest',
          platform:'mobile'
        });
      }catch(e){}
    }

    socket.on('arena-vote-start',function(data){
      data=data||{};
      if(data.roomCode || data.room_code){
        roomCode=data.roomCode||data.room_code;
      }
      setMatchStatus('MATCH FOUND • STARTING...');
      sendArenaVoteNow();

      // Do not wait on the matchmaking screen after the server has started arena vote.
      // The first game-state will sync countdown/ball as soon as it arrives.
      scheduleOnlineStart(null,data.launchAt,data.serverNow);
    });

    socket.on('matchmaking-status',function(data){
      if(data && data.status==='searching'){
        if(!roomCode && !onlineLaunchStarted && pendingMode!=='onlineMatched') setMatchStatus('SEARCHING OPPONENT...');
      }
      if(data && data.status==='cancelled'){ setMatchStatus('CANCELLED'); show('menuScreen'); }
    });
    socket.on('match-found',function(data){
      data=data||{};
      mode='online';

      // Random 1v1 has no roomCode before this event.
      // Create Room / Join Room already has roomCode before this event.
      // Use this flag to sync manual rooms without changing the random 1v1 flow.
      var wasManualRoom=!!roomCode;

      roomCode=data.roomCode||data.room_code||roomCode;
      onlineMatchId=data.matchId||onlineMatchId;

      if(onlineLaunchStarted && onlineLaunchRoom===String(roomCode||'')){
        sendArenaVoteNow();

        // If any previous event already marked this room as launching, still
        // force the screen open. Otherwise this client can remain on MATCH FOUND
        // while the other device is already rendering the countdown.
        try{
          if($('gameScreen') && !$('gameScreen').classList.contains('active')){
            startOnlineMatch();
          }
          if(onlineStartState){
            applyOnlineState(onlineStartState);
            onlineStartState=null;
          }
        }catch(e){}
        return;
      }

      // IMPORTANT: never let both mobile clients become host.
      // The server sends role: "host" or "guest". Host uses server coordinates,
      // guest renders a mirrored field so each player still plays from the bottom.
      if(data.role==='host' || data.role==='guest'){
        isHost=(data.role==='host');
        roleKnown=true;
      }
      rivalName=pickRivalName(data);

      onlineMatchNo=0;
      setOnlineArenaForMatch();
      setMatchStatus((isHost?'HOST':'GUEST')+' • MATCH FOUND • '+String(arena).toUpperCase()+' ARENA');
      sendArenaVoteNow();
      setOverlay(isHost?'HOST READY':'GUEST READY');
      pendingMode='onlineMatched';
      onlineStartState=null;

      if(wasManualRoom){
        // Create Room / Join Room should not remain on MATCH FOUND STARTING.
        // Enter game screen immediately and wait there for server countdown.
        if(onlineMatchStartTimer){
          try{ clearTimeout(onlineMatchStartTimer); }catch(e){}
          onlineMatchStartTimer=null;
        }
        onlineLaunchStarted=true;
        onlineLaunchRoom=String(roomCode||'');
        scheduleOnlineStart(data.state||null,data.launchAt,data.serverNow);
        return;
      }

      scheduleOnlineStart(null,data.launchAt,data.serverNow);
    });
    socket.on('room-matched',function(data){
      data=data||{};
      mode='online';
      roomCode=data.roomCode||data.room_code||roomCode;
      onlineMatchId=data.matchId||onlineMatchId;
      if(onlineLaunchStarted && onlineLaunchRoom===String(roomCode||'')){
        if(data.state) onlineStartState=data.state;

        // Manual rooms can receive room-matched after the host is already on
        // the waiting screen. If the launch guard is set but the game screen is
        // not active yet, unlock one time so the host does not stay on
        // MATCH FOUND • STARTING while the guest starts countdown.
        try{
          if($('gameScreen') && !$('gameScreen').classList.contains('active')){
            onlineLaunchStarted=false;
            onlineLaunchRoom=null;
          }
        }catch(e){}

        scheduleOnlineStart(data.state||null,data.launchAt,data.serverNow);
        return;
      }
      // Older/manual room event. Do not force isHost=true here; that was causing
      // both mobile devices to behave like the same side.
      if(data.role==='host' || data.role==='guest'){
        isHost=(data.role==='host');
        roleKnown=true;
      } else if(typeof data.isHost==='boolean'){
        isHost=data.isHost;
        roleKnown=true;
      }
      rivalName=pickRivalName(data);

      onlineMatchNo=0;
      setOnlineArenaForMatch();
      setMatchStatus((isHost?'HOST':'GUEST')+' • MATCH FOUND • '+String(arena).toUpperCase()+' ARENA');
      sendArenaVoteNow();
      pendingMode='onlineMatched';

      // If the room already has countdown/playing state, enter the game screen
      // immediately. This keeps Create Room / Join Room in sync without touching
      // the create-room or join-room button handlers.
      try{
        var rmState=data.state||null;
        var rmPhase=rmState && (rmState.phase||'');
        var rmHasStart=rmState && (rmPhase==='countdown' || rmPhase==='playing' || !!rmState.roundStartAt || !!rmState.round_start_at);
        if(rmHasStart){
          if(onlineMatchStartTimer){
            try{ clearTimeout(onlineMatchStartTimer); }catch(e){}
            onlineMatchStartTimer=null;
          }
          onlineLaunchStarted=true;
          onlineLaunchRoom=String(roomCode||'');
          startOnlineMatch();
          applyOnlineState(rmState);
          onlineStartState=null;
          return;
        }
      }catch(e){}

      scheduleOnlineStart(data.state||null,data.launchAt,data.serverNow);
    });
    function handleRoomCreated(data){
      data=data||{};
      mode='online';
      roomCode=String(data.roomCode||data.room_code||data.code||data.room||roomCode||'').toUpperCase();
      isHost=true;
      roleKnown=true;
      rivalName=pickRivalName(data);
      show('matchScreen');
      if(roomCode){
        setRoomCodeDisplay(roomCode);
        setMatchStatus('ROOM '+roomCode+' • SHARE CODE WITH FRIEND');
      } else {
        setRoomCodeDisplay(null);
        setMatchStatus('ROOM CREATED • WAITING CODE');
      }
    }
    function handleRoomJoined(data){
      data=data||{};

      if(data.error){
        setMatchStatus(String(data.error||'JOIN ROOM FAILED'));
        onlineLaunchStarted=false;
        onlineLaunchRoom=null;
        return;
      }

      mode='online';
      roomCode=String(data.roomCode||data.room_code||roomCode||'').toUpperCase();
      onlineMatchId=data.matchId||onlineMatchId;
      isHost=false;
      roleKnown=true;
      rivalName=pickRivalName(data);
      pendingMode='onlineMatched';
      onlineRoomClosed=false;
      onlineLaunchStarted=true;
      onlineLaunchRoom=String(roomCode||'');

      setRoomCodeDisplay(roomCode||null);
      setMatchStatus('');

      try{
        if(onlineMatchStartTimer){
          clearTimeout(onlineMatchStartTimer);
          onlineMatchStartTimer=null;
        }
      }catch(e){}

      scheduleOnlineStart(data.state||null,data.launchAt,data.serverNow);

      try{
        if(socket && roomCode){
          socket.emit('host-state',{ roomCode:roomCode });
        }
      }catch(e){}
    }
    socket.on('room-created',handleRoomCreated);
    socket.on('created-room',handleRoomCreated);
    socket.on('room-code',handleRoomCreated);
    socket.on('create-room-success',handleRoomCreated);
    socket.on('room-joined',handleRoomJoined);
    socket.on('join-error',function(msg){ setMatchStatus(String(msg||'JOIN ROOM FAILED')); onlineLaunchStarted=false; onlineLaunchRoom=null; });
    socket.on('room-error',function(msg){ setMatchStatus(String(msg||'ROOM ERROR')); onlineLaunchStarted=false; onlineLaunchRoom=null; });
    socket.on('arena-selected',function(data){ if(data && data.arena){ arena=data.arena; } });
    socket.on('game-state',function(state){
      try{
        if(state){
          var phase=state.phase||'';
          var hasCountdown=phase==='countdown' || phase==='playing' || !!state.roundStartAt || !!state.round_start_at;

          if(hasCountdown){
            mode='online';
            onlineRoomClosed=false;

            if(!roomCode && state.roomCode){ roomCode=state.roomCode; }
            if(!roomCode && state.room_code){ roomCode=state.room_code; }

            if(onlineMatchStartTimer){
              try{ clearTimeout(onlineMatchStartTimer); }catch(e){}
              onlineMatchStartTimer=null;
            }

            onlineLaunchStarted=true;
            onlineLaunchRoom=String(roomCode||'manual-room');
            pendingMode='onlineMatched';
            setMatchStatus('');

            if($('gameScreen') && !$('gameScreen').classList.contains('active')){
              startOnlineMatch();
            }
          }
        }
      }catch(e){}

      applyOnlineState(state);
    });
    socket.on('match-start',function(data){
      data=data||{};
      mode='online';
      roomCode=data.roomCode||data.room_code||roomCode;
      onlineMatchId=data.matchId||onlineMatchId;
      if(data.role==='host' || data.role==='guest'){
        isHost=(data.role==='host');
        roleKnown=true;
      }
      rivalName=pickRivalName(data);
      pendingMode='onlineMatched';
      onlineLaunchStarted=true;
      onlineLaunchRoom=String(roomCode||'');
      setMatchStatus('');
      scheduleOnlineStart(data.state||null,data.launchAt,data.serverNow);
    });
    socket.on('remote-line',function(line){ addRemoteLine(line); });
    socket.on('opponent-left',function(){ opponentLeft(); });
    socket.on('opponent-disconnected',function(){ opponentLeft(); });
    socket.on('player-left',function(){ opponentLeft(); });
    socket.on('room-left',function(){ opponentLeft(); });
    socket.on('host-left',function(){ opponentLeft(); });
    socket.on('guest-left',function(){ opponentLeft(); });
    socket.on('room-closed',function(){ opponentLeft(); });
    socket.on('force-lobby',function(){ opponentLeft(); });
    socket.on('left-room',function(){ setMatchStatus('LEFT ROOM'); });
    socket.on('opponent-quit',function(){ opponentLeft(); });
    socket.on('match-cancelled-by-opponent',function(){ opponentLeft(); });
    socket.on('play-again-status',function(data){
      if(data && (data.hostReadyAgain && data.guestReadyAgain || data.ready===true || data.start===true)){
        onlineMatchNo++;
        setOnlineArenaForMatch();
        startOnlineMatch(true);
      } else {
        setOverlay('WAITING RIVAL');
      }
    });
    socket.on('play-again-start',function(data){ onlineMatchNo++; setOnlineArenaForMatch(); startOnlineMatch(true); });
    socket.on('new-match',function(data){ onlineMatchNo++; setOnlineArenaForMatch(); startOnlineMatch(true); });
    socket.on('connect_error',function(){ socketReady=false; setMatchStatus('SOCKET CONNECTION FAILED • RETRYING...'); });
  }

  function requireBaseEnergy(){
    return true;
  }
  function openModeScreen(){
    if(!requireBaseEnergy()) return;
    if(cleanName(playerName)==='' || cleanName(playerName)==='PLAYER'){ openUsernameModal('ENTER USERNAME FIRST','openMode'); return; }
    show('modeScreen');
  }
  function chooseMode(m){
    if(!requireBaseEnergy()){ show('menuScreen'); return; }
    pendingMode=m;
    if(m==='ai'){ show('arenaScreen'); return; }
    if(m==='online'){ startOnlineSearch(); return; }
    if(m==='create'){ createRoom(); return; }
    if(m==='join'){ show('joinScreen'); return; }
  }
  function continueAfterArena(){
    if(pendingMode==='ai'){ show('difficultyScreen'); return; }
    if(pendingMode==='online'){ startOnlineSearch(); return; }
    if(pendingMode==='create'){ createRoom(); return; }
    if(pendingMode==='onlineMatched'){
      try{ if(socket && roomCode){ socket.emit('arena-selected',{ roomCode:roomCode, arena:arena, role:isHost?'host':'guest' }); socket.emit('select-arena',{ roomCode:roomCode, arena:arena, role:isHost?'host':'guest' }); } }catch(e){}
      setMatchStatus('ARENA '+String(arena).toUpperCase()+' SELECTED');
      startOnlineMatch();
      if(onlineStartState){ applyOnlineState(onlineStartState); onlineStartState=null; }
      return;
    }
  }
  function createRoom(){
    if(!requireName()) return;

    try{
      if(socket){
        socket.removeAllListeners();
        socket.disconnect();
      }
    }catch(e){}
    socket=null;
    socketReady=false;

    onlineRoomClosed=false;
    mode='online';
    onlineStartState=null;
    onlineMatchId=null;
    onlineLaunchStarted=false;
    onlineLaunchRoom=null;
    lastOnlineScoreTotal=null;
    lastOnlineRoundKey=null;
    isHost=true;
    roleKnown=true;
    rivalName='RIVAL';

    roomCode=makeRoomCode();
    onlineMatchNo=0;
    setOnlineArenaForMatch();
    show('matchScreen');
    setRoomCodeDisplay(roomCode);
    setMatchStatus('ROOM '+roomCode+' • CREATING...');

    ensureSocket(function(){
      try{
        var payload={
          roomCode:roomCode,
          code:roomCode,
          address:mobileId,
          username:displayName(playerName),
          arena:arena,
          region:socketRegion
        };

        socket.emit('create-room', payload, function(data){
          data=data||{};
          var returned=data.roomCode||data.room_code||data.code||data.room;
          if(returned){
            roomCode=String(returned).toUpperCase();
            setRoomCodeDisplay(roomCode);
          }
          setMatchStatus('ROOM '+roomCode+' • SHARE CODE WITH FRIEND');
        });

        setTimeout(function(){
          if(roomCode){
            setRoomCodeDisplay(roomCode);
            if($('matchScreen').classList.contains('active')){
              setMatchStatus('ROOM '+roomCode+' • SHARE CODE WITH FRIEND');
            }
          }
        }, 1200);
      }
      catch(e){
        setMatchStatus('CREATE ROOM FAILED');
      }
    });
  }
  function joinRoom(){
    if(!requireName()) return;

    var input=$('roomCodeInput');
    var code=cleanName(input&&input.value);
    if(!code){ var w=$('roomWarn'); if(w) w.textContent='ENTER ROOM CODE'; return; }

    try{
      if(socket){
        socket.removeAllListeners();
        socket.disconnect();
      }
    }catch(e){}
    socket=null;
    socketReady=false;

    onlineRoomClosed=false;
    mode='online';
    roomCode=code;
    onlineMatchNo=0;
    setOnlineArenaForMatch();
    onlineStartState=null;
    onlineMatchId=null;
    onlineLaunchStarted=false;
    onlineLaunchRoom=null;
    lastOnlineScoreTotal=null;
    lastOnlineRoundKey=null;
    isHost=false;
    roleKnown=true;
    rivalName='RIVAL';

    show('matchScreen');
    setRoomCodeDisplay(null);
    setMatchStatus('JOINING ROOM '+code+'...');

    ensureSocket(function(){
      try{
        setMatchStatus('JOINING ROOM '+code+'...');
        socket.emit('join-room',{ roomCode:code, address:mobileId, username:displayName(playerName), region:socketRegion },function(data){
          handleRoomJoined(data||{ roomCode:code, role:'guest' });
        });

      }
      catch(e){ setMatchStatus('JOIN ROOM FAILED'); }
    });
  }

  function startOnlineSearch(){
    if(!requireName()) return;

    try{
      if(socket){
        socket.removeAllListeners();
        socket.disconnect();
      }
    }catch(e){}
    socket=null;
    socketReady=false;

    onlineRoomClosed=false;
    mode='online';
    isHost=false;
    roleKnown=false;
    roomCode=null;
    onlineMatchNo=0;
    rivalName='RIVAL';
    onlineStartState=null;
    onlineMatchId=null;
    onlineLaunchStarted=false;
    onlineLaunchRoom=null;
    lastOnlineScoreTotal=null;
    lastOnlineRoundKey=null;

    show('matchScreen');
    setRoomCodeDisplay(null);
    setMatchStatus('CONNECTING SOCKET...');

    ensureSocket(function(){
      var name=displayName(playerName);
      if(!socket || !socket.connected){
        setMatchStatus('CONNECTING SOCKET...');
        try{
          socket.once('connect',function(){
            socket.emit('find-match',{ address:mobileId, username:name, region:socketRegion, platform:'mobile' });
            setMatchStatus('SEARCHING OPPONENT...');
          });
          socket.connect();
        }catch(e){ setMatchStatus('SEARCH FAILED'); }
        return;
      }
      try{
        socket.emit('find-match',{ address:mobileId, username:name, region:socketRegion, platform:'mobile' });
        setMatchStatus('SEARCHING OPPONENT...');
      }catch(e){ setMatchStatus('SEARCH FAILED'); }
    });
  }
  function cancelOnlineSearch(){
    try{ if(socket) socket.emit('cancel-matchmaking',{ address:mobileId }); }catch(e){}
    try{
      if(socket){
        socket.removeAllListeners();
        socket.disconnect();
      }
    }catch(e){}
    socket=null;
    socketReady=false;
    onlineRoomClosed=true;
    onlineStartState=null;
    onlineLaunchStarted=false;
    onlineLaunchRoom=null;
    lastOnlineScoreTotal=null;
    lastOnlineRoundKey=null;
    mode='ai';
    roomCode=null;
    show('menuScreen');
  }
  function startOnlineMatch(forceReset){
    onlineRoomClosed=false;
    // Socket aliases and reconnect syncs may announce the same match more than
    // once. Never reset an already visible match; doing so restarted the local
    // countdown and caused one phone to appear several seconds behind.
    if(!forceReset && $('gameScreen') && $('gameScreen').classList.contains('active') && mode==='online' && roomCode){
      emitClientReadyWhenGameVisible();
      return;
    }
    onlineClientReadyRoom=null;
    onlineClientReadySent=false;
    clearClientReadyTimers();
    // Keep the arena chosen during match-found / arena-selected. Do not re-roll here.
    canvas=$('gameCanvas'); ctx=canvas.getContext('2d'); initArenaPaint();
    score={player:0,ai:0,msg:'',life:0}; lastOnlineScoreTotal=null; lastOnlineRoundKey=null; clearOnlineCountdown(); resetBall('down');
    updateScoreHud();
    $('resultPanel').classList.remove('active');
    if($('playAgainBtn')) $('playAgainBtn').style.display='';
    show('gameScreen'); started=false; paused=true; setOverlay('WAITING');
    if(!raf) loop();

    emitClientReadyWhenGameVisible();
  }
  function applyOnlineState(state){
    if(onlineRoomClosed || mode!=='online' || !roomCode) return;
    if(!state) return;
    if(!ball){ resetBall('down'); }
    // Online arena is locked client-side from roomCode + match number so both sides always render the same map.
    var hostScore=Number(state.host_score!=null?state.host_score:(state.hostScore||0));
    var guestScore=Number(state.guest_score!=null?state.guest_score:(state.guestScore||0));
    if(!score) score={player:0,ai:0,msg:'',life:0};
    var prevPlayer=score.player||0;
    var prevAi=score.ai||0;
    score.player=isHost?hostScore:guestScore;
    score.ai=isHost?guestScore:hostScore;
    updateScoreHud();
    var totalScore=score.player+score.ai;
    if(lastOnlineScoreTotal!==null && totalScore>lastOnlineScoreTotal){
      if(score.player>prevPlayer) setOverlay(displayName(playerName)+' SCORES');
      else if(score.ai>prevAi) setOverlay(displayName(rivalName)+' SCORES');
      energy=100;
      rallyElapsedSeconds=0;
      flash(); playSound('goal');
    }
    lastOnlineScoreTotal=totalScore;
    var bx=Number(state.ball_x!=null?state.ball_x:(state.ball&&state.ball.x)||ball.x);
    var by=Number(state.ball_y!=null?state.ball_y:(state.ball&&state.ball.y)||ball.y);
    var bvx=Number(state.ball_vx!=null?state.ball_vx:(state.ball&&state.ball.vx)||ball.vx);
    var bvy=Number(state.ball_vy!=null?state.ball_vy:(state.ball&&state.ball.vy)||ball.vy);
    onlineTarget.x=bx; onlineTarget.y=isHost?by:H-by; onlineTarget.vx=bvx; onlineTarget.vy=isHost?bvy:-bvy; onlineStateAt=Date.now();
    var phase=state.phase||'';
    if(phase==='countdown'){
      onlineServerPlaying=false;
      started=false; paused=true;
      var roundRaw=state.round_start_at||state.roundStartAt;
      var serverNow=state.serverNow||state.server_now;
      if(roundRaw) startOnlineCountdown(roundRaw, serverNow);
      else setOverlay('3');
    }
    if(phase==='playing'){
      onlineServerPlaying=true;
      if(!onlineCountdownTimer && !onlineBattleTimer){ $('overlayText').textContent=''; }
      started=true; paused=false;
    }
    var winner=state.winner || (hostScore>=7?'host':guestScore>=7?'guest':null);
    if(winner){
      onlineServerPlaying=false;
      started=false; paused=true;
      var youWin=(winner==='host'&&isHost)||(winner==='guest'&&!isHost);
      $('resultTitle').textContent=youWin?'YOU WIN':'RIVAL WINS';
      $('resultTitle').style.color=youWin?theme().main:'#ef4444';
      $('resultScore').textContent=displayName(rivalName)+' '+score.ai+' ◇ '+score.player+' '+displayName(playerName);
      $('resultPanel').classList.add('active');
    }
  }
  function addRemoteLine(line){
    if(onlineRoomClosed || mode!=='online' || !roomCode) return;
    if(!line) return;
    var owner=line.owner||'';
    if((isHost && owner==='host')||(!isHost && owner==='guest')) return;
    var x1=Number(line.x1), y1=Number(line.y1), x2=Number(line.x2), y2=Number(line.y2);
    lines.push({x1:x1,y1:isHost?y1:H-y1,x2:x2,y2:isHost?y2:H-y2,life:50,owner:'ai'});
  }
  function buildLeavePayload(){
    return { roomCode:roomCode, room_code:roomCode, code:roomCode, platform:'mobile', source:'mobile-page', role:isHost?'host':'guest', username:displayName(playerName), reason:'left-game' };
  }
  function notifyLeavingOnline(){
    if(mode==='online' && socket && roomCode){
      var payload=buildLeavePayload();
      try{ socket.emit('leave-room',payload); }catch(e){}
    }
  }
  function opponentLeft(){
    started=false;
    paused=true;
    goalLocked=true;
    onlineRoomClosed=true;
    onlineServerPlaying=false;
    clearOnlineCountdown();
    clearClientReadyTimers();
    onlineClientReadyRoom=null;
    onlineClientReadySent=false;
    try{ clearOnlineBattleTimer(); }catch(e){}
    try{ if(onlineMatchStartTimer){ clearTimeout(onlineMatchStartTimer); onlineMatchStartTimer=null; } }catch(e){}
    try{ stopAllSounds(); }catch(e){}
    try{
      onlineTarget={x:200,y:350,vx:0,vy:0};
      onlineStartState=null;
      onlineLaunchStarted=false;
      onlineLaunchRoom=null;
      lastOnlineScoreTotal=null;
      lastOnlineRoundKey=null;
    }catch(e){}
    setOverlay('OPPONENT LEFT');
    setMatchStatus('Rakibin oyundan çıktı. Ana menüye dönebilirsin.');
    if($('resultPanel')){
      $('resultTitle').textContent='OPPONENT LEFT';
      $('resultTitle').style.color='#ef4444';
      $('resultTitle').style.textShadow='0 0 26px #ef4444';
      if($('resultScore')) $('resultScore').textContent='MATCH ENDED';
      if($('playAgainBtn')) $('playAgainBtn').style.display='none';
      if($('resultMenuBtn')) $('resultMenuBtn').textContent='MAIN MENU';
      $('resultPanel').classList.add('active');
    }
    onlineLaunchStarted=false;
    onlineLaunchRoom=null;
    roomCode=null;
    mode='ai';
    isHost=false;
    roleKnown=false;
  }
  function leaveOnlineRoom(){
    notifyLeavingOnline();

    started=false;
    paused=true;
    goalLocked=true;
    onlineRoomClosed=true;
    onlineServerPlaying=false;

    clearOnlineCountdown();
    clearClientReadyTimers();
    onlineClientReadyRoom=null;
    onlineClientReadySent=false;
    try{ clearOnlineBattleTimer(); }catch(e){}
    try{
      if(onlineMatchStartTimer){
        clearTimeout(onlineMatchStartTimer);
        onlineMatchStartTimer=null;
      }
    }catch(e){}
    try{ stopAllSounds(); }catch(e){}

    try{
      if(socket){
        socket.removeAllListeners();
        socket.disconnect();
      }
    }catch(e){}
    socket=null;
    socketReady=false;

    // Returning to the menu must be equivalent to a fresh page runtime. The
    // animation loop otherwise keeps old ball/session state alive and can make
    // a later room appear to start before the authoritative countdown.
    try{ if(raf){ cancelAnimationFrame(raf); raf=0; } }catch(e){}
    canvas=null;
    ctx=null;
    ball=null;
    lines=[];
    trail=[];
    sparks=[];
    drawing=null;
    score=null;
    energy=100;
    onlineStateAt=Date.now();

    onlineTarget={x:200,y:350,vx:0,vy:0};
    onlineStartState=null;
    onlineMatchId=null;
    onlineLaunchStarted=false;
    onlineLaunchRoom=null;
    lastOnlineScoreTotal=null;
    lastOnlineRoundKey=null;

    pendingMode='ai';
    roomCode=null;
    mode='ai';
    isHost=false;
    roleKnown=false;
    rivalName='RIVAL';
    try{ $('overlayText').textContent=''; }catch(e){}
    try{ $('resultPanel').classList.remove('active'); }catch(e){}
  }
  function newMatch(){
    if(!requireBaseEnergy()){ show('menuScreen'); return; }
    if(!requireName()) return;
    onlineRoomClosed=false;
    mode='ai'; isHost=false; roleKnown=false; roomCode=null;
    canvas=$('gameCanvas'); ctx=canvas.getContext('2d'); initArenaPaint();
    score={player:0,ai:0,msg:'',life:0}; resetBall('down');
    updateScoreHud();
    $('resultPanel').classList.remove('active');
    show('gameScreen'); started=false; paused=true;
    countdown(3);
    if(!raf) loop();
  }
  function countdown(n){
    var text=$('overlayText');
    if(n>0){ setOverlay(String(n)); setTimeout(function(){countdown(n-1)},650); }
    else { setOverlay('BATTLE!'); setTimeout(function(){text.textContent=''; started=true; paused=false; goalLocked=false;},600); }
  }
  function getPos(e){
    var t=e.touches&&e.touches[0]?e.touches[0]:e;
    var r=canvas.getBoundingClientRect();
    return {x:(t.clientX-r.left)/r.width*W, y:(t.clientY-r.top)/r.height*H};
  }
  function addSparks(x,y,color){
    for(var i=0;i<14;i++){
      sparks.push({x:x,y:y,vx:(Math.random()-.5)*7,vy:(Math.random()-.5)*7,life:22,color:color});
    }
  }
  function addLine(start,end,owner){
    var dx=end.x-start.x, dy=end.y-start.y, len=Math.sqrt(dx*dx+dy*dy)||1;
    var max=160, l=Math.min(max,len), a=Math.atan2(dy,dx);
    var count=0;
    lines=lines.filter(function(line){
      if(line.owner===owner){ count++; return count<MAX_ACTIVE_LINES_PER_SIDE; }
      return true;
    });
    var createdLine={x1:start.x,y1:start.y,x2:start.x+Math.cos(a)*l,y2:start.y+Math.sin(a)*l,life:50,owner:owner};
    lines.push(createdLine);
    if(owner==='player') energy=Math.max(0,energy-20);
    return createdLine;
  }
  function canvasDown(e){ if(!started||paused) return; var p=getPos(e); if(p.y<H/2) return; drawing=p; e.preventDefault(); }
  function canvasMove(e){
    if(!started||paused||!drawing) return;
    var p=getPos(e); if(p.y<H/2) return;
    var d=Math.hypot(p.x-drawing.x,p.y-drawing.y);
    if(d>55 && energy>=20){
      var createdLine=addLine(drawing,p,'player');
      if(mode==='online' && socket && roomCode){
        var sx=createdLine.x1, sy=createdLine.y1, ex=createdLine.x2, ey=createdLine.y2;
        socket.emit('draw-line',{ roomCode:roomCode, line:{ owner:isHost?'host':'guest', x1:sx, y1:isHost?sy:H-sy, x2:ex, y2:isHost?ey:H-ey } });
      }
      drawing=null;
    }
    e.preventDefault();
  }
  function canvasUp(e){ drawing=null; if(e) e.preventDefault(); }
  function goal(who){
    if(goalLocked) return;
    goalLocked=true; paused=true; started=false; flash(); playSound('goal');
    if(who==='player') score.player++; else score.ai++;
    updateScoreHud();
    var text=$('overlayText');
    if(score.player>=7 || score.ai>=7){
      text.textContent='';
      $('resultTitle').textContent=score.player>=7?displayName(playerName)+' WINS':'AI WINS';
      $('resultTitle').style.color=score.player>=7?theme().main:'#ef4444';
      $('resultTitle').style.textShadow='0 0 26px '+(score.player>=7?theme().main:'#ef4444');
      $('resultScore').textContent='AI '+score.ai+' ◇ '+score.player+' '+displayName(playerName);
      $('resultPanel').classList.add('active');
      return;
    }
    setOverlay(who==='player'?displayName(playerName)+' SCORES':'AI SCORES');
    setTimeout(function(){ resetBall(who==='player'?'down':'up'); countdown(3); },950);
  }
  function initArenaPaint(){
    if(!ctx) return;
    var base=ctx.createLinearGradient(0,0,0,H); base.addColorStop(0,'#020716'); base.addColorStop(.28,'#031d5a'); base.addColorStop(.52,'#003bbd'); base.addColorStop(.76,'#031d5a'); base.addColorStop(1,'#020716');
    var baseGlow=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,H/1.05); baseGlow.addColorStop(0,'rgba(255,255,255,.10)'); baseGlow.addColorStop(.3,'rgba(0,82,255,.18)'); baseGlow.addColorStop(.75,'rgba(0,82,255,.04)'); baseGlow.addColorStop(1,'rgba(0,0,0,.45)');
    var space=ctx.createLinearGradient(0,0,0,H); space.addColorStop(0,'#02040d'); space.addColorStop(.42,'#061536'); space.addColorStop(.72,'#030918'); space.addColorStop(1,'#000');
    var spaceGlow=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,H/1.1); spaceGlow.addColorStop(0,'rgba(34,211,238,.22)'); spaceGlow.addColorStop(.35,'rgba(0,82,255,.10)'); spaceGlow.addColorStop(1,'rgba(0,0,0,0)');
    var temple=ctx.createLinearGradient(0,0,0,H); temple.addColorStop(0,'#140b02'); temple.addColorStop(.5,'#241403'); temple.addColorStop(1,'#050301');
    var templeGlow=ctx.createRadialGradient(W/2,H/2,18,W/2,H/2,H/1.08); templeGlow.addColorStop(0,'rgba(251,191,36,.22)'); templeGlow.addColorStop(.45,'rgba(120,53,15,.14)'); templeGlow.addColorStop(1,'rgba(0,0,0,.25)');
    var soccer=ctx.createLinearGradient(0,0,W,0); soccer.addColorStop(0,'#075522'); soccer.addColorStop(.5,'#11843a'); soccer.addColorStop(1,'#075522');
    var soccerGlow=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,H/1.05); soccerGlow.addColorStop(0,'rgba(144,255,171,.12)'); soccerGlow.addColorStop(.65,'rgba(4,60,24,.05)'); soccerGlow.addColorStop(1,'rgba(0,12,4,.42)');
    var classic=ctx.createRadialGradient(W/2,H/2,30,W/2,H/2,H/1.15); classic.addColorStop(0,'rgba(0,82,255,.22)'); classic.addColorStop(1,'rgba(0,0,0,0)');
    arenaPaint={base:base,baseGlow:baseGlow,space:space,spaceGlow:spaceGlow,temple:temple,templeGlow:templeGlow,soccer:soccer,soccerGlow:soccerGlow,classic:classic};
  }
  function drawBg(){
    var th=theme();
    if(arena==='base'){
      ctx.fillStyle=arenaPaint.base; ctx.fillRect(0,0,W,H);
      ctx.fillStyle=arenaPaint.baseGlow; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle='rgba(255,255,255,.045)'; ctx.lineWidth=1;
      for(var bx=52; bx<W-52; bx+=48){ ctx.beginPath(); ctx.moveTo(bx,24); ctx.lineTo(bx,H-24); ctx.stroke(); }
      for(var by=54; by<H-24; by+=54){ ctx.beginPath(); ctx.moveTo(32,by); ctx.lineTo(W-32,by); ctx.stroke(); }
      for(var lx=38; lx<=W-38; lx+=24){ var blink=.38+Math.sin(frame*.12+lx*.08)*.25; ctx.beginPath(); ctx.arc(lx,15,2.2,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,'+blink+')'; ctx.shadowColor='#0052ff'; ctx.shadowBlur=10; ctx.fill(); ctx.beginPath(); ctx.arc(lx,H-15,2.2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0; }
    } else if(arena==='space'){
      ctx.fillStyle=arenaPaint.space; ctx.fillRect(0,0,W,H);
      ctx.fillStyle=arenaPaint.spaceGlow; ctx.fillRect(0,0,W,H);
      for(var i=0;i<105;i++){ var sx=(i*73+frame*(.08+(i%3)*.035))%W; var sy=(i*47+frame*(.16+(i%5)*.025))%H; var a=.16+((i%7)/13); ctx.fillStyle='rgba(255,255,255,'+a+')'; ctx.fillRect(sx,sy,i%5===0?1.8:1,i%5===0?1.8:1); }
      ctx.save(); ctx.translate(W/2,H/2); ctx.rotate(frame*.004); ctx.strokeStyle='rgba(34,211,238,.35)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(0,0,112,40,0,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0,0,78,26,Math.PI/2.8,0,Math.PI*2); ctx.stroke(); ctx.restore();
    } else if(arena==='temple'){
      ctx.fillStyle=arenaPaint.temple; ctx.fillRect(0,0,W,H);
      ctx.fillStyle=arenaPaint.templeGlow; ctx.fillRect(0,0,W,H);
      for(var py=70; py<H-60; py+=88){ ctx.fillStyle='rgba(251,191,36,.12)'; ctx.fillRect(18,py,16,50); ctx.fillRect(W-34,py,16,50); ctx.fillStyle='rgba(251,191,36,.22)'; ctx.fillRect(14,py-5,24,6); ctx.fillRect(W-38,py-5,24,6); }
      ctx.save(); ctx.translate(W/2,H/2); ctx.strokeStyle='rgba(251,191,36,.30)'; ctx.lineWidth=1.5; for(var r=0;r<6;r++){ ctx.rotate(Math.PI/3); ctx.beginPath(); ctx.moveTo(0,-92); ctx.lineTo(0,-72); ctx.stroke(); } ctx.restore();
    } else if(arena==='soccer'){
      ctx.fillStyle=arenaPaint.soccer; ctx.fillRect(0,0,W,H);
      for(var stripe=0;stripe<10;stripe++){ ctx.fillStyle=stripe%2===0?'rgba(255,255,255,.035)':'rgba(0,0,0,.035)'; ctx.fillRect(stripe*W/10,0,W/10,H); }
      ctx.fillStyle=arenaPaint.soccerGlow; ctx.fillRect(0,0,W,H);
      ctx.save();
      ctx.strokeStyle='rgba(255,255,255,.82)'; ctx.fillStyle='rgba(255,255,255,.88)'; ctx.lineWidth=2;
      ctx.strokeRect(24,24,W-48,H-48);
      ctx.beginPath(); ctx.moveTo(24,H/2); ctx.lineTo(W-24,H/2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W/2,H/2,52,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W/2,H/2,3,0,Math.PI*2); ctx.fill();
      ctx.strokeRect(W/2-92,24,184,112); ctx.strokeRect(W/2-48,24,96,50);
      ctx.strokeRect(W/2-92,H-136,184,112); ctx.strokeRect(W/2-48,H-74,96,50);
      ctx.beginPath(); ctx.arc(W/2,96,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(W/2,H-96,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(24,24,14,0,Math.PI/2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W-24,24,14,Math.PI/2,Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(24,H-24,14,-Math.PI/2,0); ctx.stroke();
      ctx.beginPath(); ctx.arc(W-24,H-24,14,Math.PI,Math.PI*1.5); ctx.stroke();
      ctx.strokeStyle='rgba(220,255,228,.62)'; ctx.lineWidth=1;
      for(var net=0;net<7;net++){ var nx=W/2-45+net*15; ctx.beginPath(); ctx.moveTo(nx,24); ctx.lineTo(nx,7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(nx,H-24); ctx.lineTo(nx,H-7); ctx.stroke(); }
      ctx.strokeRect(W/2-45,7,90,17); ctx.strokeRect(W/2-45,H-24,90,17);
      ctx.restore();
    } else {
      ctx.fillStyle='#020204'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle=arenaPaint.classic; ctx.fillRect(0,0,W,H);
    }

    if(arena!=='soccer'){
      ctx.strokeStyle=arena==='space'?'rgba(34,211,238,.10)':arena==='temple'?'rgba(251,191,36,.09)':'rgba(255,255,255,.06)'; ctx.lineWidth=1;
      for(var x=40;x<W;x+=40){ ctx.beginPath(); ctx.moveTo(x,18); ctx.lineTo(x,H-18); ctx.stroke(); }
      for(var y=60;y<H;y+=60){ ctx.beginPath(); ctx.moveTo(18,y); ctx.lineTo(W-18,y); ctx.stroke(); }
    }

    var pulse=.55+Math.sin(frame*.045)*.18;
    ctx.save(); ctx.strokeStyle=arena==='soccer'?'rgba(92,255,133,'+pulse+')':arena==='temple'?'rgba(251,191,36,'+pulse+')':arena==='space'?'rgba(34,211,238,'+pulse+')':arena==='base'?'rgba(239,68,68,'+pulse+')':'rgba(0,82,255,'+pulse+')';
    ctx.shadowColor=th.main; ctx.shadowBlur=18; ctx.lineWidth=3; ctx.strokeRect(12,12,W-24,H-24); ctx.restore();
    ctx.beginPath(); ctx.moveTo(12,H/2); ctx.lineTo(W-12,H/2); ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.stroke();

    ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.fillStyle=arena==='soccer'?'rgba(231,255,237,.88)':arena==='temple'?'rgba(251,191,36,.82)':arena==='space'?'rgba(34,211,238,.78)':arena==='base'?'rgba(255,255,255,.62)':'rgba(0,82,255,.62)';
    ctx.fillText(arena==='soccer'?'◇ CHAMPIONS PITCH ◇':arena==='space'?'◇ NEON ORBIT ◇':arena==='temple'?'◇ VOID TEMPLE ◇':arena==='base'?'◇ CORE ARENA ◇':'◇ ARCADE GRID ◇',W/2,H/2-70);
    ctx.font=arena==='soccer'?'900 32px monospace':arena==='temple'?'900 36px monospace':arena==='space'?'900 40px monospace':'900 46px monospace';
    ctx.fillStyle=arena==='soccer'?'rgba(239,255,243,.42)':arena==='temple'?'rgba(255,230,150,.82)':arena==='space'?'rgba(210,250,255,.82)':arena==='base'?'rgba(255,255,255,.82)':'rgba(0,82,255,.38)';
    ctx.shadowColor=th.main; ctx.shadowBlur=24; ctx.fillText(th.label,W/2,H/2+15); ctx.shadowBlur=0;
  }
  function aiThink(){
    if(ball.y>=H/2-20 || ball.vy>=0) return;
    var rate=difficulty==='easy'?0.018:difficulty==='hard'?0.065:0.038;
    if(Math.random()>rate) return;
    var err=difficulty==='easy'?(Math.random()-.5)*210:difficulty==='hard'?(Math.random()-.5)*25:(Math.random()-.5)*80;
    addLine({x:ball.x-55+err,y:Math.max(42,ball.y-35)}, {x:ball.x+55+err,y:Math.max(42,ball.y-10)}, 'ai');
  }
  function physics(){
    var now=Date.now();
    var dt=Math.min(50,Math.max(0,now-lastFrameAt));
    lastFrameAt=now;
    var dtScale=dt/16.67;
    lastDtScale=dtScale;

    frame++;
    if(mode==='ai' && started && !paused) rallyElapsedSeconds+=dt/1000;
    if(energy<100){
      var rallySpeed=Math.hypot(ball.vx,ball.vy);
      var rallyBoost=Math.max(0,Math.min(1,(rallySpeed-3.5)/(10-3.5)));
      var longRallyBoost=mode==='ai'?Math.max(0,Math.min(1,(rallyElapsedSeconds-8)/(24-8))):0;
      energy=Math.min(100,energy+((0.30+(0.16*rallyBoost)+(0.14*longRallyBoost))*dtScale));
    }
    if(!started||paused) return;
    if(mode==='online'){
      if(!onlineServerPlaying) return;
      var elapsed=Math.min(4,(Date.now()-onlineStateAt)/16.67);
      var px=Math.max(22,Math.min(W-22,onlineTarget.x+onlineTarget.vx*elapsed));
      var py=Math.max(22,Math.min(H-22,onlineTarget.y+onlineTarget.vy*elapsed));
      var dxo=px-ball.x, dyo=py-ball.y, disto=Math.hypot(dxo,dyo);
      if(disto>90){
        ball.x=px;
        ball.y=py;
      } else {
        var follow=1-Math.pow(0.68,dtScale);
        ball.x+=dxo*follow;
        ball.y+=dyo*follow;
      }
      ball.vx=onlineTarget.vx; ball.vy=onlineTarget.vy;
      return;
    }
    aiThink();

    var moveVx=ball.vx*dtScale;
    var moveVy=ball.vy*dtScale;
    var steps=Math.max(1,Math.ceil(Math.hypot(moveVx,moveVy)/2));
    for(var s=0;s<steps;s++){
      ball.x+=moveVx/steps; ball.y+=moveVy/steps;
      for(var i=0;i<lines.length;i++){
        var l=lines[i]; if(l.life<4) continue;
        var dx=l.x2-l.x1,dy=l.y2-l.y1,lenSq=dx*dx+dy*dy;
        if(!lenSq) continue;
        var t=Math.max(0,Math.min(1,((ball.x-l.x1)*dx+(ball.y-l.y1)*dy)/lenSq));
        var px=l.x1+t*dx, py=l.y1+t*dy, dist=Math.hypot(ball.x-px,ball.y-py);
        if(dist<ball.r+6){
          var speed=Math.min(Math.hypot(ball.vx,ball.vy)+0.28,10);
          var nx=-dy, ny=dx, nl=Math.hypot(nx,ny)||1; nx/=nl; ny/=nl;
          if(ball.vx*nx+ball.vy*ny>0){nx*=-1;ny*=-1;}
          ball.vx=nx*speed+dx*.006; ball.vy=ny*speed+dy*.006;
          l.life=0; addSparks(ball.x,ball.y,l.owner==='player'?'#0052ff':'#ef4444'); playSound('hit');
          break;
        }
      }
    }
    if(ball.x<22){ ball.x=22; ball.vx=Math.abs(ball.vx); if(Date.now()-lastWallSound>180){playSound('wall'); lastWallSound=Date.now();} }
    if(ball.x>W-22){ ball.x=W-22; ball.vx=-Math.abs(ball.vx); if(Date.now()-lastWallSound>180){playSound('wall'); lastWallSound=Date.now();} }
    if(ball.y<22) goal('player');
    if(ball.y>H-22) goal('ai');
  }
  function render(){
    drawBg(); physics();
    if(score && (score.player===6 || score.ai===6)){
      ctx.save(); ctx.textAlign='center'; ctx.font=(score.player===6&&score.ai===6)?'bold 28px monospace':'bold 24px monospace'; ctx.fillStyle=theme().main; ctx.shadowColor=theme().main; ctx.shadowBlur=24;
      ctx.fillText((score.player===6&&score.ai===6)?'FINAL CLASH':(arena==='space'?'ORBIT POINT':arena==='temple'?'VOID POINT':arena==='base'?'CORE POINT':'MATCH POINT'), W/2, H/2-95); ctx.restore();
    }
    trail.push({x:ball.x,y:ball.y}); if(trail.length>20) trail.shift();
    lines=lines.map(function(l){l.life-=lastDtScale;return l}).filter(function(l){return l.life>0});
    sparks=sparks.map(function(s){
      s.x+=s.vx*lastDtScale;
      s.y+=s.vy*lastDtScale;
      var damp=Math.pow(.95,lastDtScale);
      s.vx*=damp;
      s.vy*=damp;
      s.life-=lastDtScale;
      return s;
    }).filter(function(s){return s.life>0;});

    lines.forEach(function(l){ var a=Math.max(l.life/42,.08); ctx.beginPath(); ctx.moveTo(l.x1,l.y1); ctx.lineTo(l.x2,l.y2); ctx.lineCap='round'; ctx.lineWidth=10; ctx.strokeStyle=l.owner==='player'?'rgba(0,82,255,'+a+')':'rgba(239,68,68,'+a+')'; ctx.shadowColor=l.owner==='player'?'#0052ff':'#ef4444'; ctx.shadowBlur=24; ctx.stroke(); ctx.shadowBlur=0; });
    trail.forEach(function(p,i){ var a=i/trail.length; ctx.beginPath(); ctx.arc(p.x,p.y,ball.r*a*1.5,0,Math.PI*2); ctx.fillStyle='rgba(0,82,255,'+(a*.26)+')'; ctx.fill(); });
    sparks.forEach(function(s){ var a=s.life/22; ctx.beginPath(); ctx.arc(s.x,s.y,2+a*3,0,Math.PI*2); ctx.fillStyle=s.color==='#ef4444'?'rgba(239,68,68,'+a+')':'rgba(0,82,255,'+a+')'; ctx.shadowColor=s.color; ctx.shadowBlur=14; ctx.fill(); ctx.shadowBlur=0; });

    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r+8,0,Math.PI*2); ctx.fillStyle='rgba(0,82,255,.18)'; ctx.fill();
    ctx.beginPath(); ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2); ctx.fillStyle='white'; ctx.shadowColor=theme().main; ctx.shadowBlur=26; ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(120,72,160,8); ctx.fillStyle='#ef4444'; ctx.fillRect(120,72,160*energy/100,8);
    ctx.fillStyle='rgba(255,255,255,.55)'; ctx.font='10px monospace'; ctx.textAlign='center'; ctx.fillText('ENERGY',W/2,96);
  }
  function loop(){ if(ctx && !document.hidden) render(); raf=requestAnimationFrame(loop); }

  loadName();
  var nameInput=$('usernameInput'); if(nameInput){ nameInput.addEventListener('input',function(){ this.value=cleanName(this.value); }); }
  var roomInput=$('roomCodeInput'); if(roomInput){ roomInput.addEventListener('input',function(){ this.value=cleanName(this.value); }); }
  bindTap($('saveNameBtn'), saveName);
  bindTap($('usernameCancelBtn'), cancelUsernameModal);
  bindTap($('editNameBtn'), function(){ openUsernameModal(); });
  bindTap($('profileTapArea'), function(){ openUsernameModal(); });
  bindTap($('storeProfileTapArea'), function(){ openUsernameModal(); });
  bindTap($('storeProfileNav'), function(){ openUsernameModal(); });
  loadSound();

  document.querySelectorAll('.region').forEach(function(btn){ bindTap(btn,function(){ socketRegion=btn.getAttribute('data-region')||'EU'; warmSocketRegion(socketRegion); document.querySelectorAll('.region').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  bindTap($('cancelMatchBtn'), cancelOnlineSearch);
  bindTap($('copyRoomCodeBtn'), copyRoomCode);
  document.querySelectorAll('.arena').forEach(function(btn){ bindTap(btn,function(){ arena=btn.getAttribute('data-arena')||'classic'; document.querySelectorAll('.arena').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  document.querySelectorAll('.storeArena').forEach(function(btn){ bindTap(btn,function(){ arena=btn.getAttribute('data-store-arena')||'base'; document.querySelectorAll('.storeArena').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  document.querySelectorAll('.difficulty').forEach(function(btn){ bindTap(btn,function(){ difficulty=btn.getAttribute('data-difficulty')||'normal'; document.querySelectorAll('.difficulty').forEach(function(b){b.classList.remove('selected')}); btn.classList.add('selected'); }); });
  bindTap($('playBtn'), openModeScreen);
  bindTap($('storePlayNav'), openModeScreen);
  bindTap($('storePlayBtn'), function(){ pendingMode='ai'; show('difficultyScreen'); });
  bindTap($('storeOnlineBtn'), function(){ chooseMode('online'); });
  bindTap($('storeCreateBtn'), function(){ chooseMode('create'); });
  bindTap($('storeJoinBtn'), function(){ chooseMode('join'); });
  bindTap($('storeSettingsNav'), function(){ show('settingsScreen'); });
  bindTap($('storeFeedbackNav'), openFeedbackModal);
  bindTap($('feedbackCloseBtn'), closeFeedbackModal);
  var feedbackForm=$('feedbackForm'); if(feedbackForm){ feedbackForm.addEventListener('submit',sendFeedback); }
  var feedbackModal=$('feedbackModal'); if(feedbackModal){ feedbackModal.addEventListener('click',function(e){ if(e.target===feedbackModal) closeFeedbackModal(); }); }
  bindTap($('settingsBtn'), function(){ show('settingsScreen'); });
  bindTap($('settingsBackBtn'), function(){ show('menuScreen'); });
  bindTap($('soundToggleBtn'), function(){ soundEnabled=true; try{ localStorage.setItem('bbb_mobile_sound','on'); }catch(e){} syncSoundButton(); });
  bindTap($('soundOffBtn'), function(){ soundEnabled=false; try{ localStorage.setItem('bbb_mobile_sound','off'); }catch(e){} syncSoundButton(); });
  bindTap($('modeAiBtn'), function(){ chooseMode('ai'); });
  bindTap($('modeOnlineBtn'), function(){ chooseMode('online'); });
  bindTap($('modeCreateBtn'), function(){ chooseMode('create'); });
  bindTap($('modeJoinBtn'), function(){ chooseMode('join'); });
  bindTap($('modeBackBtn'), function(){ show('menuScreen'); });
  bindTap($('arenaNextBtn'), continueAfterArena);
  bindTap($('arenaBackBtn'), function(){ show('menuScreen'); });
  bindTap($('startAiBtn'), newMatch);
  bindTap($('difficultyBackBtn'), function(){ show('menuScreen'); });
  bindTap($('joinRoomBtn'), joinRoom);
  bindTap($('joinBackBtn'), function(){ show('menuScreen'); });
  bindTap($('howBtn'), function(){ show('howScreen'); });
  bindTap($('howBtnTop'), function(){ show('howScreen'); });
  bindTap($('backHowBtn'), function(){ show('menuScreen'); });
  bindTap($('menuBtn'), function(){ $('overlayText').textContent=''; $('resultPanel').classList.remove('active'); leaveOnlineRoom(); show('menuScreen'); });
  bindTap($('restartBtn'), function(){ if(mode==='online'){ setOverlay('ONLINE RESTART DISABLED'); } else newMatch(); });
  bindTap($('playAgainBtn'), function(){ if(mode==='online' && socket && roomCode){ $('resultPanel').classList.remove('active'); setOverlay('WAITING RIVAL'); try{ socket.emit('play-again-ready',{ roomCode:roomCode, role:isHost?'host':'guest', nextMatchNo:onlineMatchNo+1 }); }catch(e){} } else newMatch(); });
  bindTap($('resultMenuBtn'), function(){ $('resultPanel').classList.remove('active'); leaveOnlineRoom(); show('menuScreen'); });
  window.addEventListener('beforeunload', function(){ notifyLeavingOnline(); });
  window.addEventListener('pagehide', function(){ notifyLeavingOnline(); });

  // Native wallet bridge for older iOS browsers. The page contains a large
  // legacy game shell, so React hydration can arrive too late for the first tap.
  // This delegated handler works even when the React wallet card is replaced.
  var nativeWalletTapAt=0;
  var ENERGY_CONTRACT='0x55894e2e9b29dad1b526c7f7c5d2d5e8e1b9d7db';
  var ENERGY_BUILDER_SUFFIX='62635f6873616772376c620b0080218021802180218021802180218021';
  function nativeEnergyUi(message,active){
    var copy=document.querySelector('.mobileEnergyCopy strong');
    var button=document.querySelector('.mobileEnergyCard button');
    var card=document.querySelector('.mobileEnergyCard');
    if(copy) copy.textContent=message;
    if(button) button.textContent=active?'ENERGY ACTIVE':message==='READY TO ACTIVATE'?'ACTIVATE ENERGY':'CONNECT BASE WALLET';
    if(card) card.classList.toggle('active',!!active);
    window.__bbbEnergyActive=!!active;
  }
  function nativeHexAddressData(address){
    return '0x19c3994b'+String(address||'').toLowerCase().replace(/^0x/,'').padStart(64,'0');
  }
  function nativeRequestWithTimeout(provider,payload,timeoutMs){
    return Promise.race([
      provider.request(payload),
      new Promise(function(_,reject){ setTimeout(function(){ reject(new Error('WALLET_TIMEOUT')); },timeoutMs); })
    ]);
  }
  async function nativeBaseWalletFlow(){
    // Prefer Wagmi's Coinbase/Base connector. It owns the WalletConnect / Base
    // App return session, so Chrome can resume after approval and stay connected.
    if(typeof window.__bbbWalletAction==='function'){
      window.__bbbWalletAction();
      return;
    }
    var injected=window.ethereum;
    var provider=null;
    if(injected&&Array.isArray(injected.providers)){
      provider=injected.providers.find(function(item){ return item&&(item.isCoinbaseWallet||item.isBaseWallet); })||null;
    }else if(injected&&(injected.isCoinbaseWallet||injected.isBaseWallet)){
      provider=injected;
    }
    if(!provider || typeof provider.request!=='function'){
      nativeEnergyUi('OPENING BASE APP',false);
      var returnUrl=window.location.href.split('#')[0];
      window.location.href='https://go.cb-w.com/dapp?cb_url='+encodeURIComponent(returnUrl);
      return;
    }
    try{
      nativeEnergyUi('CONNECTING BASE WALLET',false);
      // Base App generally exposes its active account already. Asking again can
      // leave older iOS webviews waiting forever without showing a prompt.
      var accounts=[];
      try{ accounts=await nativeRequestWithTimeout(provider,{method:'eth_accounts'},3500)||[]; }catch(accountReadError){}
      if(!accounts.length){
        accounts=await nativeRequestWithTimeout(provider,{method:'eth_requestAccounts'},12000);
      }
      var account=accounts&&accounts[0];
      if(!account) throw new Error('NO_ACCOUNT');
      try{
        await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x2105'}]});
      }catch(chainError){
        try{
          await provider.request({method:'wallet_addEthereumChain',params:[{
            chainId:'0x2105',chainName:'Base',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},
            rpcUrls:['https://mainnet.base.org'],blockExplorerUrls:['https://basescan.org']
          }]});
        }catch(addError){}
      }
      var leftHex=await provider.request({method:'eth_call',params:[{
        to:ENERGY_CONTRACT,data:nativeHexAddressData(account)
      },'latest']});
      var left=0;
      try{ left=Number(BigInt(leftHex||'0x0')); }catch(parseError){}
      if(left>0){
        var hours=Math.floor(left/3600),minutes=Math.floor((left%3600)/60);
        nativeEnergyUi('ENERGY ACTIVE • '+(hours?hours+'H ':'')+minutes+'M LEFT',true);
        return;
      }
      nativeEnergyUi('CONFIRM IN BASE WALLET',false);
      var txHash=await provider.request({method:'eth_sendTransaction',params:[{
        from:account,to:ENERGY_CONTRACT,value:'0x0',data:'0xf5d7e22f'+ENERGY_BUILDER_SUFFIX
      }]});
      nativeEnergyUi('ACTIVATING ON BASE',false);
      var attempts=0;
      var receiptTimer=setInterval(async function(){
        attempts++;
        try{
          var receipt=await provider.request({method:'eth_getTransactionReceipt',params:[txHash]});
          if(receipt){
            clearInterval(receiptTimer);
            if(receipt.status==='0x1') nativeEnergyUi('ENERGY ACTIVE • 24H UNLOCKED',true);
            else nativeEnergyUi('ACTIVATION FAILED',false);
          }else if(attempts>60){ clearInterval(receiptTimer); nativeEnergyUi('CHECK TRANSACTION STATUS',false); }
        }catch(receiptError){ if(attempts>60) clearInterval(receiptTimer); }
      },2000);
    }catch(error){
      nativeEnergyUi('TAP TO CONNECT BASE WALLET',false);
    }
  }
  function nativeEnergyTap(event){
    var target=event.target&&event.target.closest?event.target.closest('.mobileEnergyCard button'):null;
    if(!target) return;
    var now=Date.now();
    if(now-nativeWalletTapAt<700) return;
    nativeWalletTapAt=now;
    event.preventDefault();
    event.stopPropagation();
    if(event.stopImmediatePropagation) event.stopImmediatePropagation();
    nativeBaseWalletFlow();
  }
  // Do not capture the Base button here. Base Account must receive the native
  // React click directly or iOS treats its connection popup as unsolicited.

  setTimeout(function(){
    canvas=$('gameCanvas');
    if(canvas){
      canvas.addEventListener('touchstart',canvasDown,{passive:false});
      canvas.addEventListener('touchmove',canvasMove,{passive:false});
      canvas.addEventListener('touchend',canvasUp,{passive:false});
      canvas.addEventListener('pointerdown',canvasDown,{passive:false});
      canvas.addEventListener('pointermove',canvasMove,{passive:false});
      canvas.addEventListener('pointerup',canvasUp,{passive:false});
    }
  },0);
})();
</script>
          `,
        }}
      />
    </main>
  );
}
