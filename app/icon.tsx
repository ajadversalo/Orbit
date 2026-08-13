import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#25232d", borderRadius: 108, position: "relative" }}>
      <div style={{ width: 302, height: 302, border: "24px solid #8b5cf6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-18deg)" }}>
        <div style={{ width: 105, height: 105, background: "#f7f5f0", borderRadius: "50%", display: "flex" }} />
      </div>
      <div style={{ position: "absolute", width: 58, height: 58, borderRadius: "50%", background: "#f97360", left: 74, top: 115, display: "flex" }} />
      <div style={{ position: "absolute", width: 32, height: 32, borderRadius: "50%", background: "#e6a92f", right: 83, bottom: 104, display: "flex" }} />
    </div>,
    size,
  );
}
