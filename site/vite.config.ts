import { networkInterfaces } from "node:os";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** This machine's first external IPv4 address, for the QR code phones scan in development. */
function lanAddress(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return null;
}

export default defineConfig(({ command }) => {
  const port = 5173;
  const host = command === "serve" ? lanAddress() : null;
  return {
    // GitHub Pages serves the site from ilyassesalama.github.io/vibration/.
    base: "/vibration/",
    plugins: [react()],
    server: { port, strictPort: true },
    define: { __LAN_URL__: JSON.stringify(host ? `http://${host}:${port}` : null) },
  };
});
