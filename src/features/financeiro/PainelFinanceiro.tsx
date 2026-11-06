"use client";

import { useEffect, useMemo, useState } from "react";
import { Bike, CodeXml, Copy, Download, Landmark, Search, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { moeda } from "@/features/precos/estrategias";
import { useEmpresas, useEquipe } from "@/features/corridas/dados";
import { useModoTeste } from "@/features/teste/modoTeste";
import { toast } from "@/features/ui/toast";

type Periodo = "hoje" | "7d" | "mes" | "30d" | "90d";
const ROTULO: Record<Periodo, string> = { hoje: "Hoje", "7d": "7 dias", mes: "Este mês", "30d": "30 dias", "90d": "90 dias" };
type Aba = "resumo" | "motoboys" | "clientes" | "extrato";

interface Linha {
  id: string; numero: number; teste: boolean; valor: number | null; valor_motoboy: number | null; valor_gestao: number | null; valor_dev: number | null;
  repasse_pct: number | null; dev_pct: number | null; motoboy_id: string | null; empresa_id: string | null; cliente_nome: string | null;
  concluida_em: string; distancia_real_m: number | null; distancia_planejada_m: number | null; pagamento_status: string | null; pagamento_metodo: string | null;
}
interface Chave { usuario_id: string; tipo_chave: string; chave: string; titular: string }

function inicio(p: Periodo) {
  const d = new Date();
  if (p === "hoje") d.setHours(0, 0, 0, 0);
  else if (p === "mes") { d.setDate(1); d.setHours(0, 0, 0, 0); }
  else d.setDate(d.getDate() - (p === "7d" ? 7 : p === "30d" ? 30 : 90));
  return d.toISOString();
}

/** Carteira da gestão: o que entrou, quanto é de cada parte (motoboy, gestão, Dev), extrato e chaves PIX. */
export function PainelFinanceiro() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [aba, setAba] = useState<Aba>("resumo");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [busca, setBusca] = useState("");
  const equipe = useEquipe();
  const { empresas } = useEmpresas();
  const { teste } = useModoTeste();

  useEffect(() => {
    supabase().from("corridas").select("*")
      .eq("status", "concluida").eq("teste", teste).gte("concluida_em", inicio(periodo)).order("concluida_em", { ascending: false }).limit(3000)
      .then(({ data }) => setLinhas((data ?? []) as Linha[]));
  }, [periodo, teste]);
  useEffect(() => { supabase().from("dados_recebimento").select("*").then(({ data }) => setChaves((data ?? []) as Chave[])); }, []);

  const soma = (f: (l: Linha) => number | null, ls = linhas) => ls.reduce((s, l) => s + Number(f(l) ?? 0), 0);
  const total = soma((l) => l.valor), motoboys = soma((l) => l.valor_motoboy), gestao = soma((l) => l.valor_gestao), dev = soma((l) => l.valor_dev);
  const km = soma((l) => l.distancia_real_m ?? l.distancia_planejada_m) / 1000;

  const agrupar = (chave: (l: Linha) => string | null) => {
    const m = new Map<string, { n: number; valor: number; motoboy: number; gestao: number; dev: number }>();
    for (const l of linhas) {
      const k = chave(l) ?? "—";
      const a = m.get(k) ?? { n: 0, valor: 0, motoboy: 0, gestao: 0, dev: 0 };
      a.n++; a.valor += Number(l.valor ?? 0); a.motoboy += Number(l.valor_motoboy ?? 0); a.gestao += Number(l.valor_gestao ?? 0); a.dev += Number(l.valor_dev ?? 0);
      m.set(k, a);
    }
    return [...m.entries()].sort((a, b) => b[1].valor - a[1].valor);
  };
  const porMotoboy = useMemo(() => agrupar((l) => l.motoboy_id), [linhas]); // eslint-disable-line react-hooks/exhaustive-deps
  const porCliente = useMemo(() => agrupar((l) => l.empresa_id ?? (l.cliente_nome ? `avulso:${l.cliente_nome}` : null)), [linhas]); // eslint-disable-line react-hooks/exhaustive-deps
  const nomeM = (id: string | null) => equipe.find((m) => m.id === id)?.nome ?? "—";
  const nomeC = (id: string) => (id === "—" ? "Avulso (sem nome)" : id.startsWith("avulso:") ? `${id.slice(7)} (avulso)` : empresas.find((e) => e.id === id)?.nome ?? "—");
  const clienteDe = (l: Linha) => nomeC(l.empresa_id ?? (l.cliente_nome ? `avulso:${l.cliente_nome}` : "—"));
  const termo = busca.trim().toLowerCase();
  const extrato = linhas.filter((l) => !termo || `${l.numero} ${nomeM(l.motoboy_id)} ${clienteDe(l)}`.toLowerCase().includes(termo));

  function exportar() {
    const cab = ["Corrida", "Concluída em", "Cliente", "Motoboy", "Valor", "Motoboy %", "Motoboy R$", "Gestão R$", "Dev %", "Dev R$", "Km", "Pagamento"];
    const linhasCsv = extrato.map((l) => [
      `${l.teste ? "T" : "#"}${l.numero}`, new Date(l.concluida_em).toLocaleString("pt-BR"), clienteDe(l), nomeM(l.motoboy_id),
      l.valor, l.repasse_pct, l.valor_motoboy, l.valor_gestao, l.dev_pct, l.valor_dev,
      ((l.distancia_real_m ?? l.distancia_planejada_m ?? 0) / 1000).toFixed(1), l.pagamento_metodo ?? l.pagamento_status ?? "",
    ].map((v) => `"${String(v ?? "").replace(".", ",").replace(/"/g, '""')}"`).join(";"));
    const blob = new Blob(["﻿" + [cab.join(";"), ...linhasCsv].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pwexpress-carteira-${periodo}${teste ? "-teste" : ""}.csv`;
    a.click();
  }
  const copiar = (t: string) => { navigator.clipboard?.writeText(t); toast("Chave PIX copiada.", "ok"); };

  return (
    <>
      <aside className="lateral entrar">
        <CabecaPagina icone={Wallet} titulo="Carteira" subtitulo={teste ? "Ganhos das corridas de teste" : "Corridas concluídas"} />
        <div className="filtro filtro-rolavel">
          {(Object.keys(ROTULO) as Periodo[]).map((p) => (
            <button key={p} className={periodo === p ? "ativo" : ""} onClick={() => setPeriodo(p)}>{ROTULO[p]}</button>
          ))}
        </div>
        <div className="bloco"><span className="rotulo"><TrendingUp size={12} /> Faturado</span><strong className="figura texto-grad" style={{ fontSize: 30 }}>{moeda(total)}</strong>
          <span className="dica">{linhas.length} corrida{linhas.length === 1 ? "" : "s"} · {km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km{linhas.length ? ` · média ${moeda(total / linhas.length)}` : ""}</span></div>
        <div className="grade-2">
          <div className="bloco"><span className="rotulo"><Landmark size={12} /> Gestão</span><strong className="figura" style={{ fontSize: 20 }}>{moeda(gestao)}</strong></div>
          <div className="bloco"><span className="rotulo"><Bike size={12} /> Motoboys</span><strong className="figura" style={{ fontSize: 20 }}>{moeda(motoboys)}</strong></div>
        </div>
        <div className="bloco"><span className="rotulo" style={{ color: "var(--cor-dev)" }}><CodeXml size={12} /> Dev</span><strong className="figura" style={{ fontSize: 20 }}>{moeda(dev)}</strong></div>
        <p className="dica">Recebimento automático (PIX e cartão) e o repasse direto para as chaves de cada um entram quando a intermediadora de pagamento for ligada.</p>
      </aside>
      <main className="conteudo">
        <div className="formulario vidro entrar">
          <div className="segmentado" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {([["resumo", "Resumo"], ["motoboys", "Motoboys"], ["clientes", "Clientes"], ["extrato", "Extrato"]] as [Aba, string][]).map(([k, r]) => (
              <button key={k} type="button" className={aba === k ? "ativo" : ""} onClick={() => setAba(k)}>{r}</button>
            ))}
          </div>

          {aba === "resumo" && (
            <>
              <h3 className="display" style={{ margin: 0 }}>Divisão do período</h3>
              <div className="barra-divisao" aria-hidden>
                <span style={{ flex: motoboys || 0.0001, background: "var(--texto-2)" }} />
                <span style={{ flex: gestao || 0.0001, background: "var(--ouro)" }} />
                <span style={{ flex: dev || 0.0001, background: "var(--cor-dev)" }} />
              </div>
              <div className="dev-grade">
                <div className="dev-num"><strong>{moeda(motoboys)}</strong><span>Motoboys · {total ? Math.round((motoboys / total) * 1000) / 10 : 0}%</span></div>
                <div className="dev-num"><strong>{moeda(gestao)}</strong><span>Gestão · {total ? Math.round((gestao / total) * 1000) / 10 : 0}%</span></div>
                <div className="dev-num"><strong>{moeda(dev)}</strong><span>Dev · {total ? Math.round((dev / total) * 1000) / 10 : 0}%</span></div>
              </div>
            </>
          )}

          {aba === "motoboys" && (
            <table className="tabela"><thead><tr><th>Motoboy</th><th>Corridas</th><th>A receber</th><th>Chave PIX</th></tr></thead>
              <tbody>{porMotoboy.map(([id, a]) => {
                const ch = chaves.find((c) => c.usuario_id === id);
                return (
                  <tr key={id}><td>{nomeM(id)}</td><td>{a.n}</td><td>{moeda(a.motoboy)}</td>
                    <td>{ch ? <button className="botao-texto" onClick={() => copiar(ch.chave)} title={`${ch.titular} · ${ch.tipo_chave}`}><Copy size={13} aria-hidden /> {ch.chave}</button> : <span className="dica">não cadastrada</span>}</td></tr>
                );
              })}</tbody></table>
          )}

          {aba === "clientes" && (
            <table className="tabela"><thead><tr><th>Cliente</th><th>Corridas</th><th>Faturado</th><th>Gestão</th><th>Dev</th></tr></thead>
              <tbody>{porCliente.map(([id, a]) => <tr key={id}><td>{nomeC(id)}</td><td>{a.n}</td><td>{moeda(a.valor)}</td><td>{moeda(a.gestao)}</td><td>{moeda(a.dev)}</td></tr>)}</tbody></table>
          )}

          {aba === "extrato" && (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label className="busca-mini" style={{ flex: 1 }}><Search size={14} aria-hidden /><input placeholder="Buscar por número, motoboy ou cliente" value={busca} onChange={(e) => setBusca(e.target.value)} /></label>
                <button className="botao-texto" onClick={exportar} disabled={!extrato.length}><Download size={15} aria-hidden /> Planilha</button>
              </div>
              <div className="dev-rolagem">
                <table className="tabela"><thead><tr><th>Corrida</th><th>Quando</th><th>Cliente</th><th>Motoboy</th><th>Valor</th><th>Motoboy</th><th>Gestão</th><th>Dev</th></tr></thead>
                  <tbody>{extrato.map((l) => (
                    <tr key={l.id}><td>{l.teste ? "T" : "#"}{l.numero}</td><td>{new Date(l.concluida_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td>{clienteDe(l)}</td><td>{nomeM(l.motoboy_id)}</td><td>{moeda(Number(l.valor ?? 0))}</td>
                      <td>{moeda(Number(l.valor_motoboy ?? 0))}</td><td>{moeda(Number(l.valor_gestao ?? 0))}</td><td>{moeda(Number(l.valor_dev ?? 0))}</td></tr>
                  ))}</tbody></table>
              </div>
            </>
          )}
          {linhas.length === 0 && <p className="vazio">Nenhuma corrida concluída neste período.</p>}
        </div>
      </main>
    </>
  );
}
