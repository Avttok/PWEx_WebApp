"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bike, Building2, Layers, RotateCcw, Tags } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useEmpresas, useEquipe } from "@/features/corridas/dados";
import { useConta } from "@/features/conta/conta";
import { toast } from "@/features/ui/toast";
import { GRUPOS, PARAMETROS, ROTULO_ESCOPO, type Configuracoes, type Escopo, type ValorParametro } from "./definicoes";
import { Parametro } from "./PainelConfiguracoes";

interface Politica { escopo: Escopo; alvo: string; chave: string; valor: ValorParametro }
interface Tipo { chave: string; nome: string }

const ICONE = { cliente: Building2, motoboy: Bike, tipo: Tags };

/** Regras diferentes do padrão para um cliente, um motoboy ou um tipo de pedido. Vence: motoboy > cliente > tipo > padrão. */
export function Excecoes({ cfg }: { cfg: Configuracoes }) {
  const conta = useConta();
  const { empresas } = useEmpresas();
  const equipe = useEquipe();
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [escopo, setEscopo] = useState<Escopo>("cliente");
  const [alvo, setAlvo] = useState("");
  const [politicas, setPoliticas] = useState<Politica[]>([]);
  const [estado, setEstado] = useState<Record<string, "salvando" | "salvo" | "erro" | undefined>>({});

  const carregar = useCallback(() => {
    supabase().from("politicas").select("escopo,alvo,chave,valor").then(({ data }) => setPoliticas((data ?? []) as Politica[]));
  }, []);
  useEffect(() => { carregar(); supabase().from("tipos_pedido").select("chave,nome").order("ordem").then(({ data }) => setTipos((data ?? []) as Tipo[])); }, [carregar]);

  const alvos = useMemo(() => {
    if (escopo === "cliente") return empresas.map((e) => ({ id: e.id, nome: e.nome }));
    if (escopo === "motoboy") return equipe.map((m) => ({ id: m.id, nome: m.nome }));
    return tipos.map((t) => ({ id: t.chave, nome: t.nome }));
  }, [escopo, empresas, equipe, tipos]);
  useEffect(() => { if (!alvos.some((a) => a.id === alvo)) setAlvo(alvos[0]?.id ?? ""); }, [alvos, alvo]);

  const params = PARAMETROS.filter((p) => p.escopos?.includes(escopo));
  const minhas = politicas.filter((x) => x.escopo === escopo && x.alvo === alvo);
  const contagem = (id: string) => politicas.filter((x) => x.escopo === escopo && x.alvo === id).length;

  async function definir(chave: string, valor: ValorParametro | null) {
    setEstado((e) => ({ ...e, [chave]: "salvando" }));
    const { error } = await supabase().rpc("definir_politica", { p_escopo: escopo, p_alvo: alvo, p_chave: chave, p_valor: valor });
    if (error) {
      setEstado((e) => ({ ...e, [chave]: "erro" }));
      toast(error.message.includes("apenas_dev") ? "Só o Dev altera a parte do Dev." : error.message, "erro");
      return;
    }
    setEstado((e) => ({ ...e, [chave]: "salvo" }));
    setTimeout(() => setEstado((e) => ({ ...e, [chave]: undefined })), 1500);
    carregar();
  }

  const Icone = ICONE[escopo];
  const fmt = (v: ValorParametro, chave: string) => {
    const p = PARAMETROS.find((x) => x.chave === chave);
    if (typeof v === "boolean") return v ? "ligado" : "desligado";
    const op = p?.opcoes?.find((o) => o.valor === v);
    if (op) return op.rotulo;
    return `${p?.unidade === "R$" ? "R$ " : ""}${String(v).replace(".", ",")}${p?.unidade && p.unidade !== "R$" ? ` ${p.unidade}` : ""}`;
  };

  return (
    <div className="excecoes">
      <div className="segmentado" style={{ gridTemplateColumns: "repeat(3, 1fr)", maxWidth: 520 }}>
        {(["cliente", "motoboy", "tipo"] as Escopo[]).map((e) => {
          const I = ICONE[e];
          return <button key={e} type="button" className={escopo === e ? "ativo" : ""} onClick={() => setEscopo(e)}><I size={14} aria-hidden /> {ROTULO_ESCOPO[e]}</button>;
        })}
      </div>
      <p className="dica" style={{ margin: 0 }}>
        <Layers size={12} aria-hidden /> Quem vence: <strong>motoboy</strong> &gt; <strong>cliente</strong> &gt; <strong>tipo de pedido</strong> &gt; padrão do sistema.
      </p>
      {alvos.length === 0 ? <p className="vazio">Nada para escolher aqui ainda.</p> : (
        <div className="excecoes-alvos">
          {alvos.map((a) => (
            <button key={a.id} type="button" className={`chip ${alvo === a.id ? "ativo" : ""}`} onClick={() => setAlvo(a.id)}>
              <Icone size={13} aria-hidden /> {a.nome}{contagem(a.id) > 0 && <span className="chip-n">{contagem(a.id)}</span>}
            </button>
          ))}
        </div>
      )}
      {alvo && (
        <>
          {minhas.length > 0 && (
            <div className="excecoes-resumo">
              <span className="rotulo">Exceções de {alvos.find((a) => a.id === alvo)?.nome}</span>
              <div className="excecoes-alvos">
                {minhas.map((x) => (
                  <span key={x.chave} className="selo" style={{ color: "var(--ouro)" }}>
                    {PARAMETROS.find((p) => p.chave === x.chave)?.rotulo ?? x.chave}: {fmt(x.valor, x.chave)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="config-lista">
            {Object.keys(GRUPOS).map((g) => {
              const doGrupo = params.filter((p) => p.grupo === g);
              if (!doGrupo.length) return null;
              return (
                <section key={g} className="excecoes-grupo">
                  <h3 className="rotulo">{GRUPOS[g as keyof typeof GRUPOS].titulo}</h3>
                  {doGrupo.map((p) => {
                    const pol = minhas.find((x) => x.chave === p.chave);
                    const bloqueado = p.soDev && !conta.dev;
                    return (
                      <div key={p.chave} className={`excecao ${pol ? "com" : "sem"}`}>
                        <Parametro p={p} valor={pol ? pol.valor : cfg[p.chave]} estado={estado[p.chave]} mostrarGrupo={false} bloqueado={bloqueado}
                          onSalvar={(v) => definir(p.chave, v)}
                          extra={pol
                            ? <span className="excecao-tag">Exceção · padrão: {fmt(cfg[p.chave], p.chave)}
                                {!bloqueado && <button type="button" className="link" onClick={() => definir(p.chave, null)}><RotateCcw size={11} aria-hidden /> usar o padrão</button>}</span>
                            : <span className="excecao-tag padrao">Usando o padrão · mude para criar a exceção</span>} />
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
