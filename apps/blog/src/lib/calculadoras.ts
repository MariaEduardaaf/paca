/**
 * As calculadoras do blog — fonte única para o menu, a página /calculadoras e
 * o cartão de recirculação dos artigos.
 *
 * `artigos` diz em quais artigos esta é a calculadora certa a oferecer. Um
 * artigo fora de todas as listas recebe a primeira (divisão de contas), que é a
 * que responde ao assunto central do blog.
 */
export interface Calculadora {
  href: string;
  titulo: string;
  resumo: string;
  artigos: string[];
}

export const CALCULADORAS: Calculadora[] = [
  {
    href: "/calculadora-divisao-de-contas",
    titulo: "Calculadora de divisão de contas",
    resumo:
      "Coloque as duas rendas e o total das contas do mês: ela mostra quanto cada um paga na divisão proporcional ao salário, comparado com o meio a meio.",
    artigos: [],
  },
  {
    href: "/calculadora-reserva-de-emergencia",
    titulo: "Calculadora de reserva de emergência",
    resumo:
      "Parte do custo de vida da casa e da estabilidade da renda de cada um: mostra o alvo da reserva, quanto falta e em quantos meses vocês chegam.",
    artigos: ["reserva-de-emergencia-casal", "um-dos-dois-desempregado-financas-casal", "casal-endividado-como-sair-das-dividas"],
  },
  {
    href: "/calculadora-custo-do-casamento",
    titulo: "Calculadora do custo do casamento",
    resumo:
      "Vocês listam os itens do casamento com os próprios valores: ela soma, compara com o que já têm e mostra quanto guardar por mês até a data.",
    artigos: ["quanto-custa-casar", "regime-de-bens-antes-de-casar"],
  },
  {
    href: "/calculadora-meta-a-dois",
    titulo: "Calculadora de meta a dois",
    resumo:
      "Viagem, casa, carro: informe o valor e o prazo e veja quanto guardar por mês, quanto cada um põe e se isso cabe no orçamento do casal.",
    artigos: ["como-juntar-dinheiro-casal", "comprar-casa-juntos-financiamento", "regra-50-30-20-casal", "renda-extra-no-casal"],
  },
];

export function calculadoraPara(artigo: string | undefined): Calculadora {
  return CALCULADORAS.find((c) => artigo && c.artigos.includes(artigo)) ?? CALCULADORAS[0];
}
