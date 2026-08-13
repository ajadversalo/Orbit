import type { Metadata } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "Orbit — Learning planner",
  description: "Map your curiosity. Make time to learn.",
  applicationName: "Orbit",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Orbit" },
  icons: { icon: "/icon", apple: "/icon" },
};
export const viewport = { themeColor: "#25232d", width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Apply the saved/system theme before React paints. Running this tiny script in
  // the head prevents a bright flash when a dark-mode user opens or installs Orbit.
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{const t=localStorage.getItem('orbit-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}`}}/></head><body><PwaRegister/>{children}</body></html>;
}
