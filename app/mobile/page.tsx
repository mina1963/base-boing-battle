"use client";

export default function MobileTest() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "black",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <button
        type="button"
        onClick={() => alert("BUTTON WORKS")}
        style={{
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