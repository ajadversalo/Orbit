import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  // The browser uses this manifest to present Orbit as an installable standalone
  // application instead of a normal tab, including its name, colors, and icon.
  return {
    name: "Orbit — Personal Learning Planner",
    short_name: "Orbit",
    description: "Make room for curiosity and build a learning rhythm you can keep.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#25232d",
    orientation: "any",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
