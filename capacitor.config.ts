import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.boingbattle.game",
  appName: "Boing Battle",
  webDir: "out",
  server: {
    url: "https://baseboingbattle.online/store",
    cleartext: false,
  },
};

export default config;