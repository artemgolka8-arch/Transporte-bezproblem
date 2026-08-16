import { TranslationKey } from "@/lib/i18n/translations";
import { VehicleBrand } from "@/lib/brands";

// Цвет техники — сейчас используется для скутеров: влияет на автоподбор фото
// (см. SCOOTER_COLOR_PHOTOS) и на цвет заглушки-иконки, если фото не задано.
export type VehicleColor =
  | "BLACK"
  | "WHITE"
  | "GRAY"
  | "RED"
  | "BLUE"
  | "GREEN"
  | "YELLOW"
  | "ORANGE";

export const SCOOTER_COLOR_OPTIONS: VehicleColor[] = [
  "BLACK",
  "WHITE",
  "GRAY",
  "RED",
  "BLUE",
  "GREEN",
  "YELLOW",
  "ORANGE",
];

export const COLOR_LABEL_KEYS: Record<VehicleColor, TranslationKey> = {
  BLACK: "color_black",
  WHITE: "color_white",
  GRAY: "color_gray",
  RED: "color_red",
  BLUE: "color_blue",
  GREEN: "color_green",
  YELLOW: "color_yellow",
  ORANGE: "color_orange",
};

// Цвет для отображения кружка-образца в выборе цвета и для подкраски
// заглушки-иконки, пока для этого цвета не загружено настоящее фото.
export const COLOR_SWATCH: Record<VehicleColor, string> = {
  BLACK: "#1c1c1e",
  WHITE: "#f4f4f5",
  GRAY: "#8b8b93",
  RED: "#e5484d",
  BLUE: "#3b82f6",
  GREEN: "#22c55e",
  YELLOW: "#eab308",
  ORANGE: "#f97316",
};

// Реальные фото техники по марке+цвету — заполняются вручную по мере появления
// фотографий (кладите файлы в /public/scooters и прописывайте путь сюда).
// Пока фото для конкретного цвета не добавлено — подставляется дефолтное фото
// марки (BRAND_DEFAULT_PHOTOS), а если и его нет — цветная иконка-заглушка
// в цвете, который выбран для этой единицы техники.
export const SCOOTER_COLOR_PHOTOS: Partial<Record<VehicleBrand, Partial<Record<VehicleColor, string>>>> = {
  // Пример после добавления фото:
  // HONDA_VISION_110: { RED: "/scooters/honda-vision-110-red.jpg", BLACK: "/scooters/honda-vision-110-black.jpg" },
};
