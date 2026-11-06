"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { LoginForm } from "@/features/auth/LoginForm";
import { Logo } from "@/features/marca/Logo";

type Acesso = "carregando" | "anonimo" | "negado" | "gestor";

const ContextoSessao = createContext<Session | null>(null);
export const useSessaoGestor = () => useContext(ContextoSessao);

const ABAS = [
  { href: "/gestor/mapa", rotulo: "Mapa ao vivo" },
  { href: "/gestor/corridas", rotulo: "Corridas" },
  { href: "/gestor/empresas", rotulo: "Empresas" },
];

/** Protege as páginas do gestor e desenha o cabeçalho com o menu. */
export function AreaGestor({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [acesso, setAcesso] = useState<Acesso>("carregando");
  const caminho = usePathname();

  useEffect(() => {
    const sb = supabase();
    async function verificar(s: Session | null) {
      setSessao(s);
      if (!s) return setAcesso("anonimo");
      const { data } = await sb.rpc("is_gestor");
      setAcesso(data === true ? "gestor" : "negado");
    }
    sb.auth.getSession().then(({ data }) => verificar(data.session));
    const { data } = sb.auth.onAuthStateChange((evento, s) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT") verificar(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const sair = () => supabase().auth.signOut();

  if (acesso === "carregando") return <main className="tela-login"><p className="subtitulo">Carregando…</p></main>;
  if (acesso === "anonimo") return <LoginForm titulo="Painel do gestor" />;
  if (acesso === "negado")
    return (
      <main className="tela-login">
        <div className="caixa-login">
          <p className="erro">Este usuário não tem acesso de gestor.</p>
          <button className="botao-ouro" onClick={sair}>Sair</button>
        </div>
      </main>
    );

  return (
    <ContextoSessao.Provider value={sessao}>
      <div className="painel">
        <header className="topo">
          <Logo />
          <nav className="abas">
            {ABAS.map((a) => (
              <Link key={a.href} href={a.href} className={caminho?.startsWith(a.href) ? "ativa" : ""}>
                {a.rotulo}
              </Link>
            ))}
          </nav>
          <span className="espaco" />
          <span className="topo-email">{sessao?.user.email}</span>
          <button className="botao-texto" onClick={sair}>Sair</button>
        </header>
        <div className="corpo">{children}</div>
      </div>
    </ContextoSessao.Provider>
  );
}
