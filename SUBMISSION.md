# Paca Finance — App Store & Play Store submission guide

> **Status note (2026-06-27):** the readiness code is **merged to `main`** — the "PR #1 / branch `app-store-readiness`" reference just below is historical. Since then the **monetization/subscription code was also merged** (PR #2): the DB, paywall UI, quota gates and RevenueCat webhook exist, but billing is **not yet active** (no RevenueCat account/products, `apps/mobile/lib/billing.ts` is a stub, `react-native-purchases` not installed). So the **"Free / no IAP"** guidance in §Pricing holds **only if you ship v1 without activating subscriptions**; if you turn RevenueCat on before submitting, update §Pricing and the IAP answers accordingly.

The app **code** is ready and on PR #1 (branch `app-store-readiness`). Everything left to publish is **operational**: store accounts, a couple of Supabase dashboard settings, store assets (screenshots/graphics), and the compliance forms. Work top to bottom.

**Shortest path:** merge PR → deploy edge functions + confirm email-confirmation OFF (§Runbook 1) → create the store apps → build (§Runbook 5) → screenshots + listing copy + privacy forms → submit.

**One code fix recommended before building:** remove the `NSPrivacyCollectedDataTypeCrashData` block from `apps/mobile/app.json` — the app declares it but collects no crash data. See the warning in **§Privacy → 4**.

---

## Store listing copy

All copy below is paste-ready. Character counts are noted where a store enforces a limit. Portuguese (pt-BR) is the primary market (Brazil); English is the secondary locale.

### App name (≤30 chars)

| Locale | Value | Chars |
|--------|-------|-------|
| pt-BR | `Paca Finance` | 12 |
| en | `Paca Finance` | 12 |

Optional pt subtitle baked into the App Store name field if you want more reach (still under 30): `Paca Finance: Casal` (19 chars). Recommendation: keep the name clean as `Paca Finance` and put the value prop in the subtitle field below.

### Subtitle / short tagline — App Store (≤30 chars)

| Locale | Value | Chars |
|--------|-------|-------|
| pt-BR | `Finanças do casal, a dois` | 25 |
| en | `Couple finances, together` | 25 |

### Promotional text — App Store (≤170 chars)

This field is editable without a new build — good for seasonal pushes.

**pt-BR** (138 chars)
```
Registrem cada gasto juntos, definam um orçamento e deixem a IA ler recibos e extratos por vocês. Print do banco vira transação em segundos.
```

**en** (148 chars)
```
Track every expense together, set a budget, and let AI read your receipts and bank statements. A banking screenshot becomes a transaction in seconds.
```

### Keywords — App Store (one comma-separated string, ≤100 chars, no spaces after commas)

**pt-BR** (98 chars)
```
casal,finanças,gastos,orçamento,despesas,contas,dinheiro,economia,recibo,pix,extrato,namorados
```

**en** (95 chars)
```
couple,finance,expenses,budget,money,bills,spending,tracker,receipt,savings,shared,partner
```
> Don't repeat words already in the app name/subtitle ("Paca", "finance"/"finanças") — Apple indexes those automatically, so they're omitted here to save space.

### Full description — App Store + Play (≤4000 chars)

**pt-BR** (~1.760 chars)
```
O Paca Finance é o app de finanças feito pra dois. Em vez de cada um anotar os gastos no seu canto, vocês compartilham tudo em tempo real: o que entrou, o que saiu e quanto sobra no fim do mês — na mesma tela, atualizado na hora pros dois.

Conecte-se ao seu parceiro(a) com um código de convite e pronto: cada transação que um adiciona aparece no app do outro automaticamente.

POR QUE CASAIS USAM O PACA
• Saldo do casal, receitas e despesas do mês e comparação semanal, tudo no dashboard
• Adicione, edite e exclua transações com categoria, quem pagou e observações
• Filtre e busque por tipo, data ou pessoa, e exporte em PDF
• Orçamento mensal com limite por categoria e acompanhamento do quanto já foi gasto
• Lista de contas fixas (aluguel, internet, energia) pra marcar conforme paga

DEIXE A IA FAZER A PARTE CHATA
• Tire uma foto de um recibo, um print da notificação de Pix ou um comprovante de cartão e a IA preenche os dados — você só confere e salva
• Print do extrato do banco inteiro? A IA identifica todas as transações de uma vez
• Na dúvida se vale a pena comprar algo? Pergunte pra Paca: ela dá uma opinião honesta com base nos seus números de verdade — saldo, contas a pagar e orçamento da categoria

PENSADO PRA QUALQUER CASAL
• Multimoeda: escolha sua moeda principal e a IA converte automaticamente — ideal pra quem mora fora
• 4 idiomas: português, inglês, russo e ucraniano
• Modo escuro

SUA PRIVACIDADE
• Seus dados financeiros são seus. Você pode exportar tudo e apagar sua conta direto no app, a qualquer momento
• Política de privacidade e termos de uso disponíveis no app e no site

Comecem hoje a organizar as finanças do casal — sem planilha, sem briga no fim do mês.
```

**en** (~1.700 chars)
```
Paca Finance is the money app built for two. Instead of each of you tracking spending on your own, you share everything in real time: what came in, what went out, and what's left at the end of the month — on the same screen, updated instantly for both partners.

Pair with your partner using an invite code and you're set: every transaction one of you adds shows up in the other's app automatically.

WHY COUPLES USE PACA
• Couple balance, monthly income and expenses, and a weekly comparison, all on the dashboard
• Add, edit and delete transactions with category, who paid and notes
• Filter and search by type, date or person, and export to PDF
• Monthly budget with per-category limits and live spending progress
• Fixed-bills checklist (rent, internet, power) to tick off as you pay

LET AI DO THE BORING PART
• Snap a photo of a receipt, a payment notification or a card slip and AI fills in the details — you just double-check and save
• A screenshot of your full bank statement? AI pulls out every transaction at once
• Not sure if a purchase is worth it? Ask Paca for an honest take based on your real numbers — balance, upcoming bills and category budget

MADE FOR ANY COUPLE
• Multi-currency: set your main currency and AI converts automatically — great if you live abroad
• 4 languages: Portuguese, English, Russian and Ukrainian
• Dark mode

YOUR PRIVACY
• Your financial data is yours. Export everything and delete your account right in the app, anytime
• Privacy policy and terms of use available in the app and on the web

Start organizing your couple finances today — no spreadsheet, no end-of-month arguments.
```

### Short description — Play (≤80 chars)

| Locale | Value | Chars |
|--------|-------|-------|
| pt-BR | `Finanças do casal: gastos, orçamento e contas com leitura de recibos por IA` | 75 |
| en | `Couple finances: shared expenses, budgets and bills with AI receipt scanning` | 76 |

### Categories

**App Store**
- Primary: `Finance`
- Secondary: `Lifestyle` (the couple/shared-household angle fits here; alternatively `Productivity`)

**Google Play**
- Category: `Finance`
- Tags (Play lets you pick up to 5 from a fixed list): Budgeting, Expense tracker, Money management — pick the closest available matches in Play Console.

### URLs to paste

| Field | URL |
|-------|-----|
| Support URL | `https://app.pacafinance.com.br/support` |
| Marketing URL | `https://app.pacafinance.com.br` |
| Privacy Policy URL | `https://app.pacafinance.com.br/privacy` |
| Terms of Use | `https://app.pacafinance.com.br/terms` |
| Support / developer contact email | `madualvesfr@gmail.com` |

---

## Privacy & data-safety forms

These answers must match what the code actually does. Cross-reference: `apps/mobile/app.json` (privacyManifests), the three Gemini edge functions, and the live privacy policy at https://app.pacafinance.com.br/privacy.

Two facts drive every answer below:

- **No tracking SDK exists.** `NSPrivacyTracking` is `false` and `NSPrivacyTrackingDomains` is empty in `app.json`. Nothing is used for tracking in either store's sense (no cross-app/cross-site advertising, no data broker sharing). Answer "tracking" **No** everywhere.
- **Receipt/statement images AND transaction context are sent to Google Gemini**, a third party, from `supabase/functions/scan-receipt`, `scan-statement`, and `advise-purchase`. Images are sent inline and not stored by us; transaction/budget/bill context is sent as prompt text in `advise-purchase`. For Google Play this counts as **data Sharing**.

### 1. Apple "App Privacy" questionnaire (App Store Connect)

For every row: **Collected? = Yes**, **Used for tracking? = No**. This mirrors the `NSPrivacyCollectedDataTypes` block in `app.json`.

| Data type (Apple category) | Collected? | Linked to identity? | Used for tracking? | Purpose |
|---|---|---|---|---|
| **Email Address** (Contact Info → Email Address) | Yes | **Yes** | No | App Functionality |
| **Name** (Contact Info → Name) | Yes | **Yes** | No | App Functionality |
| **User ID** (Identifiers → User ID) | Yes | **Yes** | No | App Functionality |
| **Other Financial Info** (Financial Info) — transactions, budgets, bills | Yes | **Yes** | No | App Functionality |
| **Photos or Videos** (User Content) — receipt/statement images | Yes | **No** (not linked) | No | App Functionality |
| **Product Interaction** (Usage Data) — `usage_stats` action logs | Yes | **Yes** | No | App Functionality |

Notes:
- Email, Name, User ID, Other Financial Info are **Linked** (`NSPrivacyCollectedDataTypeLinked: true` in `app.json`). Photos are **Not Linked** (`false`).
- **Product Interaction is not yet in `app.json`.** The code writes to `usage_stats` (tied to `profile_id`/`couple_id`) in all three AI functions, so Apple's questionnaire should declare it. Either add it to the manifest or declare it manually — keep the two consistent.
- When Apple asks "Do you or your third-party partners use this data for tracking?" → **No** for all rows.

### 2. Google Play "Data safety" form (Play Console)

For every row: **Encrypted in transit = Yes** (all traffic is HTTPS). **Users can request deletion = Yes** (in-app + email — see §3). **Collection purpose = App functionality** (and Analytics for the usage row).

| Data type (Play category) | Collected | Shared | Encrypted in transit | Deletion |
|---|---|---|---|---|
| **Email address** (Personal info) | Yes | No | Yes | Yes |
| **Name** (Personal info) | Yes | No | Yes | Yes |
| **User IDs** (Personal info) | Yes | No | Yes | Yes |
| **Financial info → Other financial info** (transactions, budgets, bills) | Yes | **YES — shared with Google Gemini** | Yes | Yes |
| **Photos** (Photos and videos) — receipts/statements | Yes | **YES — shared with Google Gemini** | Yes | Yes |
| **App interactions** (App activity) — `usage_stats` logs | Yes | No | Yes | Yes |

Critical points for the Play form:
- **Financial info and Photos must be marked SHARED.** The edge functions POST the receipt/statement image and (for the advisor) the transaction/budget/bill context to `generativelanguage.googleapis.com` (Gemini). That is a third-party transfer → **Shared = Yes** for both. The other rows are **Not shared** (they stay in your Supabase/Postgres).
- Do **not** mark the shared rows as "Processed ephemerally" — the images are ephemeral on *your* server, but they are still *transferred* to Gemini, so "Shared" is the correct disclosure.
- "Is all of the user data collected by your app encrypted in transit?" → **Yes**.
- "Do you provide a way for users to request that their data is deleted?" → **Yes** (see §3).

### 3. Account-deletion disclosure

Both stores require this. It is already built and documented in the live privacy policy (Profile → Danger zone → Delete account).

- **In-app path (required by Apple Guideline 5.1.1(v) and Play):** Profile → Danger zone → **Delete account**. Permanently deletes the account and the user's personal data.
- **Public method (Play "Account deletion URL" field):** use the support page **https://app.pacafinance.com.br/support** as the deletion URL, and list **madualvesfr@gmail.com** as the contact for deletion requests.
- In the Play Data safety "Deletion" question, select **"App offers data deletion"** and provide the URL above. State that deletion is available **both** in-app and via email/support.

### 4. ⚠️ WARNING — CrashData inconsistency (fix before submitting)

`apps/mobile/app.json` declares a **Crash Data** collected-data type, but **the app does not collect crash data** — there is no Sentry/Bugsnag/Crashlytics anywhere. A privacy-manifest declaration that doesn't match real behavior can be flagged in App Review.

Choose one:

- **Option A (recommended — remove it):** delete the `NSPrivacyCollectedDataTypeCrashData` object from the `NSPrivacyCollectedDataTypes` array in `apps/mobile/app.json` (the object spanning ~lines 87–94), and don't declare "Crash logs / Diagnostics" in either store form. Make sure the **Photos** entry that precedes it becomes the last array element with no trailing comma, so the JSON stays valid.
- **Option B (only if you actually want crash reporting):** install `@sentry/react-native`, wire it up, then **keep** the CrashData block and additionally declare **Crash logs (Diagnostics)** in the Play Data safety form. Don't pick this just to avoid editing JSON.

---

## Age rating, content rating & export compliance

Paca Finance is a couple budgeting utility with no objectionable content, no real payments, and no publicly shared user-generated content. It rates **4+ (Apple)** and **Everyone / PEGI 3 (Google)**.

### Apple age-rating questionnaire (App Store Connect)

Every content frequency is **None**.

| Question | Answer |
|---|---|
| Cartoon/Fantasy/Realistic Violence (all) | None |
| Profanity or Crude Humor | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | None |
| Alcohol, Tobacco, or Drug Use or References | None |
| Sexual Content or Nudity (all) | None |
| **Simulated Gambling** | **None** (budgeting only — no betting/casino/wagering) |
| Contests | None |
| Unrestricted Web Access | No |
| **Made for Kids / Kids Category** | **No** — general-audience finance app, do **not** enroll in the Kids category |

**Expected result: 4+.**

### Google Play IARC content-rating questionnaire (Play Console)

Select category **Utility / Productivity** — *not* a game. Answer **No** to every content question.

| Question | Answer |
|---|---|
| Violence | No |
| Sexual/suggestive content or nudity | No |
| Drugs, alcohol, or tobacco | No |
| Profanity or crude humor | No |
| Horror or frightening content | No |
| **Gambling or simulated gambling** | **No** (tracking money ≠ gambling) |
| Users interact / share content publicly | No (data is shared only between two paired partners via a private invite code — not public UGC) |
| Shares physical location with other users | No |
| Purchases of digital goods | No (free app, no IAP) |

**Expected result: Everyone / PEGI 3 / ESRB Everyone.** IARC issues the certificate automatically after you submit.

### Export compliance (encryption)

`apps/mobile/app.json` already sets `"ITSAppUsesNonExemptEncryption": false`. This pre-answers the App Store Connect **Export Compliance** prompt as **exempt** — the app only uses standard HTTPS/TLS (Supabase + Gemini), no proprietary cryptography. App Store Connect won't prompt per-build, and **no export documentation is needed**. Google Play has no separate encryption step.

### Pricing, IAP & payments

- **Free**, with **no in-app purchases** and **no external payment links**. Set Price: **Free** in both consoles, leave IAP empty.
- Paca Finance **tracks** money already spent — it **processes no real payments/transfers** — so there are **no Guideline 3.1.1 (IAP) concerns** and no paid-app/subscription setup.

---

## Step-by-step submission runbook

Run everything below from the repo root unless a step says otherwise.

### 1. Supabase prep (do this first — AI features and logins break without it)

Deploy the three rate-limited AI edge functions (`_shared` ships automatically with them):

```bash
supabase functions deploy scan-receipt scan-statement advise-purchase \
  --project-ref gtumyiwokhroizmqcbve
```

Confirm the required secrets exist on the prod project:

```bash
supabase secrets list --project-ref gtumyiwokhroizmqcbve
# if either is missing:
supabase secrets set GEMINI_API_KEY=... --project-ref gtumyiwokhroizmqcbve
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... --project-ref gtumyiwokhroizmqcbve
```

In the Supabase dashboard, go to **Authentication → Providers → Email** and make sure **"Confirm email" is OFF**. The app has no email-confirmation flow, so leaving it ON means every new sign-up (including the App Review demo account) cannot log in.

### 2. eas.json env — nothing to change for a prod-only release

`apps/mobile/eas.json` `build.production.env` already points at the real prod backend (URL + publishable key). The `development`/`preview` profiles still hold `REPLACE_WITH_STAGING_*` placeholders — **ignore them** unless you later stand up a separate staging Supabase project; they're never used by a `--profile production` build. (The anon/publishable key is a public client key by design — safe to ship. Never put a service-role key here.)

### 3. Apple — App Store Connect setup + demo account

1. Enroll in the **Apple Developer Program** ($99/yr) if not already.
2. In **App Store Connect → Apps → +** create the app: iOS, Bundle ID **`com.pacafinance.app`** (register it under Identifiers first if needed), Name **Paca Finance**, Primary language **Portuguese (Brazil)**.
3. Fill **App Review Information** with a working demo account. Create the auth user in Supabase (**Authentication → Users → Add user**, check **Auto Confirm User**), e.g. `review@pacafinance.app`, then seed sample data via the **SQL Editor** so the dashboard shows value:

   ```sql
   -- TEMPLATE — confirm table/column names against supabase/migrations/ first.
   -- Goal: one auto-confirmed login landing on a populated dashboard.
   with reviewer as (
     select id from auth.users where email = 'review@pacafinance.app'
   )
   insert into public.profiles (id, name)
   select id, 'App Review' from reviewer
   on conflict (id) do update set name = excluded.name;
   ```

   > Simplest alternative: create the account, log in once on a device, and add a few transactions + a budget by hand. Put the email/password in App Review Information's "Sign-In required" fields with a note: "Tap the camera icon to test AI receipt scanning."

### 4. Google — Play Console setup

1. Create the app: name **Paca Finance**, default language Portuguese (Brazil), type App, Free.
2. Create an **Internal testing** track first and add yourself as a tester — fastest way to validate the production build against the real backend before promoting to production.
3. Complete **Data safety** and **App content** (privacy policy URL, account deletion) using the §Privacy answers.

### 5. Build the binaries

`appVersionSource` is `"remote"` with `autoIncrement: true`, so **EAS owns the iOS build number and Android versionCode** — don't bump them by hand for cloud builds.

```bash
cd apps/mobile
eas login
eas build --platform ios --profile production
eas build --platform android --profile production
```

On the first iOS build, let EAS create/manage the distribution credentials and provisioning profile automatically.

### 6. Screenshots and store graphics

Capture on a device/simulator running the production build, logged in with a seeded account:

| Asset | Exact size | Required? |
|---|---|---|
| iPhone 6.7" screenshots | **1290 × 2796** px (portrait) | Required (App Store) |
| iPad 13" screenshots | **2048 × 2732** px (portrait) | **Required** — `supportsTablet = true` |
| Android phone screenshots | min 1080 px short side (e.g. **1080 × 2400**), 2–8 images | Required (Play) |
| Play feature graphic | **1024 × 500** px (no alpha) | Required (Play) |

Screens to capture (5 cover the value story): **Dashboard → Transactions → Monthly budget → AI scan → AI advisor**. Use the same five for iPhone, iPad, and Android.

App icons are already in place (`assets/icon.png` + `adaptive-icon.png`, both 1024×1024). For the Play 512×512 high-res icon, downscale `icon.png`. No new icon work needed.

### 7. Submit

`submit.production` in `eas.json` is **empty**, so `eas submit` prompts interactively. Two options:

```bash
cd apps/mobile
# A) interactive submit
eas submit -p ios --profile production --latest
eas submit -p android --profile production --latest
```

Or do the **first upload manually**: iOS `.ipa` via **Transporter**; Android `.aab` to the **Internal testing** track in Play Console. To make future submits non-interactive, fill the submit profile:

```jsonc
"submit": {
  "production": {
    "ios": { "ascAppId": "<App Store Connect app id>", "appleTeamId": "<TEAM_ID>" },
    "android": { "serviceAccountKeyPath": "./play-service-account.json", "track": "internal" }
  }
}
```

(Generate the Android service-account JSON in Google Cloud, grant it access in Play Console → Users and permissions, and keep it out of git.)

### 8. Pre-submit checklist

- [ ] `scan-receipt`, `scan-statement`, `advise-purchase` deployed to prod; `GEMINI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` set — verified by scanning a receipt on the production build.
- [ ] Supabase **Email confirmation is OFF**, and the demo/review account is **auto-confirmed and logs in** on a clean device.
- [ ] Demo account lands on a **populated dashboard**; credentials + tester note are in App Review Information.
- [ ] Privacy nutrition labels / Play Data safety match what's collected; legal URLs (`/privacy`, `/terms`, `/support`) + contact `madualvesfr@gmail.com` filled in both consoles.
- [ ] **Removed `NSPrivacyCollectedDataTypeCrashData`** from `app.json` and rebuilt (no crash reporter exists).
- [ ] Screenshots uploaded for **iPhone 6.7", iPad 13" (mandatory), and Android phone**, plus the **1024×500 Play feature graphic**.
- [ ] AI image features tested end-to-end on the production build (receipt photo → transaction), and rate limiting doesn't block normal use.
- [ ] In-app **account deletion** works against prod (both stores require it).
