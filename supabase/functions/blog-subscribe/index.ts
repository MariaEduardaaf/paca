import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Captura de e-mail do blog (newsletter / reengajamento do tráfego pago).
//
// Deploy SEM verificação de JWT (quem chama é um visitante anônimo do blog,
// que não tem sessão Supabase):
//   supabase functions deploy blog-subscribe --no-verify-jwt
//
// Secrets necessários (ambos já são injetados pela plataforma Supabase em
// toda edge function — não precisa `secrets set`, só existir no projeto):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   <- obrigatório: blog_subscribers tem RLS
//                                  habilitada e ZERO policies (migration
//                                  00033), então nem anon nem authenticated
//                                  conseguem escrever. Só o service_role.
//
// Contrato (congelado — o blog depende dele):
//   POST { email, consent, source, hp }   (Content-Type: application/json,
//                                          corpo até 4 KB — ver readCappedBody)
//   200 {"ok":true}
//   400 {"error":"invalid_email"|"consent_required"}
//   429 {"error":"rate_limited"}
//   500 {"error":"server_error"}
//
// LGPD: só grava com `consent === true` (checkbox de marketing marcado pelo
// leitor, nunca pré-marcado no blog). O e-mail NUNCA é logado, nem em erro —
// os logs de edge function não são lugar de PII. Por isso os console.error
// abaixo carregam só código de erro, jamais o payload.

const ALLOWED_ORIGINS = new Set([
  "https://blog.pacafinance.com.br",
  "https://paca-blog.vercel.app",
  "http://localhost:4321",
]);

/**
 * CORS restrito ao blog: devolve o header de origem só quando a origem está na
 * allowlist (eco da origem + Vary, porque a resposta varia por origem). Uma
 * origem desconhecida recebe a resposta sem `Access-Control-Allow-Origin` e o
 * browser a descarta — ninguém embute este formulário em outro site.
 */
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "content-type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

// ---------------------------------------------------------------------------
// Porta de entrada: Content-Type + tamanho do corpo.
//
// Exigir `application/json` NÃO é formalidade — é o que faz a allowlist de CORS
// valer para escrita. `application/json` é um Content-Type que o browser
// considera NÃO-simples, então toda chamada cross-origin passa antes por um
// preflight OPTIONS; uma origem fora da allowlist não recebe
// Access-Control-Allow-Origin no preflight e o POST nunca chega aqui. Se
// aceitássemos `text/plain` (que É simples e dispensa preflight), qualquer site
// poderia gravar leads na nossa base disparando um form/fetch escondido — o
// browser só esconderia a RESPOSTA, a linha já teria sido inserida.
//
// O teto de corpo evita que uma requisição de megabytes seja bufferizada no
// isolate: o Content-Length declarado é checado primeiro (barato) e o stream é
// abortado se o corpo real passar do teto (o header pode mentir ou faltar).
// ---------------------------------------------------------------------------
const MAX_BODY_BYTES = 4096; // o payload legítimo tem ~200 bytes

function isJsonRequest(req: Request): boolean {
  const contentType = req.headers.get("content-type");
  if (!contentType) return false;
  return contentType.split(";")[0]!.trim().toLowerCase() === "application/json";
}

/** Lê o corpo com teto rígido. Devolve `null` se estourar o limite. */
async function readCappedBody(req: Request): Promise<string | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!req.body) return "";

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

/**
 * Validação de e-mail deliberadamente estrita, não "RFC completa": local part
 * sem espaço nem os separadores que quebram um envio (`,` `;` `<` `>` ...),
 * domínio com rótulos válidos e TLD alfabético de 2+ letras. O limite de 254
 * caracteres é o máximo de um endereço em SMTP (e o CHECK da 00033 repete isso
 * no banco).
 */
const EMAIL_RE =
  /^[^\s@,;:<>()[\]\\"]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  if (!EMAIL_RE.test(email)) return null;
  return email;
}

/** Slug do artigo de origem: aceita só o formato de slug e trunca. */
function normalizeSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase().slice(0, 128);
  if (!slug) return null;
  return /^[a-z0-9][a-z0-9/_-]*$/.test(slug) ? slug : null;
}

// ---------------------------------------------------------------------------
// Rate limit por IP — janela deslizante em memória do isolate.
//
// LIMITAÇÃO ASSUMIDA (documentada de propósito): o estado vive no Map deste
// isolate. O Supabase recicla isolates e pode rodar vários em paralelo, então
// o contador zera de tempos em tempos e não é compartilhado entre instâncias.
// Isto é uma barreira contra abuso casual (script ingênuo, form spam de um IP),
// NÃO uma garantia de no máximo 5/h. A alternativa — uma tabela de contadores —
// foi rejeitada de propósito: guardaria IP (dado pessoal sob a LGPD) de forma
// persistente só para isso. Aqui o IP fica em memória volátil e nunca é logado
// nem gravado. Se um dia isso não bastar, o lugar certo é um WAF/Turnstile na
// borda, não uma tabela de IPs.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const RATE_MAX = 5; // inscrições por IP por janela
const RATE_MAP_MAX_KEYS = 5000; // teto de memória do isolate

const rateHits = new Map<string, number[]>();

/**
 * IP do cliente para o balde de rate limit.
 *
 * `cf-connecting-ip` vem PRIMEIRO de propósito: esse header é reescrito pela
 * borda da Cloudflare a cada requisição, então o cliente não consegue forjá-lo.
 * `x-forwarded-for` é uma lista à qual cada proxy ACRESCENTA — se o visitante
 * mandar o header já preenchido, o valor dele fica na FRENTE e o IP real no
 * fim. Ler o primeiro item (como estava antes) entregava o controle da chave de
 * rate limit ao atacante: bastava variar o header para ter budget infinito e
 * ainda encher o Map. Por isso: cf-connecting-ip → último item do XFF (o que o
 * proxy mais próximo escreveu) → "unknown".
 */
function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return "unknown";
}

function rateLimited(ip: string): boolean {
  const now = Date.now();

  // Poda preguiçosa: só quando o Map cresce demais, varre e descarta janelas
  // já vencidas. Evita que um pico de IPs distintos segure memória para sempre.
  if (rateHits.size > RATE_MAP_MAX_KEYS) {
    for (const [key, hits] of rateHits) {
      const alive = hits.filter((t) => now - t < RATE_WINDOW_MS);
      if (alive.length === 0) rateHits.delete(key);
      else rateHits.set(key, alive);
    }
    // Ainda cheio depois da poda (ataque distribuído): esvazia e recomeça a
    // janela em vez de crescer sem limite.
    if (rateHits.size > RATE_MAP_MAX_KEYS) rateHits.clear();
  }

  const recent = (rateHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    rateHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateHits.set(ip, recent);
  return false;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "server_error" }, 405, origin);
  }

  try {
    // Content-Type errado ou corpo acima do teto: 400 invalid_email, o código
    // genérico de "requisição malformada" que o contrato já prevê (o formulário
    // do blog sempre manda application/json e ~200 bytes, então nenhum leitor
    // legítimo cai aqui).
    if (!isJsonRequest(req)) {
      return json({ error: "invalid_email" }, 400, origin);
    }

    const raw = await readCappedBody(req);
    if (raw === null) {
      return json({ error: "invalid_email" }, 400, origin);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: "invalid_email" }, 400, origin);
    }
    // `typeof null === "object"` e arrays também passam no typeof — os dois são
    // recusados aqui para o resto do handler poder indexar com segurança.
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json({ error: "invalid_email" }, 400, origin);
    }
    const body = parsed as Record<string, unknown>;

    // Honeypot ANTES de qualquer validação: um bot que preencheu o campo
    // invisível recebe exatamente a resposta de sucesso e nada é gravado —
    // nem sinal de validação, nem consumo do rate limit (que é para gente).
    const hp = body.hp;
    if (typeof hp === "string" && hp.trim() !== "") {
      return json({ ok: true }, 200, origin);
    }

    const email = normalizeEmail(body.email);
    if (!email) return json({ error: "invalid_email" }, 400, origin);

    // LGPD: consentimento explícito e específico. Só o booleano `true` serve —
    // "true", 1 ou qualquer coisa "truthy" é recusada de propósito.
    if (body.consent !== true) {
      return json({ error: "consent_required" }, 400, origin);
    }

    if (rateLimited(clientIp(req))) {
      return json({ error: "rate_limited" }, 429, origin);
    }

    const source = normalizeSource(body.source);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Re-inscrição sem duplicar e sem vazar: um único upsert atômico em
    // `ON CONFLICT (email)`. Se o e-mail já existia, atualiza o consentimento
    // (novo consent_at) e ZERA unsubscribed_at — quem se descadastrou e voltou
    // a marcar o checkbox está inscrito de novo. `source_slug` só entra no
    // payload quando veio um slug válido: assim a re-inscrição preserva a
    // atribuição do primeiro contato em vez de apagá-la com null.
    // A resposta é sempre 200 {ok:true}, existindo o e-mail antes ou não —
    // o formulário do blog não pode virar um verificador de endereços.
    const payload: Record<string, unknown> = {
      email,
      consent_marketing: true,
      consent_at: new Date().toISOString(),
      unsubscribed_at: null,
    };
    if (source) payload.source_slug = source;

    const { error } = await admin
      .from("blog_subscribers")
      .upsert(payload, { onConflict: "email" });

    if (error) {
      // Só o código do erro: a mensagem do Postgres para violação de unicidade
      // inclui o VALOR da chave, ou seja, o e-mail. Isso não vai para o log.
      console.error("blog-subscribe upsert failed:", error.code ?? "unknown");
      return json({ error: "server_error" }, 500, origin);
    }

    return json({ ok: true }, 200, origin);
  } catch (err) {
    // `err` aqui é falha de rede/runtime, nunca o corpo da requisição.
    console.error("blog-subscribe error:", err instanceof Error ? err.name : "unknown");
    return json({ error: "server_error" }, 500, origin);
  }
});
