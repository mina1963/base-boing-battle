"use client";

import { useEffect, useState } from "react";

export default function MobileTest() {
  const [ready, setReady] = useState("NOT HYDRATED");

  useEffect(() => {
    setReady("HYDRATED");
  }, []);

  return (
    <main style={{ minHeight: "100dvh", background: "black", color: "white", padding: 30 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>{ready}</h1>

      <button
        onClick={() => alert("BUTTON WORKS")}
        style={{
          marginTop: 30,
          width: "100%",
          height: 80,
          background: "#0052FF",
          color: "white",
          borderRadius: 24,
          fontWeight: 900,
          fontSize: 18,
        }}
      >
        TEST BUTTON
      </button>
    </main>
  );
}