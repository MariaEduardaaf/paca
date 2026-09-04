# Como escrever um artigo aqui — guia para a Mary

> Escrito em 2026-09-04, depois de duas peças passarem pela esteira. Isto aqui é para uma pessoa
> ler, não para um robô: o detalhe técnico mora no `CLAUDE.md`.

---

## A regra que vem antes de todas

**Você escolhe o tema. Nenhum agente escolhe pauta.** E, no fim, **você decide se está bom.** Nada
é publicado sem essa leitura — não é formalidade: é o que a política do Google exige de quem serve
anúncio, e é o teu nome que assina.

---

## Os passos, na ordem

### 1. Escolha o tema

Abaixo estão as lacunas **medidas** nos 20 artigos que já existem. O número é quantas vezes o
assunto aparece hoje — quanto menor, maior o buraco:

| assunto | quanto já existe |
|---|---|
| **Renda extra, bico, segundo trabalho** | **0 menções, 0 artigos** ← o maior buraco |
| **Pacto antenupcial: escolher o regime antes de casar** | 2 menções |
| **Quando um sustenta o outro** | 3 menções |
| **Herança e dinheiro que veio de fora** | 3 menções |
| **Filhos: quanto custa, mesada, escola** | 5 menções |

⚠️ **Isto é insumo, não ordem.** Se você tem um assunto que ouviu de alguém de verdade, ele vale
mais que qualquer um desta lista — a lista só diz onde o site está descoberto.

### 2. Abra o terminal **na raiz do projeto**

```bash
cd ~/Developer/mine/paca
```

⚠️ **Isto não é detalhe.** De dentro de `apps/blog/` o sistema **não acha** o `BRAND.md` e o
`VOICE.md`, e o artigo sai com uma voz genérica — **sem avisar ninguém**. Foi medido: da raiz
funciona, de dentro dá `not found` em silêncio.

### 3. Peça o artigo

```
/blog write <o tema, com o que ele precisa responder>
```

Diga o que o artigo **tem que resolver**, não só o assunto. Compare:

- ❌ "escreve sobre renda extra"
- ✅ "renda extra no casal: quando o segundo trabalho compensa e quando ele só troca tempo por
  dinheiro, com uma conta que o casal consiga fazer no papel"

⚠️ **Pule o `/blog discourse`.** Ele procura discussão no Reddit e **em português devolve zero** —
testado. Sai um relatório que é a própria pergunta reescrita.

### 4. Confira os números do texto

```
/blog factcheck
```

Ele abre as fontes citadas e confere. **Número que não confirma sai do texto** — não vira
"aproximadamente". Se o assunto tiver lei envolvida, prefira citar o texto oficial no
`planalto.gov.br` a citar um blog que citou a lei.

### 5. O Guardião — o portão antes de você

```
/guardiao
```

Ele mede três coisas e **reprova de verdade** (já reprovou os dois primeiros artigos):

| o que mede | o que significa se reprovar |
|---|---|
| **Marcas de IA em português** | tem frase de robô: "em suma", "vale ressaltar", "no mundo de hoje" |
| **Cadência de frase** | o texto está uniforme demais — ver o aviso abaixo |
| **Duplicata** | um artigo repete outro em mais de 30% |

### ⚠️ 6. Se reprovar por cadência, NÃO quebre as frases

Esse é o erro que parece conserto. Aconteceu nas duas primeiras peças, e o instinto errado é o
mesmo: "variar" soa como "picotar".

**É o contrário.** Os artigos deste blog têm **19 frases longas para cada 9 curtas**; o rascunho
reprovado tinha **8 longas para 19 curtas**. O texto estava picotado, e picotado mede *baixo*
porque tudo fica no mesmo tamanho pequeno.

> **O conserto é juntar duas ou três frases médias numa longa que encadeie o raciocínio**, com
> vírgula e travessão, e deixar as curtas que já existem darem o golpe.

A pergunta que resolve: *"quantas frases acima de 35 palavras este texto tem?"* Menos de uma dúzia
num artigo de 2.000 palavras é o sintoma.

### 7. Sua leitura

Aqui é você. Reescreva o que soar genérico, corte o que não é seu, resolva o que ficou marcado.
**Nada passa deste ponto sem você.**

### 8. Publicar

Troque `draft: true` por `draft: false` no topo do arquivo, e confira duas coisas:

- **Algum artigo antigo aponta para o novo?** Se nenhum apontar, ele nasce órfão e o Google demora
  meses para achar. Ponha o link onde o texto antigo já pedia — não force.
- **É outro dia?** Publique em dias diferentes, nunca vários de uma vez.

---

## ⚠️ O que ainda não foi testado — para você não se assustar

Sendo honesto sobre o que existe e o que foi provado:

- **Provado, pegou defeito real:** o Guardião, o inventário por URL, o dossiê (`BRAND.md` e
  `VOICE.md`) carregando sozinho.
- **Instalado e nunca usado:** 28 das 31 skills e os 5 agentes do pacote. Nas duas primeiras peças
  a pesquisa e a escrita foram feitas no fio principal, não por eles.

**Consequência prática:** se o `/blog write` fizer algo estranho — pedir imagem de banco, propor
caixa de "Key Takeaways", escrever em inglês —, **não é você errando.** É a primeira vez que
aquela parte roda. Pare, anote o que aconteceu, e a gente conserta a fiação em vez de você
contornar.

---

## Onde as coisas moram

| o quê | onde |
|---|---|
| Os artigos | `apps/blog/src/content/blog/` |
| Quem você é para o blog | `BRAND.md` e `VOICE.md`, na raiz |
| Sua página de autora | `apps/blog/src/pages/autoras/mary-kondratieva.astro` |
| A esteira em detalhe técnico | `CLAUDE.md`, seção *A esteira do blog* |

⚠️ **Uma coisa está esperando por você:** a seção **"Em primeira pessoa"** da tua página de autora
está vazia de propósito. Ninguém devia escrever isso por você — duas ou três frases sobre de onde
vem teu interesse pelo assunto valem mais que qualquer título.
