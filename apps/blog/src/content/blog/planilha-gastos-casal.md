---
title: "Planilha de gastos para casal: modelo grátis e como usar"
description: "Monte uma planilha de gastos para casal em 10 minutos: estrutura pronta para copiar, rotina semanal e quando trocar a planilha por um app."
pubDate: 2026-08-28
category: "ferramentas"
tags: ["planilha", "orçamento", "casal", "google sheets", "controle de gastos"]
draft: false
---

A busca por uma planilha de gastos geralmente começa depois de um susto: a fatura do cartão veio maior do que os dois imaginavam, ninguém sabe dizer para onde foi o dinheiro do mercado, ou a conversa sobre quem pagou o quê virou discussão. Não é exagero — segundo pesquisa da Serasa divulgada em 2025, [53% dos casais apontam dinheiro como o principal motivo de brigas](https://www.cnnbrasil.com.br/economia/financas/mais-de-50-dizem-que-financas-sao-principal-motivo-de-brigas-entre-casais/). Uma planilha bem montada não resolve tudo, mas tira a discussão do campo do "eu acho" e coloca no campo dos números.

Antes de continuar, um aviso honesto sobre o "modelo grátis" do título: não existe arquivo para baixar aqui. O que vocês vão encontrar é a estrutura completa — abas, colunas, categorias e fórmulas escritas por extenso — apresentada em tabelas que vocês copiam para o Google Sheets em uns 10 minutos. Na prática, é melhor assim: montar a planilha do zero faz vocês entenderem cada célula, em vez de herdar um arquivo cheio de abas que ninguém usa.

Ao final, vocês saem com: a estrutura de 3 abas pronta para copiar, as fórmulas de soma e divisão, uma rotina semanal de 10 minutos para a planilha não morrer, e os sinais de que chegou a hora de trocar a planilha por outra ferramenta.

## O que uma planilha de casal precisa controlar

Uma planilha de gastos individual só precisa responder "quanto eu gastei". A de casal precisa responder quatro perguntas — e é aí que a maioria dos modelos prontos falha:

- **Quanto saiu no total?** Todos os gastos conjuntos do mês, somados.
- **Em quê?** Gasto por categoria: mercado, moradia, lazer, transporte.
- **Quem pagou?** Sem a coluna "quem pagou", é impossível fechar as contas no fim do mês.
- **Quem deve quanto a quem?** O acerto final: se um pagou mais do que a parte dele, o outro transfere a diferença via Pix.

Se a planilha de vocês não responde as quatro, ela controla gastos — mas não controla o *casal*. A parte de "quem pagou / quem deve" é justamente o que transforma uma planilha comum numa planilha de casal.

## O modelo pronto para copiar

Três abas. Não mais. Planilha com oito abas é planilha abandonada em dois meses. Crie um arquivo novo no Google Sheets, compartilhe com o parceiro ou a parceira (os dois com permissão de edição) e monte o seguinte:

### Aba 1 — Lançamentos

É onde tudo entra, um gasto por linha. As colunas:

| Coluna | O que registrar | Exemplo |
|---|---|---|
| A — Data | Dia da compra | 05/09/2026 |
| B — Descrição | O que foi, em poucas palavras | Mercado do mês |
| C — Categoria | Escolhida de uma lista fixa (aba 3) | Mercado |
| D — Valor | Em R$ | 487,32 |
| E — Quem pagou | Nome de quem passou o cartão ou fez o Pix | Ana |
| F — Forma | Pix, débito, crédito, boleto, dinheiro | Crédito |
| G — Mês de referência | Competência do gasto | set/2026 |

A coluna G existe por causa do cartão de crédito: uma compra feita dia 28 de setembro pode cair só na fatura de outubro. Decidam uma regra — a mais simples é lançar pelo **mês da compra**, não da fatura — e sigam sempre a mesma.

Dica prática: em C, usem validação de dados (Dados → Validação de dados → lista a partir de intervalo, apontando para a lista de categorias da aba 3). Isso impede que "Mercado", "mercado" e "Supermercado" virem três categorias diferentes e quebrem as somas.

### Aba 2 — Resumo mensal

É a aba que vocês olham na reunião semanal. Uma coluna por mês, e estas linhas:

| Linha | Fórmula sugerida (escrita por extenso) |
|---|---|
| Total gasto no mês | `=SOMASE(Lançamentos!G:G; "set/2026"; Lançamentos!D:D)` |
| Gasto por categoria (uma linha por categoria) | `=SOMASES(Lançamentos!D:D; Lançamentos!C:C; "Mercado"; Lançamentos!G:G; "set/2026")` |
| Quanto a pessoa 1 pagou | `=SOMASES(Lançamentos!D:D; Lançamentos!E:E; "Ana"; Lançamentos!G:G; "set/2026")` |
| Quanto a pessoa 2 pagou | `=SOMASES(Lançamentos!D:D; Lançamentos!E:E; "Bruno"; Lançamentos!G:G; "set/2026")` |
| Quanto cada um *deveria* pagar | Total do mês × porcentagem de cada um (aba 3) |
| Acerto do mês | O que a pessoa pagou − o que deveria pagar |

Se o "acerto" de alguém der negativo, essa pessoa transfere a diferença para a outra. Simples assim — e acaba a conversa de "acho que esse mês eu paguei mais".

### Aba 3 — Configurações

Os dados que mudam pouco: rendas, porcentagens e a lista de categorias com teto mensal.

| Campo | Exemplo |
|---|---|
| Renda da pessoa 1 (Ana) | R$ 6.000 |
| Renda da pessoa 2 (Bruno) | R$ 4.000 |
| Renda total | R$ 10.000 |
| % da pessoa 1 | `=6000/10000` → 60% |
| % da pessoa 2 | `=4000/10000` → 40% |

E logo abaixo, a lista de categorias com limite:

| Categoria | Teto mensal |
|---|---|
| Moradia (aluguel/financiamento + condomínio) | R$ 2.200 |
| Mercado | R$ 1.200 |
| Contas fixas (luz, água, internet) | R$ 450 |
| Transporte | R$ 500 |
| Lazer (restaurantes, streaming, passeios) | R$ 700 |
| Saúde | R$ 400 |
| Imprevistos | R$ 300 |

Sete categorias bastam. Com vinte, cada lançamento vira um debate filosófico sobre onde classificar a pizza de sexta.

## Como preencher: rendas, categorias e divisão

**Rendas primeiro.** Preencham a aba 3 com o líquido que cai na conta de cada um — salário, freelas recorrentes, média dos últimos meses se a renda varia. O 13º e bônus entram no mês em que caem.

**Divisão proporcional é o padrão mais justo quando os salários são diferentes.** No exemplo acima: Ana ganha R$ 6.000 e Bruno R$ 4.000, então Ana cobre 60% dos gastos conjuntos e Bruno 40%. Se o mês fechou em R$ 5.200 de despesas compartilhadas, a conta é: Ana R$ 5.200 × 0,60 = **R$ 3.120**; Bruno R$ 5.200 × 0,40 = **R$ 2.080**. Se na prática Ana pagou R$ 4.000 e Bruno R$ 1.200, o acerto é Bruno transferir **R$ 880** para Ana (R$ 2.080 − R$ 1.200). Vocês podem preferir dividir meio a meio ou juntar tudo — [as três formas de dividir as contas têm prós e contras](/blog/como-dividir-contas-casal), e a planilha funciona com qualquer uma; só muda a linha de porcentagem na aba 3.

<figure class="diagram">
<svg viewBox="0 0 640 296" role="img" aria-label="No mês de R$ 5.200, Ana deveria pagar R$ 3.120 mas pagou R$ 4.000, e Bruno deveria pagar R$ 2.080 mas pagou R$ 1.200; por isso Bruno transfere R$ 880 para Ana.">
  <text class="d-ink" x="0" y="16" font-size="15" font-weight="600">Acerto do mês — despesas conjuntas de R$ 5.200</text>

  <text class="d-muted" x="0" y="52" font-size="13" font-weight="600" letter-spacing="1">ANA — 60%</text>
  <text class="d-ink" x="0" y="84" font-size="14">Pagou</text>
  <rect class="d-track" x="130" y="70" width="380" height="20" rx="10" />
  <rect x="130" y="70" width="380" height="20" rx="10" fill="#E5647A" />
  <text class="d-ink" x="522" y="85" font-size="14" font-weight="700">R$ 4.000</text>
  <text class="d-ink" x="0" y="114" font-size="14">Deveria pagar</text>
  <rect class="d-track" x="130" y="100" width="380" height="20" rx="10" />
  <rect x="130" y="100" width="296" height="20" rx="10" fill="#7A6BB5" />
  <text class="d-ink" x="522" y="115" font-size="14">R$ 3.120</text>

  <text class="d-muted" x="0" y="150" font-size="13" font-weight="600" letter-spacing="1">BRUNO — 40%</text>
  <text class="d-ink" x="0" y="182" font-size="14">Pagou</text>
  <rect class="d-track" x="130" y="168" width="380" height="20" rx="10" />
  <rect x="130" y="168" width="114" height="20" rx="10" fill="#E5647A" />
  <text class="d-ink" x="522" y="183" font-size="14" font-weight="700">R$ 1.200</text>
  <text class="d-ink" x="0" y="212" font-size="14">Deveria pagar</text>
  <rect class="d-track" x="130" y="198" width="380" height="20" rx="10" />
  <rect x="130" y="198" width="198" height="20" rx="10" fill="#7A6BB5" />
  <text class="d-ink" x="522" y="213" font-size="14">R$ 2.080</text>

  <line class="d-rule" x1="0" y1="244" x2="640" y2="244" />
  <rect x="0" y="266" width="14" height="14" rx="4" fill="#2F8F7C" />
  <text class="d-ink" x="26" y="278" font-size="14" font-weight="600">Bruno transfere R$ 880 para Ana — um Pix só, no fim do mês</text>
</svg>
<figcaption>A linha de acerto é a diferença entre o que cada um pagou e o que deveria pagar: Bruno ficou R$ 880 abaixo da parte dele, então esse é o valor do Pix.</figcaption>
</figure>

**Para definir os tetos por categoria**, um bom ponto de partida é a regra 50/30/20 popularizada por Elizabeth Warren: até 50% da renda para necessidades, 30% para desejos, 20% para poupar. No exemplo de renda total de R$ 10.000, isso significa até R$ 5.000 em moradia, mercado e contas, até R$ 3.000 em lazer e desejos, e R$ 2.000 guardados. Explicamos [como adaptar a regra 50/30/20 para a realidade de casal](/blog/regra-50-30-20-casal) em outro artigo — os tetos da tabela acima são só um exemplo, ajustem à renda de vocês.

**O que entra na planilha:** só gastos conjuntos. O gasto pessoal de cada um (academia, presente para amigo, hobby) fica fora — cada um administra o seu. Misturar tudo é o caminho mais rápido para um fiscalizar o cafezinho do outro.

## Rotina de 10 minutos por semana

Planilha não morre por falta de fórmula; morre por falta de rotina. O combinado que funciona:

1. **Escolham um dia e horário fixos** — domingo à noite, 10 minutos, celular na mão. Sempre o mesmo dia.
2. **Cada um lança os próprios gastos da semana** (3–4 min). Abram o extrato do banco e a fatura parcial do cartão no app e copiem o que for conjunto. Não confiem na memória: extrato é a fonte da verdade.
3. **Olhem o Resumo juntos** (3 min). Alguma categoria já passou de 80% do teto na metade do mês? É sinal amarelo — decidam juntos o que segurar.
4. **Sem julgamento no lançamento.** A regra de ouro: registrar não é prestar contas. Comentário sobre gasto só na conversa mensal, nunca na hora de digitar.
5. **No fim do mês, um acerto só.** Fechem o mês, vejam a linha de acerto e façam um único Pix. Acertar toda semana gera atrito à toa.

Dez minutos por semana somam ~40 minutos por mês. É o custo real de manter planilha — vale saber disso antes de começar.

## Erros que fazem casais abandonarem a planilha

Quando uma planilha de casal morre, ela costuma morrer cedo — nos primeiros dois ou três meses. E quase sempre por um destes motivos:

- **Deixar para digitar tudo no fim do mês.** Sessenta lançamentos acumulados viram uma hora de digitação chata, ninguém lembra o que foi "PAG*JOSE SILVA R$ 89,90", e a planilha atrasa até ser abandonada.
- **Categoria demais.** Se "Padaria", "Mercado" e "Hortifruti" são categorias separadas, cada compra exige uma decisão. Sete categorias, no máximo dez.
- **Só um dos dois preenche.** A planilha vira "a planilha dela", o outro se desliga, e quem digita se ressente. Cada um lança o que pagou — inegociável.
- **Ignorar a competência do cartão.** Sem regra clara para fatura, os totais nunca batem com o extrato e a planilha perde credibilidade.
- **Usar a planilha como tribunal.** Se todo lançamento vem com um "precisava mesmo?", a pessoa para de lançar — e às vezes passa a esconder gasto, que é o começo de um problema bem maior.
- **Não ter rotina fixa.** "A gente atualiza quando der" significa nunca.

Reparem que quase todos os erros têm a mesma raiz: **digitação manual**. É trabalho repetitivo, chato, fácil de adiar — e quando atrasa, compromete todo o resto.

## Quando a planilha deixa de dar conta

Sinais claros de que vocês estão gastando mais energia mantendo a ferramenta do que ela devolve: lançamentos atrasados há duas semanas, discussões sobre "quem esqueceu de anotar", três cartões e duas contas para conferir, e a reunião de domingo virando sessão de digitação em vez de conversa sobre dinheiro.

Foi exatamente para eliminar essa digitação que ferramentas como o **Paca Finance** existem: em vez de copiar o extrato para a coluna D, um de vocês fotografa a notinha do mercado e a IA extrai valor, data e categoria sozinha — e o lançamento já aparece em tempo real para o outro, com a divisão calculada. Dá para testar no plano grátis, sem compromisso, em [paca-web-twmh.vercel.app](https://paca-web-twmh.vercel.app). A ressalva honesta: se a planilha de vocês já roda há meses sem atrito, trocar de ferramenta só por trocar não vale o custo da mudança — app resolve o problema de quem *abandona* planilha, não de quem mantém uma feliz. Se vocês estão nesse dilema, temos um [comparativo dos apps de finanças para casal](/blog/melhor-app-financas-casal) que inclui prós e contras de cada opção (planilha inclusive).

## Perguntas frequentes

### Qual a melhor planilha de gastos para casal?

A que os dois efetivamente preenchem. Em termos de estrutura, o mínimo são três abas: lançamentos (com coluna de quem pagou), resumo mensal (com o acerto de quem deve a quem) e configurações (rendas, porcentagens e tetos por categoria) — exatamente o modelo deste artigo. Desconfiem de planilhas muito elaboradas, com dezenas de abas e gráficos: complexidade é o principal motivo de abandono.

### Como fazer uma planilha de gastos de casal no Google Sheets?

Criem um arquivo novo, compartilhem com edição para os dois e montem as três abas descritas acima: Lançamentos (data, descrição, categoria, valor, quem pagou, forma, mês), Resumo mensal (com `SOMASE` e `SOMASES` somando por mês, categoria e pessoa) e Configurações (rendas e categorias). Com as tabelas deste artigo abertas do lado, leva cerca de 10 minutos. Usem validação de dados na coluna de categoria para evitar erros de digitação.

### Planilha ou aplicativo: o que é melhor para controlar gastos a dois?

Planilha ganha em flexibilidade e custo zero; perde em esforço — alguém precisa digitar cada gasto, toda semana, para sempre. App ganha em automação (leitura de notinha, sincronização em tempo real entre os dois celulares, alertas de orçamento); a contrapartida é menos personalização e, nos recursos avançados, assinatura. Regra prática: se vocês nunca mantiveram um controle por mais de três meses, o problema provavelmente é a digitação — comecem por um app. Se adoram personalizar e têm disciplina, a planilha serve bem.

### Como dividir os gastos na planilha quando os salários são diferentes?

Pela divisão proporcional: cada um cobre a porcentagem da renda total que representa. Ganhou R$ 6.000 num casal que soma R$ 10.000? Cobre 60% dos gastos conjuntos. Na planilha, isso é uma célula na aba de configurações (`=renda individual / renda total`) multiplicada pelo total do mês no resumo. Meio a meio só costuma ser sustentável quando os salários são próximos — com diferença grande, quem ganha menos fica sem sobra e a divisão "igual" vira injusta.

### Com que frequência precisamos atualizar a planilha?

Uma vez por semana, em dia e horário fixos, cada um lançando os próprios gastos — 10 minutos no total. Atualizar diariamente é ideal em teoria, mas insustentável na prática; mensalmente é pouco, porque 60 lançamentos acumulados desestimulam qualquer um e vocês só descobrem o estouro da categoria quando já aconteceu. Semanal é o equilíbrio: rápido o bastante para virar hábito, frequente o bastante para corrigir o rumo no meio do mês.
