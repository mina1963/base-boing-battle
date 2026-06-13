export default function MobileTest() {
  return (
    <html>
      <body style={{ background: "black", color: "white", padding: 30 }}>
        <h1>STATIC HTML TEST</h1>

        <button
          id="testBtn"
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

        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.getElementById("testBtn").addEventListener("click", function () {
                alert("PLAIN JS WORKS");
              });
            `,
          }}
        />
      </body>
    </html>
  );
}