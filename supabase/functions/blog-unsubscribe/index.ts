import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Descadastro da newsletter do blog — o link "cancelar inscrição" que precisa
// funcionar desde o primeiro e-mail enviado (LGPD).
//
// Deploy SEM verificação de JWT (o link é clicado direto no cliente de e-mail,
// sem sessão Supabase):
//   supabase functions deploy blog-unsubscribe --no-verify-jwt
//
// Secrets necessários (injetados pela plataforma em toda edge function):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   <- blog_subscribers tem RLS habilitada e ZERO
//                                  policies (migration 00033); só service_role
//                                  lê e escreve.
//
// Contrato (congelado):
//   GET ...?token=<uuid>  -> página HTML pt-BR confirmando o descadastro.
//   token inválido/ausente -> página explicando, sem revelar se algum e-mail
//   existe.
//
// Privacidade: a página NUNCA mostra o e-mail e a função nunca o consulta nem
// o loga — o token basta para dar baixa. O HTML é 100% estático (nenhum dado
// da requisição é interpolado), então não há superfície de XSS refletido.
//
// Ressalva conhecida: sendo GET, um scanner de link (antivírus corporativo,
// preview de cliente de e-mail) pode disparar o descadastro sozinho. É o
// comportamento padrão de link de unsubscribe e o custo é assimétrico a favor
// do leitor (dar baixa demais é melhor que de menos). Se virar problema, o
// caminho é o one-click POST do RFC 8058 — mudança de contrato, não deste
// arquivo sozinho.

const BLOG_URL = "https://blog.pacafinance.com.br";
const PRIVACY_URL = "https://paca-web-twmh.vercel.app/privacy";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Página HTML da identidade Paca: fundo claro, rosa #FF8FB1, pt-BR, CSS inline
 * (nenhuma requisição externa — abre igual dentro de webmail e offline).
 * `title`/`message` são constantes deste arquivo, nunca entrada do usuário.
 */
function page(title: string, message: string, status: number): Response {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title} · Paca Finance</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #FFF7FA;
    color: #3F2B33;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
  }
  .card {
    width: 100%;
    max-width: 480px;
    background: #FFFFFF;
    border: 1px solid #FFE0EA;
    border-radius: 20px;
    padding: 40px 32px;
    text-align: center;
    box-shadow: 0 12px 32px rgba(255, 143, 177, 0.16);
  }
  .mark {
    display: inline-block;
    padding: 6px 14px;
    border-radius: 999px;
    background: #FF8FB1;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  h1 { margin: 20px 0 12px; font-size: 24px; line-height: 1.3; color: #2B1B22; }
  p { margin: 0 0 16px; font-size: 16px; color: #5C4650; }
  .links { margin-top: 28px; font-size: 14px; }
  a { color: #C2185B; text-decoration: none; font-weight: 600; }
  a:hover, a:focus-visible { text-decoration: underline; }
  a:focus-visible { outline: 3px solid #FF8FB1; outline-offset: 3px; border-radius: 4px; }
  .sep { color: #D9BFC9; margin: 0 8px; }
</style>
</head>
<body>
  <main class="card">
    <span class="mark">Paca Finance</span>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="links">
      <a href="${BLOG_URL}">Voltar ao blog</a>
      <span class="sep">·</span>
      <a href="${PRIVACY_URL}">Aviso de privacidade</a>
    </p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}

const donePage = () =>
  page(
    "Inscrição cancelada",
    "Pronto! Você não vai mais receber os e-mails da newsletter do Paca Finance. Se mudar de ideia, é só se inscrever de novo em qualquer artigo do blog.",
    200,
  );

// Uma única página para "token ausente", "token malformado" e "token
// desconhecido": nenhuma dessas respostas diz se algum e-mail está ou não na
// base. Status 200 de propósito — é uma página de instrução para uma pessoa,
// não um erro de API.
const invalidPage = () =>
  page(
    "Link de cancelamento inválido",
    "Este link de cancelamento não é mais válido ou está incompleto. Abra o link direto do e-mail que você recebeu, sem editá-lo. Se o problema continuar, responda àquele e-mail que a gente cancela para você.",
    200,
  );

const errorPage = () =>
  page(
    "Não deu para concluir agora",
    "Tivemos um problema temporário ao registrar o cancelamento. Tente abrir este mesmo link novamente em alguns minutos.",
    503,
  );

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return page(
      "Link de cancelamento inválido",
      "Abra o link de cancelamento direto do e-mail que você recebeu.",
      405,
    );
  }

  const token = new URL(req.url).searchParams.get("token")?.trim() ?? "";
  if (!UUID_RE.test(token)) return invalidPage();

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Só id e unsubscribed_at: o e-mail nunca é lido, nem para montar a página.
    const { data: subscriber, error: selectError } = await admin
      .from("blog_subscribers")
      .select("id, unsubscribed_at")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (selectError) {
      console.error("blog-unsubscribe select failed:", selectError.code ?? "unknown");
      return errorPage();
    }
    if (!subscriber) return invalidPage();

    // Idempotente: clicar de novo (ou o scanner do webmail abrir o link)
    // não sobrescreve a data da primeira baixa nem gera erro.
    if (subscriber.unsubscribed_at) return donePage();

    const { error: updateError } = await admin
      .from("blog_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", subscriber.id)
      .is("unsubscribed_at", null);

    if (updateError) {
      console.error("blog-unsubscribe update failed:", updateError.code ?? "unknown");
      return errorPage();
    }

    return donePage();
  } catch (err) {
    console.error("blog-unsubscribe error:", err instanceof Error ? err.name : "unknown");
    return errorPage();
  }
});
