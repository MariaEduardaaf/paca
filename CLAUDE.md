# Paca Finance — instruções do projeto

App de **finanças para casais** — controlar gastos, orçamento, contas e metas em conjunto.

## Estrutura

Monorepo **Turborepo** (npm workspaces), três apps:
- `apps/web` — React 18 + Vite + React Router 7 + Tailwind (SPA, deploy Vercel).
- `apps/mobile` — Expo 52 + React Native + Expo Router + NativeWind.
- `apps/blog` — **Astro 5 estático** (SEO pt-BR "finanças para casais"), deploy Vercel separado.

Backend: **Supabase** (Auth, Postgres + RLS, Edge Functions). Docs vivos: `README.md`, `TODO.md` (status
atual), `PLAN.md`, `supabase/RUNBOOK.md`.

Idioma: código em inglês; conteúdo do blog em pt-BR.

## Monetização por conteúdo (arbitragem de tráfego) — LER ANTES de mexer no blog

O `apps/blog` é o veículo para monetizar com anúncio + tráfego pago (comprar tráfego no Meta, monetizar
os artigos com anúncio do Google/AdX). A estratégia completa e o passo-a-passo estão em:

- **[`docs/arbitragem/ESTRATEGIA.md`](docs/arbitragem/ESTRATEGIA.md)** — o modelo, a economia (CPL < RPS),
  o funil, o reengajamento, e a **fronteira de compliance** (o que NÃO fazer).
- **[`docs/arbitragem/PLANO-DE-ACAO.md`](docs/arbitragem/PLANO-DE-ACAO.md)** — checklist concreto neste
  repositório (deploy do blog, `ads.txt`, injeção de anúncio/pixel/medição, captura de e-mail, escala).

**Regras duras desta frente (não quebrar):**
1. **Contas legítimas** (Meta/monetização no CNPJ) — nunca perfis falsos ou geo forjada.
2. **LGPD desde o 1º e-mail** — consentimento explícito p/ marketing, aviso de privacidade, descadastro.
3. **Leads do blog isolados dos dados dos usuários do app** — bases e consentimentos separados.
4. **Conteúdo honesto** — sem clickbait/promessa agressiva (mina a marca e atrai punição do Meta).
5. **Offerwall/anúncio de recompensa com moderação** — excesso faz o Meta encarecer a mídia em silêncio.
6. **Caixa:** nunca escalar a compra de mídia mais rápido do que o recebimento do anúncio financia.

Ao adicionar artigos: criar `.md` em `apps/blog/src/content/blog/` (o Astro gera rota/sitemap/RSS/JSON-LD
sozinho). Categoria nova exige editar `apps/blog/src/content.config.ts` **e** `apps/blog/src/lib/categories.ts`.

---

# A esteira do blog — como um artigo nasce aqui

> **Escrita em 2026-09-03.** Mora **neste arquivo, e não dentro do pacote `claude-blog`**, de
> propósito: atualizar o pacote sobrescreve as skills dele, e levaria a fiação junto.
>
> ⚠️ **A esteira já existe e é mais curta do que parece.** `/blog write` sozinho roda **sete passos
> internos com três agentes e cinco portões** (pesquisa → esboço → redação → SEO → nota de 100 →
> contrato de entrega com no máximo 3 iterações → entrega). Não reorquestre isso à mão.

## O contexto que carrega sozinho

`BRAND.md` e `VOICE.md` **na raiz deste repositório** são lidos automaticamente por toda skill que
escreve, revisa ou pontua. Precedência: **BRAND** manda em posicionamento, público, tabus e escopo;
**VOICE** manda em tom, teto de frase e pessoa do verbo.

⚠️ **Rode os comandos de blog a partir da RAIZ do repositório**, não de `apps/blog/`. O carregador
procura os dois arquivos na raiz — de dentro de `apps/blog/` ele não acha, e o artigo sai com voz
genérica sem avisar ninguém.

## A ordem

| # | passo | comando | quem faz |
|---|---|---|---|
| 1 | **Pauta** | `/blog strategy` · `/blog cluster` · `/blog calendar` | ⛔ **VOCÊ decide o tema.** Nenhum agente escolhe pauta |
| 2 | Escuta do campo | `/blog discourse <tema>` | agente — gera `DISCOURSE.md`, que também carrega sozinho |
| 3 | Briefing | `/blog brief` · `/blog outline` | agente |
| 4 | **O artigo inteiro** | `/blog write` | agente — já inclui pesquisa, redação, SEO, nota e os 5 portões |
| 5 | Checagem de fato | `/blog factcheck` | agente — abre as URLs citadas e confere |
| 6 | ⛔ **O GUARDIÃO** | `/guardiao` | **portão obrigatório — ver abaixo** |
| 7 | ⛔ **Leitura final** | — | **VOCÊ.** Nada passa daqui sem você |
| 8 | Imagem e distribuição | `/blog image` · `/blog chart` · `/blog repurpose` | agente, **só depois da sua liberação** |
| 9 | Medição | ver *O laço*, abaixo | agente |

## ⚠️ Regra 1 — o Guardião é obrigatório, e o pacote não o tem

O contrato de entrega do `claude-blog` mede **qualidade** (nota de 100, links, estrutura). Ele **não**
pergunta *"isto põe a conta de anúncio em risco?"*, e o detector de IA dele **usa listas só em
inglês** — medido: deu `0,03 marcas/mil` num corpus em português que não estava limpo.

**Então:** nenhum artigo vai ao ar sem `/guardiao`. Ele mede três coisas em português (marcas de IA,
uniformidade de cadência contra a voz medida, quase-duplicata entre artigos) e roda o checklist de
política do AdSense, do Meta e da LGPD.

**Por que isso é conformidade e não capricho** — está escrito na política do Google Publisher:
*"Don't place ads on automatically generated content without manual review or curation."* E infringir
a política de spam da Busca pode desativar os anúncios, não só derrubar o ranking.

## ⚠️ Regra 2 — ritmo constante, nunca lote

**2 a 3 artigos por semana, em dias diferentes.** Medido em caso público: indexação em 90 dias foi de
**87 %** com publicação faseada contra **41 %** publicando 80 de uma vez.

**E `pubDate` é o dia em que o artigo foi ao ar de verdade.** Se quiser cadência espaçada, espace a
publicação — não a data. (Os 18 primeiros artigos entraram em 3 commits com datas de 18 dias; fica
como está, mas não repita.)

## ⚠️ Regra 3 — quem decide no empate

| discordância | decide |
|---|---|
| Pesquisa diz um número, Checagem diz outro | **Checagem** — ela confere contra a fonte |
| Edição quer cortar, SEO quer manter a palavra-chave | **Edição** — texto que não se lê não ranqueia |
| Guardião reprova e a redação discorda | **Guardião**, e ele nomeia a regra |
| Voz, ângulo, opinião, o que o artigo defende | **VOCÊ, sempre** |

**A cláusula que faz funcionar:** arbitragem sua que se repetir **duas vezes** vira linha no
`BRAND.md` ou no `VOICE.md`. Sem isso você arbitra a mesma coisa para sempre.

## ⚠️ Regra 4 — território declarado

Dois agentes não tocam o mesmo arquivo. Antes de despachar em paralelo, pergunte: *"os dois podem
querer escrever a mesma frase?"* Se puderem, rodam em série, ou o segundo recebe a saída do primeiro.

## O laço fecha na URL, não no artigo

**96,55 % das páginas da web não recebem tráfego nenhum do Google** (Ahrefs, ~14 bilhões de páginas).
Medir "o blog" esconde isso. Toda semana:

```bash
# inventário local + decisão por URL (funciona sem Search Console)
python3 ~/.claude/scripts/inventario_urls.py apps/blog/src/content/blog
python3 ~/.claude/scripts/inventario_urls.py apps/blog/src/content/blog --gsc <export.csv>

# saúde do site inteiro: órfãos, canibalização, conteúdo velho
/blog audit apps/blog/src/content/blog
```

⚠️ **`/blog decay` é melhor que o `inventario_urls.py` — mas só quando houver histórico.** Ele exige
**dois** exports do Search Console para comparar período contra período. Com o blog novo, não roda.
**Troque para ele quando existirem dois trimestres.**

## O que NÃO fazer

- **Não criar agente novo por blog.** Os agentes são globais; o que muda por blog é o dossiê
  (`BRAND.md`, `VOICE.md`). Seis cópias por blog divergem em silêncio.
- **Não partir a escrita em vários agentes.** Coleta se separa (pesquisa, checagem, imagem);
  composição não — voz, argumento e ritmo têm de fechar como peça só.
- **Não rodar `/blog write` de dentro de `apps/blog/`** — perde `BRAND.md` e `VOICE.md`.
