import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Base Boing Battle",
    short_name: "Boing Battle",
    description:
      "Draw, deflect, and battle in a fast online 1v1 physics game built on Base.",
    start_url: "/mobile",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020204",
    theme_color: "#0052ff",
    categories: ["games", "entertainment"],
    icons: [
      {
        src: "/icon.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
