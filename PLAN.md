# Paca Finance — Plano Completo da Aplicacao

> **Status (verificado 2026-06-27):** este é o documento de **planejamento original (pré-build)**. A maior parte já foi construída — o estado vivo está no `TODO.md` da raiz. Duas correções de fato: (1) a IA de scan/advisor usa **Google Gemini 2.5 Flash** (`generativelanguage.googleapis.com`), **não** "Claude Vision" (corrigido abaixo em §4.2 e §9.1); (2) as §8 (schema) e §9 (functions) são o plano original e estão **incompletas** — o schema real tem ~15 tabelas (inclui `bills`, `subscriptions`, `usage_stats`, `purchase_advice`, `partner_offers`, `push_tokens`) e existem **8** edge functions (a `monthly-summary` listada em §9.4 nunca foi criada). Ver `supabase/migrations/` e `supabase/functions/`.

## Visao Geral

App de financas para casais. Dois parceiros compartilham o mesmo "casal" e gerenciam juntos: transacoes, orcamentos, metas e contas. Sincronizacao em tempo real — quando um adiciona uma despesa, o outro ve na hora.

---

## 1. Autenticacao & Pareamento

### 1.1 Cadastro
- Criar conta com email + senha (Supabase Auth)
- Login social: Google, Apple
- Opcao de login biometrico (FaceID / Fingerprint) no mobile

### 1.2 Pareamento do Casal
- **Criador**: cria o casal e recebe um codigo de convite (ex: `PACA-7F3K`)
- **Parceiro(a)**: entra o codigo ou abre link de convite (`pacafinance.app/invite/PACA-7F3K`)
- Ao parear, ambos compartilham os mesmos dados (transacoes, orcamentos, etc)
- Opcao de definir apelidos (ex: "Eu" e "Meu Amor")
- Opcao de adicionar foto de perfil de cada um

### 1.3 Seguranca
- Row Level Security (RLS) no Supabase — dados isolados por `couple_id`
- Tokens JWT com refresh automatico
- Biometria opcional para abrir o app
- Logout remoto (desconectar dispositivos)

---

## 2. Dashboard (Tela Principal)

### 2.1 Saudacao
- "Ola, [apelido]!" com emoji
- Subtitulo contextual baseado na hora ("Bom dia", "Boa tarde", "Boa noite")

### 2.2 Saldo Total do Casal
- Card em gradiente rosa mostrando saldo combinado
- Atualizado em tempo real
- "Atualizado hoje" com timestamp

### 2.3 Saldos Individuais
- Card "Eu" — saldo individual do usuario logado
- Card "Parceiro(a)" — saldo do parceiro
- Avatar + nome de cada um

### 2.4 Resumo do Mes
- Card Receitas (verde) — total de entradas do mes
- Card Despesas (vermelho) — total de saidas do mes
- Porcentagem de variacao vs mes anterior

### 2.5 Grafico de Gastos (Desktop)
- Grafico de barras por categoria
- Cores diferenciadas por categoria
- Labels com valores

### 2.6 Ultimas Transacoes
- Lista das 5 transacoes mais recentes
- Icone da categoria + nome + valor (colorido por tipo)
- Link "Ver todas" que leva para tela de Transacoes

### 2.7 Notificacoes
- Icone de sino no topo
- Badge com contagem de nao lidas
- Tipos: parceiro adicionou transacao, orcamento estourou, meta atingida

---

## 3. Transacoes

### 3.1 Listagem
- Lista agrupada por data ("Hoje", "Ontem", "15 Mar", etc)
- Cada item: icone categoria + descricao + quem pagou + valor
- Cores: verde para receitas, vermelho para despesas
- Scroll infinito com carregamento sob demanda

### 3.2 Filtros
- **Por pessoa**: Todas, Eu, Parceiro(a)
- **Por tipo**: Receitas, Despesas
- **Por categoria**: Alimentacao, Transporte, Moradia, etc
- **Por periodo**: Seletor de mes (< Marco 2026 >)
- **Busca**: campo de texto para buscar por descricao

### 3.3 Resumo Mensal
- Card com total de receitas vs despesas do mes filtrado
- Barra visual de comparacao

### 3.4 Tabela (Desktop)
- Colunas: Descricao, Quem, Categoria, Data, Valor
- Cabecalho fixo com scroll no corpo
- Ordenacao por coluna (clicavel)

### 3.5 Detalhes da Transacao
- Ao clicar em uma transacao, abre detalhes:
  - Valor completo
  - Descricao
  - Categoria com icone
  - Quem pagou
  - Data e hora
  - Notas/observacoes
  - Opcao de editar ou excluir

---

## 4. Nova Transacao

### 4.1 Formulario Manual
- **Tipo**: Toggle Despesa / Receita
- **Valor**: Input numerico grande e centralizado (teclado numerico no mobile)
- **Descricao**: Campo de texto livre
- **Categoria**: Dropdown com icones
  - Alimentacao, Transporte, Moradia, Lazer, Saude, Educacao, Compras, Entretenimento, Outros
  - Opcao de criar categoria personalizada
- **Quem pagou**: Pills com avatar (Eu / Parceiro(a))
- **Data**: Date picker (default: hoje)
- **Notas**: Campo opcional para observacoes
- **Botao**: "+ Adicionar Transacao" (gradiente rosa)

### 4.2 Scan Inteligente (IA)
- Botao "Escanear" com icone de camera
- Usuario tira foto ou envia print de:
  - Notificacao de Pix
  - Extrato bancario (Nubank, Inter, Itau, etc)
  - Comprovante de cartao
  - Cupom fiscal
- Imagem enviada para Supabase Edge Function → **Google Gemini 2.5 Flash** (Vision) <!-- corrigido 2026-06-27: era "Claude Vision API"; o código usa Gemini via GEMINI_API_KEY -->

- IA extrai automaticamente:
  - Valor
  - Descricao/estabelecimento
  - Categoria (inferida)
  - Data
  - Tipo (despesa/receita)
- Pre-preenche o formulario para o usuario confirmar
- Indicador de confianca da IA (ex: 95%)
- Opcao de corrigir antes de salvar

### 4.3 Scan em Lote
- Enviar foto do extrato completo do mes
- IA identifica TODAS as transacoes da imagem
- Lista para revisao antes de salvar em massa
- Deteccao de duplicatas (avisa se transacao ja existe)

### 4.4 Transacao Recorrente
- Opcao de marcar como recorrente (mensal, semanal, etc)
- Gera automaticamente nos proximos meses
- Editavel individualmente ou em lote

---

## 5. Orcamento

### 5.1 Visao Geral
- Card de orcamento total em gradiente rosa
- Valor total definido para o mes
- Barra de progresso (quanto ja gastou)
- Porcentagem utilizada
- Seletor de mes

### 5.2 Categorias
- Grid/lista de categorias com:
  - Icone + nome da categoria
  - Valor gasto / valor orcado
  - Barra de progresso colorida
  - Porcentagem
- Cores de alerta:
  - Rosa normal: < 80%
  - Amarelo/laranja: 80-99%
  - Vermelho: >= 100% (estourou)

### 5.3 Configuracao de Orcamento
- Definir valor total do mes
- Definir limite por categoria
- Sugestao automatica baseada em meses anteriores
- Copiar orcamento do mes anterior

### 5.4 Alertas de Orcamento
- Notificacao push quando atingir 80% de uma categoria
- Notificacao quando estourar o limite
- Resumo semanal de como esta o orcamento

---

## 6. Perfil & Configuracoes

### 6.1 Card do Casal
- Avatares dos dois parceiros com coracao no meio
- Nomes / apelidos
- "Juntos desde [data]"
- Opcao de editar foto e apelido

### 6.2 Conta
- E-mail (editavel)
- Telefone (editavel)
- Senha (alterar)
- Excluir conta

### 6.3 Preferencias
- **Notificacoes**: toggle on/off
  - Transacoes do parceiro
  - Alertas de orcamento
  - Resumos semanais
- **Moeda**: seletor (BRL padrao, suporte futuro a USD, EUR)
- **Modo Escuro**: toggle (usa variaveis de tema do design system)
- **Idioma**: Portugues (padrao), Ingles (futuro)

### 6.4 Suporte
- Central de Ajuda / FAQ
- Termos de Uso
- Politica de Privacidade
- Contato / Feedback

### 6.5 Gerenciamento do Casal
- Ver codigo de convite (compartilhar novamente)
- Desvincular parceiro(a) (com confirmacao)
- Opcao de exportar dados (CSV)

### 6.6 Logout
- Botao "Sair da Conta"
- Limpa sessao e tokens locais

---

## 7. Funcionalidades Transversais

### 7.1 Realtime Sync
- Quando parceiro(a) adiciona/edita/exclui transacao, atualiza na hora
- Indicador visual: "Parceiro(a) adicionou uma transacao"
- Supabase Realtime (websockets)

### 7.2 Offline Support (Mobile)
- Cache local das transacoes e orcamentos
- Adicionar transacoes offline
- Sincroniza automaticamente quando voltar online
- Resolucao de conflitos (ultimo write ganha)

### 7.3 Onboarding
- Tela de boas-vindas com ilustracoes da paca
- Fluxo guiado:
  1. Criar conta
  2. Configurar perfil (nome, foto)
  3. Criar ou entrar em um casal
  4. Definir primeiro orcamento
  5. Adicionar primeira transacao

### 7.4 Categorizacao Inteligente
- IA aprende padroes do usuario:
  - "iFood" → Alimentacao
  - "99" → Transporte
  - "Netflix" → Entretenimento
- Sugere categoria automaticamente ao digitar descricao
- Melhora com o tempo (por casal)

### 7.5 Exportacao de Dados
- Exportar transacoes em CSV
- Filtrar por periodo
- Relatorio mensal em PDF (futuro)

---

## 8. Banco de Dados (Supabase/Postgres)

### Tabelas

```
profiles
├── id (uuid, PK)
├── user_id (uuid, FK → auth.users)
├── couple_id (uuid, FK → couples, nullable)
├── display_name (text)
├── avatar_url (text, nullable)
├── created_at (timestamptz)
└── updated_at (timestamptz)

couples
├── id (uuid, PK)
├── invite_code (text, unique)
├── partner_since (date)
├── created_by (uuid, FK → profiles)
├── created_at (timestamptz)
└── updated_at (timestamptz)

transactions
├── id (uuid, PK)
├── couple_id (uuid, FK → couples)
├── paid_by (uuid, FK → profiles)
├── type (enum: 'income' | 'expense')
├── amount (decimal)
├── description (text)
├── category_id (uuid, FK → categories)
├── date (date)
├── notes (text, nullable)
├── is_recurring (boolean, default false)
├── recurrence_rule (text, nullable)
├── ai_scanned (boolean, default false)
├── created_at (timestamptz)
└── updated_at (timestamptz)

categories
├── id (uuid, PK)
├── couple_id (uuid, FK → couples, nullable para defaults)
├── name (text)
├── icon (text)
├── color (text)
├── is_default (boolean)
├── created_at (timestamptz)
└── updated_at (timestamptz)

budgets
├── id (uuid, PK)
├── couple_id (uuid, FK → couples)
├── month (date)
├── total_amount (decimal)
├── created_at (timestamptz)
└── updated_at (timestamptz)

budget_categories
├── id (uuid, PK)
├── budget_id (uuid, FK → budgets)
├── category_id (uuid, FK → categories)
├── allocated_amount (decimal)
├── created_at (timestamptz)
└── updated_at (timestamptz)

notifications
├── id (uuid, PK)
├── couple_id (uuid, FK → couples)
├── target_user_id (uuid, FK → profiles)
├── type (enum: 'transaction_added' | 'budget_alert' | 'goal_reached')
├── title (text)
├── body (text)
├── read (boolean, default false)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### Row Level Security (RLS)
- Todas as tabelas filtradas por `couple_id`
- Usuario so acessa dados do seu casal
- `profiles` acessivel apenas pelo proprio usuario ou parceiro

---

## 9. Supabase Edge Functions

### 9.1 `scan-receipt`
- Recebe imagem (base64 ou URL do Storage)
- Envia para **Google Gemini 2.5 Flash** (Vision) <!-- corrigido 2026-06-27: era "Claude Vision API (Haiku)"; ver supabase/functions/scan-receipt/index.ts -->

- Retorna JSON estruturado com dados da transacao
- Salva imagem no Supabase Storage

### 9.2 `scan-statement`
- Recebe imagem de extrato completo
- Claude extrai multiplas transacoes
- Retorna array de transacoes
- Detecta duplicatas comparando com existentes

### 9.3 `generate-invite`
- Gera codigo unico (PACA-XXXX)
- Cria link de convite
- Envia email/notificacao para parceiro (opcional)

### 9.4 `monthly-summary`
- Gera resumo mensal automatico
- Calcula totais, medias, maiores gastos
- Envia push notification com resumo

### 9.5 `check-budgets`
- Cron job diario
- Verifica orcamentos de todos os casais
- Envia alertas quando atingir 80% ou 100%

---

## 10. Estrutura do Monorepo

```
paca/
├── apps/
│   ├── web/                    # React + Vite + Tailwind
│   │   ├── src/
│   │   │   ├── components/     # Componentes React
│   │   │   ├── pages/          # Paginas (Dashboard, Transactions, etc)
│   │   │   ├── hooks/          # Hooks especificos web (GSAP, etc)
│   │   │   ├── styles/         # globals.css, tema
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   └── mobile/                 # Expo + NativeWind
│       ├── app/                # Expo Router (file-based routing)
│       │   ├── (auth)/         # Telas de login/cadastro
│       │   ├── (tabs)/         # Tab navigator principal
│       │   │   ├── index.tsx   # Dashboard
│       │   │   ├── transactions.tsx
│       │   │   ├── budget.tsx
│       │   │   └── profile.tsx
│       │   └── add-transaction.tsx
│       ├── components/         # Componentes nativos
│       └── package.json
│
├── packages/
│   ├── shared/                 # Codigo compartilhado
│   │   ├── types/              # TypeScript types
│   │   │   ├── transaction.ts
│   │   │   ├── budget.ts
│   │   │   ├── profile.ts
│   │   │   └── couple.ts
│   │   ├── constants/          # Categorias, cores, config
│   │   ├── utils/              # Formatadores (moeda, data), calculos
│   │   └── validations/        # Schemas Zod
│   │
│   ├── api/                    # Camada de dados
│   │   ├── supabase.ts         # Cliente Supabase
│   │   ├── hooks/              # React Query hooks
│   │   │   ├── useTransactions.ts
│   │   │   ├── useBudgets.ts
│   │   │   ├── useCouple.ts
│   │   │   ├── useProfile.ts
│   │   │   └── useScanReceipt.ts
│   │   └── realtime/           # Subscriptions Supabase Realtime
│   │
│   └── ui/                     # Componentes visuais compartilhados (opcional)
│       ├── tokens/             # Design tokens exportados do Pencil
│       └── icons/              # Icones customizados
│
├── supabase/
│   ├── migrations/             # SQL migrations
│   ├── functions/              # Edge Functions
│   │   ├── scan-receipt/
│   │   ├── scan-statement/
│   │   ├── generate-invite/
│   │   └── check-budgets/
│   └── seed.sql                # Dados iniciais (categorias default)
│
├── assets/                     # Logos exportadas
│   ├── favicon.png
│   ├── logo-full.png
│   └── logo-icon-large.png
│
├── turbo.json
├── package.json
├── paca-finance.pen            # Design source (Pencil)
└── PLAN.md                     # Este arquivo
```

---

## 11. Fases de Desenvolvimento

### Fase 1 — Fundacao
- [ ] Scaffoldar monorepo (Turborepo)
- [ ] Configurar Supabase (projeto, tabelas, RLS)
- [ ] Setup web (React + Vite + Tailwind)
- [ ] Setup mobile (Expo + NativeWind)
- [ ] Pacote shared (tipos, constantes, utils)
- [ ] Pacote api (cliente Supabase, React Query)

### Fase 2 — Autenticacao & Pareamento
- [ ] Telas de login/cadastro (web + mobile)
- [ ] Integracao Supabase Auth
- [ ] Fluxo de pareamento (criar casal, gerar codigo, aceitar convite)
- [ ] Onboarding do primeiro acesso
- [ ] Protecao de rotas (redirecionar se nao logado)

### Fase 3 — Dashboard & Transacoes
- [ ] Tela Dashboard (web + mobile)
- [ ] Listagem de transacoes com filtros
- [ ] Formulario de nova transacao
- [ ] Edicao e exclusao de transacoes
- [ ] Realtime sync entre parceiros
- [ ] Categorias default + personalizadas

### Fase 4 — Orcamento
- [ ] Tela de orcamento (web + mobile)
- [ ] CRUD de orcamento mensal
- [ ] Limites por categoria
- [ ] Barras de progresso
- [ ] Alertas de orcamento (80%, 100%)

### Fase 5 — Scan Inteligente (IA)
- [ ] Edge Function scan-receipt
- [ ] Integracao Claude Vision API
- [ ] UI de camera/upload (mobile)
- [ ] UI de upload (web)
- [ ] Pre-fill do formulario com resultado da IA
- [ ] Scan em lote (extrato completo)
- [ ] Categorizacao inteligente

### Fase 6 — Perfil & Configuracoes
- [ ] Tela de perfil (web + mobile)
- [ ] Edicao de dados pessoais
- [ ] Preferencias (notificacoes, moeda, tema)
- [ ] Modo escuro
- [ ] Gerenciamento do casal (desvincular, compartilhar codigo)
- [ ] Exportacao CSV

### Fase 7 — Polimento & Deploy
- [ ] Animacoes (GSAP web, React Native Animated mobile)
- [ ] Push notifications (Expo)
- [ ] Offline support (mobile)
- [ ] Testes (unitarios + integracao)
- [ ] Deploy web (Vercel)
- [ ] Deploy mobile (EAS → App Store + Play Store)
- [ ] Monitoring (Sentry)

---

## 12. Metricas de Sucesso

- App funcional em web e mobile
- Dois usuarios conseguem se parear e compartilhar dados
- Transacoes sincronizam em tempo real
- Scan de recibo funciona com > 90% de precisao
- Tempo de carregamento < 2s
- App disponivel nas lojas (App Store + Play Store)
