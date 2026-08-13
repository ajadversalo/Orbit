"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    // Service workers are production-only so local development always shows fresh
    // code. In production this enables installation and the offline app shell.
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
