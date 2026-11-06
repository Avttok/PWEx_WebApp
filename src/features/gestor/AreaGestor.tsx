"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Building2, ChevronDown, Heart, List, Map, Route, Settings2, Store, Users, Wallet } from "lucide-react";
import { sair as sairDaConta, supabase } from "@/lib/supabase/client";
import { contas } from "@/lib/supabase/contas";
import { LoginForm } from "@/features/auth/LoginForm";
import { Logo } from "@/features/marca/Logo";
import { useEstabelecimentos } from "@/lib/mapa/estabelecimentos";
import { ProvedorTeste } from "@/features/teste/modoTeste";
import { MenuPerfil } from "./MenuPerfil";

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
  const [teste, setTeste] = useState(false);
  const [estabelecimentos, setEstabelecimentos] = useEstabelecimentos();
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
        sb.rpc("meu_perfil"),
      ]);
      const d = perfil.data as { nome?: string; foto_url?: string | null; modo_teste?: boolean } | null;
      setTeste(Boolean(d?.modo_teste));
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
        const n = payload.new as { nome?: string; foto_url?: string | null; modo_teste?: boolean };
        if (n.nome) setNome(n.nome);
        setFoto(n.foto_url ?? null);
        if (typeof n.modo_teste === "boolean") setTeste(n.modo_teste);
      })
      .subscribe();
    return () => { sb.removeChannel(canal); };
  }, [sessao?.user.id]);

  const sair = () => sairDaConta();

  const definirTeste = useCallback(async (ligado: boolean) => {
    const { error } = await supabase().rpc("definir_modo_teste", { p_ligado: ligado });
    if (error) {
      return error.message.includes("conclua_a_corrida_antes")
        ? "Termine a corrida ou a oferta em andamento no app antes de trocar o modo."
        : error.message.includes("apenas_gestor") ? "Só gestores podem usar o modo teste." : error.message;
    }
    setTeste(ligado);
    return null;
  }, []);
  const contextoTeste = useMemo(() => ({ teste, definir: definirTeste }), [teste, definirTeste]);

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
      <ProvedorTeste valor={contextoTeste}>
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
          <MenuPerfil
            id={sessao!.user.id}
            email={sessao?.user.email ?? ""}
            nome={exibido}
            foto={foto}
            onSair={sair}
            onPerfilSalvo={(n, f) => {
              setNome(n);
              setFoto(f);
              if (sessao?.user.email) contas.atualizarPerfil(sessao.user.email, n, f);
            }}
          />
        </header>
        <div className="corpo" data-gaveta={telaDeMapa ? gaveta : undefined}>
          {children}
          {telaDeMapa && (
            <div className="pilulas-mapa">
              <button className="pilula vidro so-celular" onClick={() => setGaveta((g) => (g === "mostrando" ? "oculta" : "mostrando"))}>
                {gaveta === "mostrando" ? <><ChevronDown size={16} aria-hidden /> Esconder lista</> : <><List size={16} aria-hidden /> Mostrar lista</>}
              </button>
              <button className={`pilula vidro ${estabelecimentos ? "ligada" : ""}`} onClick={() => setEstabelecimentos(!estabelecimentos)} aria-pressed={estabelecimentos}>
                <Store size={16} aria-hidden /> {estabelecimentos ? "Ocultar estabelecimentos" : "Mostrar estabelecimentos"}
              </button>
            </div>
          )}
        </div>
        <footer className="rodape">
          Um projeto de irmão para irmão! <Heart size={13} aria-label="com amor" className="coracao" fill="currentColor" />
        </footer>
      </div>
      </ProvedorTeste>
    </ContextoSessao.Provider>
  );
}
