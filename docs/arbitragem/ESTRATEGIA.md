# Estratégia de monetização por conteúdo (arbitragem de tráfego) — Paca Finance

> Documento de estratégia para a **IA e a dona do projeto**. Explica o modelo de negócio de monetizar o
> blog com anúncio + tráfego pago, e como aplicá-lo ao Paca Finance. O passo-a-passo concreto (arquivos,
> deploy, integrações) está em [`PLANO-DE-ACAO.md`](./PLANO-DE-ACAO.md).
>
> Este documento é **auto-contido e genérico** de propósito: números aqui são faixas de mercado, não
> dados de nenhuma empresa específica.

---

## 1. O modelo em uma frase

**Comprar atenção barata (Meta Ads) e revender cara em anúncio (Google/AdX) no conteúdo do blog.**

```
LUCRO = receita de anúncio no blog  −  custo de mídia pago ao Meta
```

Nome técnico: **arbitragem de tráfego**. É legítimo e comum. O que separa quem lucra de quem queima
dinheiro é uma coisa só: **medir**, e manter **custo por lead (CPL) abaixo da receita por sessão (RPS)**.

---

## 2. A régua econômica — o que governa tudo

| Sigla | O que é | Quem controla |
|---|---|---|
| **CPL** | Custo por lead/clique (o Meta cobra) | a compra de mídia (criativo, público) |
| **RPS** | Receita por sessão (o anúncio paga) | a monetização do blog (formato, nicho, eCPM) |

**A regra de decisão:**
```
CPL ≤ RPS            → escalar
RPS < CPL ≤ RPS×1,30 → observar (zona de tolerância de 30%)
CPL > RPS×1,30       → pausar e trocar o criativo
```

⚠️ **O segredo que quase ninguém enxerga:** o CPL pode ser *maior* que o RPS e a operação ainda lucrar —
**se uma mesma pessoa gerar várias sessões**. O RPS é por sessão; o CPL é por lead. O que multiplica
sessões sobre o mesmo lead pago é o **reengajamento** (e-mail/push que traz a pessoa de volta ao blog).
**É aí que a margem se fecha** (seção 6). Sem reengajamento, o tráfego pago sozinho raramente paga.

---

## 3. Faixas de referência (mercado — use como ordem de grandeza, não promessa)

- **Formatos de "recompensa" (offerwall / rewarded)** pagam **muito mais** que display comum — costuma
  ser ~5× o eCPM. É onde está o dinheiro.
- **Interstitial** (tela cheia entre navegações) fica no meio.
- **Display no conteúdo / anchor** é o piso.
- **Finanças é dos nichos de maior eCPM** (crédito, empréstimo, cartão, seguro, investimento). Tráfego
  em inglês/EUA vale múltiplos do BR, mas o BR é onde o Paca já tem conteúdo e público.

**O RPS real do Paca ninguém sabe ainda** — ele só aparece medindo (Fase 1 do plano). Toda decisão de
escala depende desse número.

---

## 4. O nicho — e por que o Paca já está bem posicionado

O blog do Paca é **finanças para casais (pt-BR)**. Isso é uma vantagem:
- Finanças = eCPM alto.
- O conteúdo e o SEO já existem (11 artigos, JSON-LD, sitemap).
- Ângulos naturais de alto tráfego e alto valor: **crédito, sair das dívidas, score, cartão, planilha de
  gastos, "melhor app de finanças pra casal", renda extra, organizar as contas a dois.**

Mantenha o conteúdo **honesto e informativo**. Clickbait forte e promessas agressivas atraem punição do
Meta (seção 7) e minam a marca do app.

---

## 5. O funil

```
[1] Anúncio no Meta (por ângulo/nicho)
      ↓ clique barato
[2] Artigo do blog (conteúdo útil + anúncio na primeira dobra)
      ↓
[3] Formato de recompensa (offerwall/rewarded) + display no conteúdo
      ↓ captura
[4] E-mail (com consentimento LGPD)
      ↓ reengaja de graça
[5] E-mail/push recorrente → traz a pessoa de volta ao blog (receita sem novo custo de mídia)
```

**Estrutura do artigo = estrutura de receita:** título curto pro anúncio aparecer junto do título na
primeira dobra; conteúdo que segura (o SEO/TOC do Paca já ajuda); CTA e captura no fim.

---

## 6. Reengajamento — onde o lucro realmente está

O tráfego pago sozinho tende a empatar. O que vira o resultado para positivo é trazer a mesma pessoa de
volta **de graça**:
- **E-mail** (o mais estável): capturado no blog com consentimento, dispara conteúdo que reconduz aos
  artigos.
- **Push web** e, mais pra frente, **push do app mobile** do Paca.
- **Métrica que decide:** medir o retorno do reengajamento **separado** do tráfego pago inicial.

---

## 7. ⚠️ Fronteira de compliance — o que NÃO fazer

Existe uma versão "agressiva" desse modelo que escala rápido e **quebra** (contas banidas, multa). O Paca
deve rodar a versão **sólida**:

| Não fazer | Por quê | Fazer no lugar |
|---|---|---|
| Contas de Meta falsas / perfis "de contingência" / geo forjada | Viola os termos do Meta; contas caem o tempo todo | **Contas legítimas** no CNPJ do Paca |
| Ferramentas de terceiro por engenharia reversa | Viola ToS; quebra sozinho | Ferramentas oficiais (APIs suportadas) |
| Offerwall/pop-up pesado em tudo | O Meta pune como "landing de baixa qualidade" → mídia encarece em silêncio | Formatos de recompensa **com moderação**; conteúdo real acima do anúncio |
| Captura de e-mail sem base legal | LGPD (multa, exposição) | Consentimento específico p/ marketing + aviso de privacidade + descadastro, **desde o 1º e-mail** |
| Clickbait/promessa agressiva | Rejeição, ban, dano à marca | Conteúdo informativo e honesto (é o nicho do app) |

**A vantagem defensável não é escalar rápido — é medir.** A medição (a "Caju", tag que a dona já
construiu) é o que permite rodar a versão sólida: contas legítimas, monetização legítima, reengajamento
consentido, e o placar que diz exatamente o que dá lucro.

---

## 8. Resumo

1. Blog de finanças (já existe) + anúncio + medição + tráfego pago.
2. Régua: CPL ≤ RPS×1,30. Priorizar formatos de recompensa (eCPM ~5× o display).
3. Funil: anúncio → artigo → recompensa → e-mail → reengajamento (**onde o lucro fecha**).
4. Fase 1 mede o RPS real antes de escalar. Nunca escalar mídia além do que o recebimento financia.
5. Versão sólida: contas legítimas, LGPD desde o dia 1, conteúdo honesto, offerwall com moderação.

→ Próximo: [`PLANO-DE-ACAO.md`](./PLANO-DE-ACAO.md) para os passos concretos neste repositório.
