"use client";

import { useEffect, useMemo, useState } from "react";
import { Bike, Landmark, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { moeda } from "@/features/precos/estrategias";
import { useEmpresas, useEquipe } from "@/features/corridas/dados";
import { useModoTeste } from "@/features/teste/modoTeste";

type Periodo = "hoje" | "7d" | "mes" | "30d";
const ROTULO: Record<Periodo, string> = { hoje: "Hoje", "7d": "7 dias", mes: "Este mês", "30d": "30 dias" };

interface Linha { id: string; numero: number; valor: number | null; valor_motoboy: number | null; valor_gestao: number | null; motoboy_id: string | null; empresa_id: string | null; concluida_em: string; distancia_real_m: number | null }

function inicio(p: Periodo) {
  const d = new Date();
  if (p === "hoje") d.setHours(0, 0, 0, 0);
  else if (p === "mes") { d.setDate(1); d.setHours(0, 0, 0, 0); }
  else d.setDate(d.getDate() - (p === "7d" ? 7 : 30));
  return d.toISOString();
}

export function PainelFinanceiro() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const equipe = useEquipe();
  const { empresas } = useEmpresas();
  const { teste } = useModoTeste();

  useEffect(() => {
    supabase().from("corridas").select("id,numero,valor,valor_motoboy,valor_gestao,motoboy_id,empresa_id,concluida_em,distancia_real_m")
      .eq("status", "concluida").eq("teste", teste).gte("concluida_em", inicio(periodo)).order("concluida_em", { ascending: false })
      .then(({ data }) => setLinhas((data ?? []) as Linha[]));
  }, [periodo, teste]);

  const soma = (f: (l: Linha) => number | null) => linhas.reduce((s, l) => s + Number(f(l) ?? 0), 0);
  const total = soma((l) => l.valor), motoboys = soma((l) => l.valor_motoboy), gestao = soma((l) => l.valor_gestao);

  const agrupar = (chave: (l: Linha) => string | null) => {
    const m = new Map<string, { n: number; valor: number; motoboy: number; gestao: number }>();
    for (const l of linhas) {
      const k = chave(l) ?? "—";
      const a = m.get(k) ?? { n: 0, valor: 0, motoboy: 0, gestao: 0 };
      a.n++; a.valor += Number(l.valor ?? 0); a.motoboy += Number(l.valor_motoboy ?? 0); a.gestao += Number(l.valor_gestao ?? 0);
      m.set(k, a);
    }
    return [...m.entries()].sort((a, b) => b[1].valor - a[1].valor);
  };
  const porMotoboy = useMemo(() => agrupar((l) => l.motoboy_id), [linhas]); // eslint-disable-line react-hooks/exhaustive-deps
  const porEmpresa = useMemo(() => agrupar((l) => l.empresa_id), [linhas]); // eslint-disable-line react-hooks/exhaustive-deps
  const nomeM = (id: string) => equipe.find((m) => m.id === id)?.nome ?? "—";
  const nomeE = (id: string) => (id === "—" ? "Avulso" : empresas.find((e) => e.id === id)?.nome ?? "—");

  return (
    <>
      <aside className="lateral entrar">
        <CabecaPagina icone={Wallet} titulo="Financeiro" subtitulo={teste ? "Ganhos das corridas de teste" : "Corridas concluídas (sem testes)"} />
        <div className="filtro" style={{ alignSelf: "flex-start" }}>
          {(Object.keys(ROTULO) as Periodo[]).map((p) => (
            <button key={p} className={periodo === p ? "ativo" : ""} onClick={() => setPeriodo(p)}>{ROTULO[p]}</button>
          ))}
        </div>
        <div className="bloco"><span className="rotulo"><TrendingUp size={12} /> Faturado</span><strong className="figura texto-grad" style={{ fontSize: 30 }}>{moeda(total)}</strong><span className="dica">{linhas.length} corridas</span></div>
        <div className="bloco"><span className="rotulo"><Landmark size={12} /> Gestão</span><strong className="figura" style={{ fontSize: 22 }}>{moeda(gestao)}</strong></div>
        <div className="bloco"><span className="rotulo"><Bike size={12} /> Motoboys</span><strong className="figura" style={{ fontSize: 22 }}>{moeda(motoboys)}</strong></div>
      </aside>
      <main className="conteudo">
        <div className="formulario vidro entrar">
          <h3 className="display" style={{ margin: 0 }}>Por motoboy</h3>
          <table className="tabela"><thead><tr><th>Motoboy</th><th>Corridas</th><th>Faturado</th><th>Repasse</th><th>Gestão</th></tr></thead>
            <tbody>{porMotoboy.map(([id, a]) => <tr key={id}><td>{nomeM(id)}</td><td>{a.n}</td><td>{moeda(a.valor)}</td><td>{moeda(a.motoboy)}</td><td>{moeda(a.gestao)}</td></tr>)}</tbody></table>
          <h3 className="display" style={{ margin: "8px 0 0" }}>Por cliente</h3>
          <table className="tabela"><thead><tr><th>Cliente</th><th>Corridas</th><th>Faturado</th></tr></thead>
            <tbody>{porEmpresa.map(([id, a]) => <tr key={id}><td>{nomeE(id)}</td><td>{a.n}</td><td>{moeda(a.valor)}</td></tr>)}</tbody></table>
          {linhas.length === 0 && <p className="vazio">Nenhuma corrida concluída neste período.</p>}
        </div>
      </main>
    </>
  );
}
