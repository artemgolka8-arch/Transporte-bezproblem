import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F2545",
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: "50%",
            background: "#1274E0",
            boxShadow: "0 0 40px rgba(18,116,224,0.9)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
