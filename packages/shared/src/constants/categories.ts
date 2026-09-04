export const DEFAULT_CATEGORIES = [
  { name: "Alimentacao", icon: "utensils", color: "#FF6B6B" },
  { name: "Transporte", icon: "car", color: "#4ECDC4" },
  { name: "Moradia", icon: "home", color: "#45B7D1" },
  { name: "Lazer", icon: "gamepad-2", color: "#96CEB4" },
  { name: "Saude", icon: "heart-pulse", color: "#FF8FB1" },
  { name: "Educacao", icon: "graduation-cap", color: "#DDA0DD" },
  { name: "Compras", icon: "shopping-bag", color: "#F7DC6F" },
  { name: "Entretenimento", icon: "clapperboard", color: "#BB8FCE" },
  { name: "Outros", icon: "ellipsis", color: "#AEB6BF" },
] as const;

export const TRANSACTION_TYPES = {
  income: { label: "Receita", color: "#4ECDC4" },
  expense: { label: "Despesa", color: "#FF6B6B" },
} as const;

export const BUDGET_THRESHOLDS = {
  normal: 0.8,
  warning: 0.99,
  exceeded: 1.0,
} as const;

export const INVITE_CODE_PREFIX = "PACA";
// Legacy client-generated codes were 4 chars; the create_couple RPC issues 10.
export const INVITE_CODE_MIN_LENGTH = 4;
export const INVITE_CODE_MAX_LENGTH = 10;
