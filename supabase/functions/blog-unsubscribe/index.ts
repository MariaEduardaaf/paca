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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POR QUE REDIRECIONAR EM VEZ DE DEVOLVER HTML.
 *
 * Esta função já devolveu uma página HTML própria, com a identidade do Paca e
 * CSS embutido. Ela nunca chegou assim ao leitor: o gateway de Edge Functions
 * do Supabase reescreve a resposta para `content-type: text/plain` e aplica
 * `content-security-policy: default-src 'none'; sandbox`. Medido no ar — a
 * pessoa que clicava em "cancelar inscrição" recebia o código-fonte da página
 * na tela, em texto cru. O cancelamento acontecia; a impressão era de site
 * quebrado, no único canal onde a margem da operação fecha.
 *
 * Não há cabeçalho que contorne isso: quem decide é o gateway. Então a página
 * de confirmação passa a ser a do blog (/descadastro, que já existe, já está no
 * padrão visual e já explica os direitos de LGPD), e esta função só faz o
 * trabalho de banco e manda a pessoa para lá com o resultado no endereço.
 *
 * O estado vai como parâmetro opaco (`ok`, `invalido`, `erro`) — nunca o
 * token, nunca o e-mail: o endereço final fica no histórico do navegador e é
 * enviado no Referer, então não pode carregar dado de ninguém.
 */
function redirecionar(estado: "ok" | "invalido" | "erro"): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${BLOG_URL}/descadastro?estado=${estado}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

const donePage = () => redirecionar("ok");

// Um único estado para "token ausente", "token malformado" e "token
// desconhecido": nenhuma dessas respostas diz se algum e-mail está ou não na
// base.
const invalidPage = () => redirecionar("invalido");

const errorPage = () => redirecionar("erro");

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    // Não é caminho humano (o link do e-mail é sempre GET): texto curto basta.
    return new Response("Abra o link de cancelamento direto do e-mail que você recebeu.", {
      status: 405,
      headers: { "Cache-Control": "no-store" },
    });
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
