"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Building2, ChevronDown, Heart, List, LogOut, Map, Route, Settings2, Users, Wallet } from "lucide-react";
import { sair as sairDaConta, supabase } from "@/lib/supabase/client";
import { contas } from "@/lib/supabase/contas";
import { LoginForm } from "@/features/auth/LoginForm";
import { Logo } from "@/features/marca/Logo";
import { BotaoTema } from "@/features/tema/BotaoTema";

type Acesso = "carregando" | "anonimo" | "negado" | "gestor";

const ContextoSessao = createContext<Session | null>(null);
export const useSessaoGestor = () => useContext(ContextoSessao);

const ABAS = [
  { href: "/gestor/mapa", rotulo: "Mapa", icone: Map },
  { href: "/gestor/corridas", rotulo: "Corridas", icone: Route },
  { href: "/gestor/empresas", rotulo: "Empresas", icone: Building2 },
  { href: "/gestor/equipe", rotulo: "Equipe", icone: Users },
  { href: "/gestor/financeiro", rotulo: "Financeiro", icone: Wallet },
  { href: "/gestor/configuracoes", rotulo: "Configurações", icone: Settings2 },
];

/** Protege as páginas do gestor e desenha o cabeçalho com o menu. */
export function AreaGestor({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [nome, setNome] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [acesso, setAcesso] = useState<Acesso>("carregando");
  const caminho = usePathname();
  // celular: lista sobre o mapa, mostrando ou escondida
  const [gaveta, setGaveta] = useState<"mostrando" | "oculta">("mostrando");
  const telaDeMapa = caminho?.startsWith("/gestor/mapa") || caminho?.startsWith("/gestor/corridas");

  useEffect(() => {
    const sb = supabase();
    async function verificar(s: Session | null) {
      setSessao(s);
      if (!s) return setAcesso("anonimo");
      const [{ data }, perfil] = await Promise.all([
        sb.rpc("is_gestor"),
        sb.from("perfis").select("nome,foto_url").eq("id", s.user.id).maybeSingle(),
      ]);
      const d = perfil.data as { nome?: string; foto_url?: string | null } | null;
      setNome(d?.nome ?? "");
      setFoto(d?.foto_url ?? null);
      if (s.user.email) contas.atualizarPerfil(s.user.email, d?.nome ?? null, d?.foto_url ?? null);
      setAcesso(data === true ? "gestor" : "negado");
    }
    sb.auth.getSession().then(({ data }) => verificar(data.session));
    const { data } = sb.auth.onAuthStateChange((evento, s) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT") verificar(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // nome e foto mudados pelo app aparecem aqui na hora (é a mesma conta)
  useEffect(() => {
    const id = sessao?.user.id;
    if (!id) return;
    const sb = supabase();
    const canal = sb.channel(`meu-perfil-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "perfis", filter: `id=eq.${id}` }, (payload) => {
        const n = payload.new as { nome?: string; foto_url?: string | null };
        if (n.nome) setNome(n.nome);
        setFoto(n.foto_url ?? null);
      })
      .subscribe();
    return () => { sb.removeChannel(canal); };
  }, [sessao?.user.id]);

  const sair = () => sairDaConta();

  if (acesso === "carregando") return <main className="tela-login"><p className="subtitulo">Carregando…</p></main>;
  if (acesso === "anonimo") return <LoginForm />;
  if (acesso === "negado")
    return (
      <main className="tela-login">
        <div className="caixa-login vidro">
          <p className="erro">Este usuário não tem acesso de gestor.</p>
          <button className="botao-ouro" onClick={sair}>Sair</button>
        </div>
      </main>
    );

  const exibido = nome || sessao?.user.email?.split("@")[0] || "Gestor";

  return (
    <ContextoSessao.Provider value={sessao}>
      <div className="painel">
        <header className="topo vidro">
          <Link href="/gestor/mapa" aria-label="PW Express, início"><Logo /></Link>
          <nav className="abas">
            {ABAS.map(({ href, rotulo, icone: Icone }) => (
              <Link key={href} href={href} className={caminho?.startsWith(href) ? "ativa" : ""}>
                <Icone size={17} aria-hidden /> {rotulo}
              </Link>
            ))}
          </nav>
          <span className="espaco" />
          <BotaoTema />
          <div className="usuario">
            {foto
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={foto} alt="" className="avatar avatar-foto" />
              : <span className="avatar grad">{exibido.trim().charAt(0).toUpperCase()}</span>}
            <span className="usuario-texto"><strong>{exibido}</strong><span>{sessao?.user.email}</span></span>
          </div>
          <button className="botao-icone" onClick={sair} title="Sair" aria-label="Sair"><LogOut size={17} aria-hidden /></button>
        </header>
        <div className="corpo" data-gaveta={telaDeMapa ? gaveta : undefined}>
          {children}
          {telaDeMapa && (
            <button className="botao-gaveta vidro" onClick={() => setGaveta((g) => (g === "mostrando" ? "oculta" : "mostrando"))}>
              {gaveta === "mostrando" ? <><ChevronDown size={16} aria-hidden /> Esconder lista</> : <><List size={16} aria-hidden /> Mostrar lista</>}
            </button>
          )}
        </div>
        <footer className="rodape">
          Um projeto de irmão para irmão! <Heart size={13} aria-label="com amor" className="coracao" fill="currentColor" />
        </footer>
      </div>
    </ContextoSessao.Provider>
  );
}
