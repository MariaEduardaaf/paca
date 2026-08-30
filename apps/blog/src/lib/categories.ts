export const CATEGORIES = {
  organizacao: {
    label: "Organização",
    description:
      "Rotinas e métodos práticos para o casal organizar as finanças no dia a dia, sem complicação.",
  },
  "conversas-sobre-dinheiro": {
    label: "Conversas sobre dinheiro",
    description:
      "Como falar de dinheiro a dois sem briga: transparência, combinados e alinhamento de expectativas.",
  },
  "metas-e-sonhos": {
    label: "Metas e sonhos",
    description:
      "Planejamento de objetivos em casal: viagem, casa própria, reserva de emergência e outros sonhos.",
  },
  "dividir-contas": {
    label: "Dividir contas",
    description:
      "Formas justas de dividir as despesas a dois: meio a meio, proporcional à renda e tudo no meio do caminho.",
  },
  ferramentas: {
    label: "Ferramentas",
    description:
      "Apps, métodos e recursos que ajudam o casal a cuidar do dinheiro junto — incluindo o Paca Finance.",
  },
} as const;

export type CategoryId = keyof typeof CATEGORIES;

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];
