import { TranslationKey } from "@/lib/i18n/translations";

export type VehicleBrand =
  | "DUOTTS"
  | "LOOK_ROAD"
  | "ONE_SPORT"
  | "FUNBIKE"
  | "INDIANA"
  | "NILOX"
  | "RAVAPI"
  | "HONDA_VISION_110"
  | "HONDA_PCX_125";

export const BRAND_LABEL_KEYS: Record<VehicleBrand, TranslationKey> = {
  DUOTTS: "brand_duotts",
  LOOK_ROAD: "brand_look_road",
  ONE_SPORT: "brand_one_sport",
  FUNBIKE: "brand_funbike",
  INDIANA: "brand_indiana",
  NILOX: "brand_nilox",
  RAVAPI: "brand_ravapi",
  HONDA_VISION_110: "brand_honda_vision",
  HONDA_PCX_125: "brand_honda_pcx",
};

// Марки для типа "Велосипед" и модели для типа "Скутер" — раздельные наборы
export const BIKE_BRAND_OPTIONS: VehicleBrand[] = [
  "DUOTTS",
  "LOOK_ROAD",
  "ONE_SPORT",
  "FUNBIKE",
  "INDIANA",
  "NILOX",
  "RAVAPI",
];
export const SCOOTER_BRAND_OPTIONS: VehicleBrand[] = ["HONDA_VISION_110", "HONDA_PCX_125"];

// Оригинальные иконки-заглушки по умолчанию для каждой марки — используются,
// пока для конкретной единицы техники не задано собственное фото (поле imageUrl).
export const BRAND_VISUALS: Record<
  VehicleBrand,
  { icon: "bike" | "scooter" | "moped"; bg: string; fg: string }
> = {
  DUOTTS: { icon: "bike", bg: "bg-cyanDim/60", fg: "text-cyan" },
  LOOK_ROAD: { icon: "bike", bg: "bg-violetDim/60", fg: "text-violet" },
  ONE_SPORT: { icon: "bike", bg: "bg-amberDim/60", fg: "text-amber" },
  FUNBIKE: { icon: "bike", bg: "bg-rose-100", fg: "text-rose-600" },
  INDIANA: { icon: "bike", bg: "bg-sky-100", fg: "text-sky-600" },
  NILOX: { icon: "bike", bg: "bg-teal-100", fg: "text-teal-600" },
  RAVAPI: { icon: "bike", bg: "bg-indigo-100", fg: "text-indigo-600" },
  HONDA_VISION_110: { icon: "scooter", bg: "bg-mintDim/60", fg: "text-mint" },
  HONDA_PCX_125: { icon: "moped", bg: "bg-cyanDim/60", fg: "text-cyan" },
};
