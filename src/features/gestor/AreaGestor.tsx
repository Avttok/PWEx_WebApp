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
import { ProvedorConta, type ContextoConta, type CorTema, type Papel } from "@/features/conta/conta";
import { Toasts, toast } from "@/features/ui/toast";

type Acesso = "carregando" | "anonimo" | "negado" | "gestor";

const ContextoSessao = createContext<Session | null>(null);
export const useSessaoGestor = () => useContext(ContextoSessao);

const ABAS = [
  { href: "/gestor/mapa", rotulo: "Mapa", icone: Map },
  { href: "/gestor/corridas", rotulo: "Corridas", icone: Route },
  { href: "/gestor/empresas", rotulo: "Empresas", icone: Building2 },
  { href: "/gestor/equipe", rotulo: "Equipe", icone: Users },
  { href: "/gestor/carteira", rotulo: "Carteira", icone: Wallet },
  { href: "/gestor/configuracoes", rotulo: "Configurações", icone: Settings2 },
];

/** Protege as páginas do gestor e desenha o cabeçalho com o menu. */
export function AreaGestor({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [nome, setNome] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [acesso, setAcesso] = useState<Acesso>("carregando");
  const [teste, setTeste] = useState(false);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [corTema, setCorTema] = useState<CorTema>("ouro");
  const [modulos, setModulos] = useState<Record<string, boolean>>({});
  const [versaoPerfil, setVersaoPerfil] = useState(0);
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
      const d = perfil.data as { nome?: string; foto_url?: string | null; modo_teste?: boolean; papeis?: Papel[]; dev?: boolean; cor_tema?: CorTema; modulos?: Record<string, boolean> } | null;
      setTeste(Boolean(d?.modo_teste));
      setPapeis(d?.papeis ?? []);
      setCorTema(d?.dev && d?.cor_tema === "vermelho" ? "vermelho" : "ouro");
      setModulos(d?.modulos ?? {});
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
  }, [versaoPerfil]);

  // nome e foto mudados pelo app aparecem aqui na hora (é a mesma conta)
  useEffect(() => {
    const id = sessao?.user.id;
    if (!id) return;
    const sb = supabase();
    const canal = sb.channel(`meu-perfil-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "perfis", filter: `id=eq.${id}` }, (payload) => {
        const n = payload.new as { nome?: string; foto_url?: string | null; modo_teste?: boolean; cor_tema?: CorTema; papeis?: Papel[] };
        if (n.nome) setNome(n.nome);
        setFoto(n.foto_url ?? null);
        if (typeof n.modo_teste === "boolean") setTeste(n.modo_teste);
        if (n.papeis) setPapeis(n.papeis);
        if (n.cor_tema) setCorTema(n.papeis && !n.papeis.includes("dev") ? "ouro" : n.cor_tema);
      })
      .subscribe();
    return () => { sb.removeChannel(canal); };
  }, [sessao?.user.id]);

  const sair = () => sairDaConta();

  const definirTeste = useCallback(async (ligado: boolean) => {
    const { error } = await supabase().rpc("definir_modo_teste", { p_ligado: ligado });
    if (error) {
      return error.message.includes("conclua_a_corrida_antes")
        ? "Termine a corrida em andamento no app antes de trocar o modo."
        : error.message.includes("apenas_gestor") ? "Só gestores podem usar o modo teste."
        : error.message.includes("modulo_desligado") ? "O modo teste está desligado pelo Dev." : error.message;
    }
    setTeste(ligado);
    toast(ligado ? "Tudo violeta: só corridas e ganhos de teste." : "De volta ao normal: tudo vale de verdade.", "info", { titulo: ligado ? "Modo teste ligado" : "Modo teste desligado" });
    return null;
  }, []);
  const dev = papeis.includes("dev");

  // corrida em andamento cujo motoboy não manda posição há 30 min: avisa o gestor (uma vez por corrida)
  useEffect(() => {
    if (acesso !== "gestor") return;
    const avisadas = new Set<string>();
    async function conferir() {
      const sb = supabase();
      const { data: cs } = await sb.from("corridas").select("id,numero,teste,motoboy_id").in("status", ["aceita", "em_andamento"]).not("motoboy_id", "is", null);
      if (!cs?.length) return;
      const ids = [...new Set(cs.map((c) => c.motoboy_id as string))];
      const [{ data: ms }, { data: ps }] = await Promise.all([
        sb.from("motoboys").select("id,posicao_em").in("id", ids),
        sb.from("perfis").select("id,nome").in("id", ids),
      ]);
      const limite = Date.now() - 30 * 60_000;
      for (const c of cs) {
        const m = ms?.find((x) => x.id === c.motoboy_id);
        const t = m?.posicao_em ? new Date(m.posicao_em).getTime() : 0;
        if (t < limite && !avisadas.has(c.id)) {
          avisadas.add(c.id);
          const nome = ps?.find((x) => x.id === c.motoboy_id)?.nome ?? "O motoboy";
          const min = t ? Math.round((Date.now() - t) / 60_000) : null;
          toast(`${nome} está na corrida ${c.teste ? "T" : "#"}${c.numero} e mandou a localização pela última vez ${min ? `há ${min} min` : "há muito tempo"}.`, "aviso", { titulo: "Motoboy sem sinal" });
        } else if (t >= limite) avisadas.delete(c.id);
      }
    }
    conferir();
    const t = setInterval(conferir, 60_000);
    return () => clearInterval(t);
  }, [acesso]);
  // estabelecimentos desligados pelo Dev: some de todos os mapas
  useEffect(() => { if (!dev && modulos.estabelecimentos === false) setEstabelecimentos(false); }, [dev, modulos.estabelecimentos, setEstabelecimentos]);
  const contextoConta = useMemo<ContextoConta>(() => ({
    id: sessao?.user.id ?? "",
    papeis, dev, corTema, modulos,
    modulo: (m) => dev || modulos[m] !== false,
    definirCor: async (c) => {
      const { error } = await supabase().rpc("definir_cor_tema", { p_cor: c });
      if (error) return error.message.includes("apenas_dev") ? "Só o Dev pode usar o tema vermelho." : error.message;
      setCorTema(c);
      return null;
    },
    recarregar: () => setVersaoPerfil((v) => v + 1),
  }), [sessao?.user.id, papeis, dev, corTema, modulos]);
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
      <ProvedorConta valor={contextoConta}>
      <ProvedorTeste valor={contextoTeste}>
      <div className="painel">
        <header className="topo vidro">
          <Link href="/gestor/mapa" aria-label="PW Express, início"><Logo /></Link>
          <nav className="abas">
            {ABAS.filter((a) => a.href !== "/gestor/carteira" || contextoConta.modulo("carteira")).map(({ href, rotulo, icone: Icone }) => (
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
              {contextoConta.modulo("estabelecimentos") && <button className={`pilula vidro ${estabelecimentos ? "ligada" : ""}`} onClick={() => setEstabelecimentos(!estabelecimentos)} aria-pressed={estabelecimentos}>
                <Store size={16} aria-hidden /> {estabelecimentos ? "Ocultar estabelecimentos" : "Mostrar estabelecimentos"}
              </button>}
            </div>
          )}
        </div>
        <footer className="rodape">
          Um projeto de irmão para irmão! <Heart size={13} aria-label="com amor" className="coracao" fill="currentColor" />
        </footer>
      </div>
      <Toasts />
      </ProvedorTeste>
      </ProvedorConta>
    </ContextoSessao.Provider>
  );
}
