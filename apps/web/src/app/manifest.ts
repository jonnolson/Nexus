import type { MetadataRoute } from "next";

// Makes Nexus installable to the phone home screen (PWA). Icons are generated from
// apps/desktop/src-tauri/app-icon.svg (see the comment in that file).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexus",
    short_name: "Nexus",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1514",
    theme_color: "#0b1514",
    icons: [
      { src: "/icons/192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
