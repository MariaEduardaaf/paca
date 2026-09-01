/**
 * Categorias do blog — fonte única de verdade.
 *
 * Cada categoria carrega quatro coisas, e cada uma tem um uso próprio:
 *  - `label`: rótulo curto (menu, pílulas, kicker dos cards);
 *  - `description`: uma frase, usada no índice /categorias e como resumo;
 *  - `title`: título da página /categorias/<id>, escrito para busca (vai para
 *    a <title> com o sufixo "| Paca Finance", então cabe em ~45 caracteres);
 *  - `metaDescription`: meta description própria da página de categoria;
 *  - `intro`: parágrafos de abertura da página, escritos para quem chega
 *    daquela busca — o que se resolve ali e o que vai encontrar.
 */
export const CATEGORIES = {
  organizacao: {
    label: "Organização",
    description:
      "Rotinas e métodos práticos para o casal organizar as finanças no dia a dia, sem complicação.",
    title: "Organização financeira para casais",
    metaDescription:
      "Como o casal organiza o dinheiro no dia a dia: o que fica junto, o que fica separado, conta conjunta ou modelo híbrido e a rotina mensal que sustenta o combinado.",
    intro: [
      "Organizar as finanças a dois é decidir três coisas: quanto do dinheiro fica junto, quanto fica separado e quem cuida de quê. Sem esse combinado, todo mês vira negociação — e é aí que a conta atrasa e a conversa azeda.",
      "Os textos daqui tratam da estrutura. Se vale abrir conta conjunta ou manter o modelo híbrido, em que cada um segue com a sua conta e uma terceira paga as despesas da casa. Como adaptar a regra 50/30/20 quando são duas rendas, e não uma. E que rotina mensal — uma revisão curta, sempre no mesmo dia — mantém de pé o que vocês combinaram.",
      "Não existe arranjo certo para todo mundo: um casal com salários parecidos e um casal em que uma renda é o triplo da outra precisam de desenhos diferentes. A ideia é você sair daqui com um modelo que caiba na sua rotina e sobreviva ao mês corrido.",
    ],
  },
  "conversas-sobre-dinheiro": {
    label: "Conversas sobre dinheiro",
    description:
      "Como falar de dinheiro a dois sem briga: transparência, combinados e alinhamento de expectativas.",
    title: "Falar de dinheiro no relacionamento",
    metaDescription:
      "Como conversar sobre dinheiro com quem você ama sem virar briga: a hora certa de trazer o assunto, o que perguntar e como sair do ciclo de discussão sobre gastos.",
    intro: [
      "Quase nenhuma briga por dinheiro é sobre o valor gasto. É sobre o que aquele gasto significou: um combinado que não existia, a sensação de estar bancando mais que o outro, uma dívida que ninguém contou. Enquanto a conversa fica só no número da fatura, o assunto volta no mês seguinte.",
      "Aqui você encontra o roteiro dessas conversas. Quando trazer o tema — nunca no meio da discussão sobre a compra que acabou de aparecer no extrato. Que perguntas revelam o que cada um aprendeu sobre dinheiro em casa, antes de vocês se conhecerem. E o que fazer quando o assunto já virou um ciclo de acusação e defesa que ninguém consegue interromper sozinho.",
      "É conteúdo de organização financeira, não de terapia de casal. Quando o problema deixou de ser combinado e virou confiança quebrada, nenhum método de divisão de contas resolve — e a gente prefere dizer isso do que vender atalho.",
    ],
  },
  "metas-e-sonhos": {
    label: "Metas e sonhos",
    description:
      "Planejamento de objetivos em casal: viagem, casa própria, reserva de emergência e outros sonhos.",
    title: "Metas e sonhos do casal",
    metaDescription:
      "Viagem, casamento ou casa própria: como transformar um sonho do casal em custo real, prazo honesto e um valor mensal que os dois conseguem sustentar.",
    intro: [
      "Um sonho a dois só vira plano quando ganha três números: quanto custa, para quando e quanto sai por mês de cada um. Antes disso ele é intenção — e intenção não sobrevive a um mês apertado.",
      "É esse caminho que os guias daqui percorrem: estimar o custo real (com a folga que quase todo mundo esquece de somar), escolher um prazo que não sufoque o orçamento e definir quanto cada um contribui quando as rendas são diferentes. Inclusive quando um dos dois quer chegar lá mais rápido do que o outro consegue.",
    ],
  },
  "dividir-contas": {
    label: "Dividir contas",
    description:
      "Formas justas de dividir as despesas a dois: meio a meio, proporcional à renda e tudo no meio do caminho.",
    title: "Dividir as contas do casal",
    metaDescription:
      "Meio a meio, proporcional ao salário, conta conjunta ou por responsabilidade: compare os métodos de dividir as despesas do casal, com fórmula e exemplos em reais.",
    intro: [
      "Meio a meio parece a divisão mais justa até a diferença de salário entrar na conta: quem ganha R$ 3.000 e paga metade de tudo compromete uma fatia bem maior da própria renda do que quem ganha R$ 9.000. Por isso a pergunta que resolve não é “quanto cada um paga”, e sim “qual critério nós dois aceitamos”.",
      "Os guias desta seção comparam os arranjos mais usados — 50/50, proporcional à renda, conta conjunta só para as despesas da casa e divisão por responsabilidade —, mostram a fórmula do proporcional com números reais e listam o que costuma ficar de fora da divisão: seguro, IPTU anual, presente para a família dele, o veterinário do gato.",
      "Tem também o caso de quem está indo morar junto e precisa combinar tudo antes da mudança, enquanto ainda dá para ajustar sem ninguém sentir que foi passado para trás.",
    ],
  },
  ferramentas: {
    label: "Ferramentas",
    description:
      "Apps, métodos e recursos que ajudam o casal a cuidar do dinheiro junto — incluindo o Paca Finance.",
    title: "Apps e planilhas de finanças para casal",
    metaDescription:
      "Comparações de apps de finanças para casal e um modelo de planilha de gastos: o que cada ferramenta resolve, quanto custa e quando trocar de método.",
    intro: [
      "Ferramenta nenhuma organiza o dinheiro de ninguém. O que ela faz é baratear a manutenção de um combinado que o casal já tem — se ainda não está claro quem paga o quê, o app novo vira só mais um ícone abandonado na tela.",
      "Aqui a gente compara o que existe: apps de finanças compartilhadas (quanto custam, como se comportam com duas pessoas na mesma conta, onde travam) e a boa e velha planilha, com uma estrutura pronta para copiar e a rotina semanal que faz ela durar mais que duas semanas.",
      "O Paca Finance é nosso e aparece nessas comparações, sempre identificado como tal — com o que ele faz e o que ainda não faz. Quando outra ferramenta serve melhor para o seu caso, o texto diz.",
    ],
  },
} as const;

export type CategoryId = keyof typeof CATEGORIES;

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];
