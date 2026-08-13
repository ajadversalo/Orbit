import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
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
