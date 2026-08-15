import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 16,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "#1274E0",
            boxShadow: "0 0 14px rgba(18,116,224,0.9)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
