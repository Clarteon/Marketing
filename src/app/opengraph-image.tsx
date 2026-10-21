import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = "Clarteon: Technology that starts with your problem.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// shortcut: uses the built-in og font, not Fraunces; bundle a Fraunces .ttf if the brand needs it here.
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#0A0A0A",
        color: "#FFFFFF",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width="96" height="96" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="#C6F432" />
          <path
            d="M21.3 10a8 8 0 1 0 0 12"
            fill="none"
            stroke="#0A0A0A"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="16" cy="16" r="2.6" fill="#0A0A0A" />
        </svg>
        <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: -1 }}>{site.name}</div>
      </div>
      <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.1, letterSpacing: -2 }}>
        {site.tagline}
      </div>
      <div style={{ fontSize: 30, color: "#C6C6C0" }}>clarteon.tech</div>
    </div>,
    size,
  );
}
