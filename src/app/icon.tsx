import { ImageResponse } from "next/og";
import { SHARK_FIN_PATH, BRAND_GRADIENT_STOPS } from "@/lib/brand";

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
          background: "#0B202A",
          borderRadius: 16,
        }}
      >
        <svg width="42" height="42" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="g" x1="10" y1="90" x2="70" y2="10" gradientUnits="userSpaceOnUse">
              {BRAND_GRADIENT_STOPS.map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          <path d={SHARK_FIN_PATH} fill="url(#g)" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
