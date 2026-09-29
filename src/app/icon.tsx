import { ImageResponse } from "next/og";
import { BRAND_LOGO_DATA_URI } from "@/lib/brand-logo";

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
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND_LOGO_DATA_URI} width={64} height={64} alt="" />
      </div>
    ),
    { ...size }
  );
}
