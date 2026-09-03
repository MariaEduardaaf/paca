import { useEffect } from "react";
import { Link } from "react-router-dom";

const BLOG_URL = "https://blog.pacafinance.com.br";

/**
 * Catch-all route for paths the router doesn't know.
 *
 * It exists for search engines as much as for people: the deploy is a static
 * SPA, so it can only ever answer 200 (see the noindex note below).
 */
export function NotFoundPage() {
  useEffect(() => {
    // O vercel.json reescreve /(.*) para o index.html, então QUALQUER caminho
    // inexistente responde 200 com o app. Para o Google isso é um espaço
    // infinito de soft-404 num domínio irmão da marca — e existe um projeto de
    // cripto homônimo ("Paca Finance"), então confusão de entidade sai cara
    // justamente na busca de marca, que é o tráfego mais barato que temos.
    //
    // O public/robots.txt já barra o rastreio, mas ele casa por PREFIXO: o
    // `Allow: /signup` de lá também libera /signup/qualquer-coisa, /signup-x —
    // caminhos que não são rota nenhuma e caem aqui. O mesmo vale para
    // /privacy*, /terms*, /support*. Este noindex fecha exatamente esse buraco,
    // sem contradizer o robots.txt.
    //
    // Por que injetar aqui em vez de deixar fixo no index.html: lá a diretiva
    // valeria para o app inteiro, inclusive /signup — a única página que
    // PRECISA ranquear. E a limpeza no unmount importa: sem ela a tag
    // sobreviveria à navegação client-side e deslistaria a página seguinte.
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);

    const previousTitle = document.title;
    document.title = "Página não encontrada · Paca Finance";

    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2">
            <img
              src="/logo-icon-large.png"
              alt=""
              className="w-8 h-8 rounded-lg blend-multiply"
            />
            <span className="text-base font-display font-bold text-pink-primary">
              Paca Finance
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16">
        <div className="w-full max-w-lg text-center animate-fadeIn">
          <p className="font-display font-bold text-6xl sm:text-7xl leading-none text-pink-primary/40 dark:text-pink-primary/50">
            404
          </p>

          <h1 className="mt-5 text-2xl sm:text-3xl font-display font-bold text-gray-800 dark:text-gray-100">
            Esta página não existe
          </h1>

          <p className="mt-3 text-gray-500 dark:text-gray-400 leading-relaxed">
            O endereço que você abriu não corresponde a nenhuma tela do Paca
            Finance. Normalmente é um link antigo ou um erro de digitação.
          </p>

          {/* Links, não <Button>: o componente renderiza <button>, e aqui o que
              se quer é navegação de verdade (âncora clicável, abrir em nova
              aba, e o crawler enxergando a saída). As classes espelham as
              variantes "primary" e "outline" do Button. */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 font-body font-semibold px-6 py-3 text-base rounded-xl transition-all duration-200 bg-gradient-to-r from-pink-primary to-pink-light text-white shadow-lg shadow-pink-primary/25 hover:shadow-xl hover:shadow-pink-primary/30 active:scale-[0.98]"
            >
              Ir para o início
            </Link>
            <a
              href={BLOG_URL}
              className="inline-flex items-center justify-center gap-2 font-body font-semibold px-6 py-3 text-base rounded-xl transition-all duration-200 border-2 border-pink-primary text-pink-primary hover:bg-pink-50 dark:hover:bg-pink-primary/10"
            >
              Ler o blog
            </a>
          </div>

          <p className="mt-8 text-sm text-gray-400">
            Continua sem achar o que procurava?{" "}
            <Link to="/support" className="text-pink-primary hover:underline">
              Fale com o suporte
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
