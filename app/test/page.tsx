"use client";

import { useState } from "react";

export default function TestPage() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("READY");

  const run = () => {
    setCount((v) => v + 1);
    setText("BUTTON WORKED");
  };

  return (
    <main
      style={{
        minHeight: "160vh",
        background: "black",
        color: "white",
        padding: 24,
        touchAction: "auto",
        overflowY: "auto",
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 900 }}>BASE APP TEST</h1>

      <p style={{ marginTop: 20 }}>Status: {text}</p>
      <p>Count: {count}</p>

      <button
        type="button"
        onClick={run}
        onTouchStart={run}
        onPointerDown={run}
        style={{
          marginTop: 30,
          width: 260,
          height: 70,
          background: "#0052FF",
          color: "white",
          fontSize: 18,
          fontWeight: 900,
          borderRadius: 16,
          border: "none",
        }}
      >
        TEST BUTTON
      </button>

      <br />

      <a
        href="/"
        style={{
          display: "block",
          marginTop: 40,
          color: "#00aaff",
          fontSize: 20,
          fontWeight: 900,
        }}
      >
        GO HOME LINK
      </a>

      <input
        placeholder="TYPE TEST"
        style={{
          marginTop: 40,
          width: 260,
          height: 50,
          fontSize: 18,
          padding: 12,
        }}
      />

      <div style={{ height: 800 }} />
      <p>SCROLL END</p>
    </main>
  );
}