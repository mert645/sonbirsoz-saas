import { SITE_NAME } from "@/lib/utils/constants";

interface ManifestData {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string }[];
}

export function generateManifest(): ManifestData {
  return {
    name: SITE_NAME,
    short_name: "SonBirSöz",
    description: "Tarafsız ve güvenilir haber platformu",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#4f46e5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
