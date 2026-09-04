# Brand Context

> Este arquivo é carregado automaticamente por todas as sub-skills de blog. Última atualização: 2026-09-03.
>
> ⚠️ **ESCRITO A PARTIR DE EVIDÊNCIA, NÃO DE ENTREVISTA.** O caminho normal é `/blog brand init`, que
> faz uma entrevista. Este arquivo foi montado lendo os **18 artigos publicados**, as regras duras do
> `CLAUDE.md` deste repositório, e as páginas `/sobre` e `/contato`. **Onde eu inferi, está marcado
> com `[inferido]`** — corrija esses, ou rode `/blog brand update` para refazer com entrevista.

## Audience

- **Primary**: casais brasileiros que dividem a vida e ainda não dividem o dinheiro sem atrito — namoro sério, morando juntos ou casados
- **Secondary**: quem está prestes a morar junto e quer combinar antes de brigar
- **Expertise**: leigo. Não sabe (e não quer saber) jargão financeiro; quer resolver a situação de casa
- **Active problems**:
  - Dividir contas quando os salários são diferentes
  - Pix pingado o mês inteiro em vez de um acerto só
  - Um dos dois controla tudo e o outro não sabe do que é dono
  - Dívida que virou assunto proibido dentro de casa
  - Meta grande (casamento, apê, viagem) que nunca sai do papel
- **Common misconceptions**:
  - "Conta conjunta resolve" — resolve logística, e cria um risco que ninguém conta
  - "Dividir meio a meio é justo" — com salários diferentes, meio a meio aperta sempre o mesmo
  - "É falta de disciplina" — quase sempre é falta de combinado, não de força de vontade

## Positioning

- **Official entity name**: Paca Finance
- **Homepage**: https://blog.pacafinance.com.br
- **Logo**: `apps/blog/public/logo-full.png`
- **sameAs profiles**:
  - https://app.pacafinance.com.br
- **Wikidata Q-ID**: none
- **Mission**: fazer casal brasileiro organizar dinheiro junto sem briga e sem planilha
- **Distinctive POV**: **dinheiro em casal é problema de conversa, não de planilha.** A ferramenta só
  funciona depois que o combinado existe — por isso todo artigo entrega um combinado, não um app
- **What we are NOT**:
  - Não é consultoria de investimento. Não damos recomendação individual, e isso está escrito em `/contato`
  - Não é conteúdo patrocinado. Nenhum texto é pago por marca
  - Não é blog de finanças pessoais genérico: o recorte é **a dois**, sempre
- **Competitors**:
  - Blogs de banco e fintech (Nubank, Serasa): têm autoridade e volume; **nós temos o recorte de casal e um combinado concreto no fim** `[inferido]`
  - Apps de finanças pessoais com blog (Mobills, Organizze): falam com o indivíduo; **nós tratamos a negociação entre duas pessoas** `[inferido]`
  - Criadores de conteúdo de finanças: opinião forte sem fonte; **nós citamos a fonte e dizemos quando não sabemos**

## Editorial Rules

### Always do
- **Toda afirmação numérica leva fonte citada e linkada.** Foi a métrica que mais separou este blog do
  concorrente medido: **93 de 100 posts dele não tinham um único link externo**
- **Terminar com um combinado executável** — algo que o casal consegue fazer no domingo à noite
- **Falar dos dois lados.** Quem ganha mais e quem ganha menos, quem controla e quem não controla
- **Atualizar artigo quando o fato mudar**, e dizer que atualizou (está prometido em `/sobre`)
- **Assinar com pessoa real.** ⚠️ As diretrizes do Google listam por nome *"perfis de autor inventados"*
  como pegada de conteúdo de baixa qualidade — persona fictícia é pior que assinar como time

### Never do
- **Nunca dar recomendação individual de investimento** nem orientação sobre a situação financeira
  específica de alguém — está prometido em `/contato` e é regra de conformidade, não de estilo
- **Nunca clickbait nem promessa agressiva** — regra dura nº 4 do `CLAUDE.md`: mina a marca e atrai
  punição do Meta
- **Nunca prometer enriquecimento, ganho rápido ou "segredo"**
- **Nunca publicar texto patrocinado** sem que ele seja declarado como tal
- **Nunca usar dado do app nem de usuário real** em exemplo — a base de leads do blog é isolada da base
  do app por desenho (LGPD)
- **Nunca julgar o leitor.** Quem chega aqui já está constrangido com o assunto

### Taboo phrases
- "no mundo de hoje", "não é apenas… é", "vale a pena lembrar que", "em suma", "em resumo final"
- "descubra o segredo", "o que os bancos não querem que você saiba"
- "dinheiro fácil", "fique rico", "liberdade financeira" como promessa
- "simplesmente", "basta" (fazem parecer fácil o que não é)
- ⚠️ A lista completa, com as seis famílias e o conserto de cada uma, está em
  `~/.claude/skills/guardiao/SKILL.md`

### Required disclosures
- **Quando o artigo recomendar o app do Paca**, dizer que o app é nosso — está prometido em `/sobre`
- **Conteúdo educativo, não aconselhamento**: decisão sobre o dinheiro é do leitor; caso delicado pede
  profissional habilitado
- **Se houver link de afiliado**, declarar antes do link. Hoje não há nenhum

## Topic Scope

- **In scope**: dividir contas · conta conjunta · orçamento a dois · dívida do casal · reserva de
  emergência · metas conjuntas (casamento, imóvel, viagem) · conversa sobre dinheiro · morar junto
- **Partial scope**: finanças pessoais individuais **quando afetam o casal** (desemprego de um,
  score de crédito de um, cartão adicional). Crédito e financiamento **na ótica dos dois titulares**
- **Out of scope**: recomendação de investimento específico · criptomoeda especulativa · crédito
  predatório e consignado agressivo · **listas de bico e "trabalhe de casa"** · qualquer coisa que
  não passe pela pergunta *"isso muda o combinado de dois adultos?"*

  ⚠️ **A linha acima dizia só "renda extra", e isso estava errado — corrigido em 2026-09-04.**
  A exclusão sempre mirou o gênero de conteúdo: lista de 50 formas de ganhar dinheiro em casa, que é
  o que o blog não quer ser. Escrita como estava, ela também excluía a **decisão do casal sobre um
  segundo trabalho** — que passa no teste desta mesma linha e é assunto legítimo daqui.

  **Como o erro foi descoberto, e por que fica registrado:** o `COMO-ESCREVER.md` listava "renda
  extra" como a maior lacuna do blog, e o tema foi escolhido por ali. Quem pegou a contradição foi o
  agente de escrita, ao ler este arquivo antes de escrever — nenhum script pegaria, porque não é erro
  de forma. **Lacuna medida não é o mesmo que oportunidade: a ausência pode ser fronteira**, e a
  pergunta que separa as duas é se alguém decidiu excluir aquilo de propósito.
- **Recurring formats**: guia com combinado no fim · comparativo de métodos (o proporcional vs. meio a
  meio) · "quanto custa X no Brasil" com números reais e fonte · a conversa difícil, roteirizada
