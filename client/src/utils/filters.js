// Фильтры, поддерживаемые сервером (значение filter у фото).
// css — как фильтр отображается на клиенте.
export const FILTER_OPTIONS = [
  { value: "none", label: "Оригинал", css: "none" },
  { value: "sepia", label: "Сепия", css: "sepia(0.85)" },
  { value: "grayscale", label: "Чёрно-белый", css: "grayscale(1)" },
  {
    value: "vintage",
    label: "Винтаж",
    css: "sepia(0.35) contrast(1.1) saturate(0.8) brightness(0.96)",
  },
  {
    value: "warm",
    label: "Тёплый",
    css: "sepia(0.25) saturate(1.4) hue-rotate(-12deg) brightness(1.03)",
  },
  {
    value: "cool",
    label: "Холодный",
    css: "saturate(1.1) hue-rotate(18deg) brightness(1.04)",
  },
];

export const getFilter = (value) =>
  FILTER_OPTIONS.find((f) => f.value === value) ?? FILTER_OPTIONS[0];
