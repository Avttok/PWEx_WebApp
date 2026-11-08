"use client";

import { useCallback, useEffect, useState } from "react";
import { BatteryMedium, Bike, CodeXml, FlaskConical, History, LayoutDashboard, Rocket, ShieldCheck, Smartphone, ToggleRight, UserRound } from "lucide-react";
import { VersaoApp } from "./VersaoApp";
import { supabase } from "@/lib/supabase/client";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { useConta, type Papel } from "@/features/conta/conta";
import { toast } from "@/features/ui/toast";

interface ModuloLinha { chave: string; nome: string; descricao: string | null; grupo: string; ligado: boolean; papeis: Papel[] | null; ordem: number }
interface Painel {
  contagens: Record<string, number>;
  aparelhos: { id: string; nome: string; versao_app: string | null; status: string; posicao_em: string | null; bateria: number | null; precisao_m: number | null; modo_economia: boolean; modo_teste: boolean }[];
  exclusoes: { tipo: string; rotulo: string; motivo: string | null; por: string | null; quando: string }[];
}

const CONTAGENS: [string, string][] = [
  ["contas", "Contas"], ["motoboys_online", "Motoboys online"], ["corridas_ativas", "Corridas ativas"], ["corridas_reais", "Corridas reais"],
  ["corridas_teste", "Corridas de teste"], ["pings_24h", "Pings (24 h)"], ["pings_total", "Pings no banco"], ["corridas_apagadas", "Corridas apagadas"],
  ["contas_excluidas", "Contas excluídas"],
];
const PAPEIS_MODULO: { p: Papel; rotulo: string; icone: typeof Bike }[] = [
  { p: "gestor", rotulo: "Gestores", icone: ShieldCheck }, { p: "motoboy", rotulo: "Motoboys", icone: Bike }, { p: "cliente", rotulo: "Clientes", icone: UserRound },
];

function ha(iso: string | null) {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? "agora" : s < 3600 ? `há ${Math.floor(s / 60)} min` : s < 86400 ? `há ${Math.floor(s / 3600)} h` : `há ${Math.floor(s / 86400)} d`;
}

/** Console do Dev: o sistema inteiro à vista, módulos liga/desliga e quem vê cada um. */
export function PainelDev() {
  const conta = useConta();
  const [aba, setAba] = useState<"modulos" | "versao" | "sistema" | "aparelhos" | "registro">("modulos");
  const [modulos, setModulos] = useState<ModuloLinha[]>([]);
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const sb = supabase();
    const [m, p] = await Promise.all([sb.from("modulos").select("*").order("ordem"), sb.rpc("painel_dev")]);
    if (m.error || p.error) return setErro((m.error ?? p.error)!.message);
    setModulos(m.data as ModuloLinha[]);
    setPainel(p.data as Painel);
  }, []);
  useEffect(() => { if (conta.dev) carregar(); }, [conta.dev, carregar]);

  async function salvar(m: ModuloLinha, ligado: boolean, papeis: Papel[] | null) {
    setModulos((l) => l.map((x) => (x.chave === m.chave ? { ...x, ligado, papeis } : x)));
    const { error } = await supabase().rpc("definir_modulo", { p_chave: m.chave, p_ligado: ligado, p_papeis: papeis && papeis.length ? papeis : null });
    if (error) { toast(error.message, "erro"); carregar(); return; }
    toast(`${m.nome}: ${ligado ? "ligado" : "desligado"}${papeis?.length ? ` · só ${papeis.map((p) => PAPEIS_MODULO.find((x) => x.p === p)?.rotulo.toLowerCase()).join(", ")}` : ""}`, "ok");
    conta.recarregar();
  }

  if (!conta.dev) {
    return <main className="conteudo"><div className="formulario vidro"><p className="erro">Esta área é só do Dev.</p></div></main>;
  }

  const grupos = [...new Set(modulos.map((m) => m.grupo))];
  return (
    <>
      <aside className="lateral entrar">
        <CabecaPagina icone={CodeXml} titulo="Console Dev" subtitulo="O sistema inteiro, sem filtro" />
        <div className="filtro" style={{ alignSelf: "flex-start", flexWrap: "wrap" }}>
          <button className={aba === "modulos" ? "ativo" : ""} onClick={() => setAba("modulos")}><ToggleRight size={14} aria-hidden /> Módulos</button>
          <button className={aba === "versao" ? "ativo" : ""} onClick={() => setAba("versao")}><Rocket size={14} aria-hidden /> Versão do app</button>
          <button className={aba === "sistema" ? "ativo" : ""} onClick={() => setAba("sistema")}><LayoutDashboard size={14} aria-hidden /> Sistema</button>
          <button className={aba === "aparelhos" ? "ativo" : ""} onClick={() => setAba("aparelhos")}><Smartphone size={14} aria-hidden /> Aparelhos</button>
          <button className={aba === "registro" ? "ativo" : ""} onClick={() => setAba("registro")}><History size={14} aria-hidden /> Registro</button>
        </div>
        <p className="dica">Contas (inclusive gestores) você controla em Equipe: só o Dev mexe em contas Dev e dá o cargo Dev.</p>
        {erro && <p className="erro">{erro}</p>}
      </aside>
      <main className="conteudo">
        <div className="formulario vidro entrar">
          {aba === "modulos" && grupos.map((g) => (
            <section key={g} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="rotulo">{g}</span>
              {modulos.filter((m) => m.grupo === g).map((m) => (
                <div key={m.chave} className={`dev-modulo ${m.ligado ? "" : "desligado"}`}>
                  <div className="dev-modulo-topo">
                    <div><strong>{m.nome}</strong><span>{m.descricao}</span></div>
                    <input type="checkbox" role="switch" checked={m.ligado} onChange={(e) => salvar(m, e.target.checked, m.papeis)} aria-label={m.nome} />
                  </div>
                  {m.ligado && (
                    <div className="dev-papeis" aria-label="Quem usa">
                      <span className="dica" style={{ alignSelf: "center" }}>Quem usa:</span>
                      <button className={!m.papeis?.length ? "ativo" : ""} onClick={() => salvar(m, true, null)}>Todos</button>
                      {PAPEIS_MODULO.map(({ p, rotulo, icone: Icone }) => {
                        const ativo = Boolean(m.papeis?.includes(p));
                        return (
                          <button key={p} className={ativo ? "ativo" : ""} onClick={() => {
                            const atual = m.papeis ?? [];
                            salvar(m, true, ativo ? atual.filter((x) => x !== p) : [...atual, p]);
                          }}><Icone size={12} aria-hidden /> {rotulo}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}
          {aba === "versao" && <VersaoApp />}
          {aba === "sistema" && painel && (
            <div className="dev-grade">
              {CONTAGENS.map(([k, r]) => <div key={k} className="dev-num"><strong>{(painel.contagens[k] ?? 0).toLocaleString("pt-BR")}</strong><span>{r}</span></div>)}
            </div>
          )}
          {aba === "aparelhos" && painel && (
            <div className="dev-rolagem">
              <table className="dev-tabela">
                <thead><tr><th>Motoboy</th><th>App</th><th>Status</th><th>Último ping</th><th>Bateria</th><th>Precisão</th><th>Modo</th></tr></thead>
                <tbody>{painel.aparelhos.map((a) => (
                  <tr key={a.id}>
                    <td>{a.nome}</td><td>{a.versao_app ?? "—"}</td><td>{a.status}</td><td>{ha(a.posicao_em)}</td>
                    <td>{a.bateria != null ? <><BatteryMedium size={12} aria-hidden /> {a.bateria}%</> : "—"}</td>
                    <td>{a.precisao_m != null ? `± ${Math.round(a.precisao_m)} m` : "—"}</td>
                    <td>{a.modo_teste ? <><FlaskConical size={12} aria-hidden /> teste</> : "real"}{a.modo_economia ? " · economia" : ""}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
          {aba === "registro" && painel && (
            painel.exclusoes.length === 0 ? <p className="vazio">Nada apagado até agora.</p> : (
              <table className="dev-tabela">
                <thead><tr><th>O quê</th><th>Por</th><th>Quando</th><th>Motivo</th></tr></thead>
                <tbody>{painel.exclusoes.map((x, i) => (
                  <tr key={i}><td>{x.tipo === "conta" ? "Conta" : "Corrida"} {x.rotulo}</td><td>{x.por ?? "—"}</td><td>{new Date(x.quando).toLocaleString("pt-BR")}</td><td>{x.motivo ?? "—"}</td></tr>
                ))}</tbody>
              </table>
            )
          )}
          {!painel && !erro && aba !== "versao" && <p className="dica">Carregando…</p>}
        </div>
      </main>
    </>
  );
}
