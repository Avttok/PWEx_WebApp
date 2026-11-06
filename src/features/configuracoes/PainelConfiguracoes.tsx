"use client";

import { useRef, useState } from "react";
import { Check, FlaskConical, MapPinned, Radar, Receipt, Settings2, ShieldCheck, Wallet, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import { GRUPOS, PARAMETROS, type DefParametro, type GrupoParametro } from "./definicoes";
import { useConfiguracoes } from "./useConfiguracoes";

const ICONES: Record<GrupoParametro, LucideIcon> = {
  despacho: Radar, local: MapPinned, preco: Wallet, comprovantes: Receipt, rastreamento: ShieldCheck, teste: FlaskConical,
};

export function PainelConfiguracoes() {
  const cfg = useConfiguracoes();
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<Record<string, "salvando" | "salvo" | "erro">>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  async function salvar(p: DefParametro, valor: number | boolean) {
    setEstado((e) => ({ ...e, [p.chave]: "salvando" }));
    const { error } = await supabase().from("configuracoes").update({ valor }).eq("chave", p.chave);
    setEstado((e) => ({ ...e, [p.chave]: error ? "erro" : "salvo" }));
    if (!error) setTimeout(() => setEstado((e) => ({ ...e, [p.chave]: undefined as never })), 1800);
  }

  function aoDigitar(p: DefParametro, texto: string) {
    setRascunho((r) => ({ ...r, [p.chave]: texto }));
    clearTimeout(timers.current[p.chave]);
    timers.current[p.chave] = setTimeout(() => {
      const n = Number(texto.replace(",", "."));
      if (texto.trim() === "" || Number.isNaN(n)) return;
      const limitado = Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, n));
      salvar(p, limitado);
      setRascunho((r) => { const c = { ...r }; delete c[p.chave]; return c; });
    }, 700);
  }

  const grupos = Object.keys(GRUPOS) as GrupoParametro[];

  return (
    <>
      <aside className="lateral">
        <CabecaPagina icone={Settings2} titulo="Configurações" subtitulo="Valem para todo o sistema" />
        {grupos.map((g) => {
          const Icone = ICONES[g];
          return (
            <a key={g} href={`#grupo-${g}`} className="cartao-motoboy" style={{ textDecoration: "none" }}>
              <div className="linha"><Icone size={16} aria-hidden style={{ color: "var(--ouro)" }} /><strong>{GRUPOS[g].titulo}</strong></div>
              <span className="dica">{GRUPOS[g].descricao}</span>
            </a>
          );
        })}
        <p className="dica">As mudanças são salvas sozinhas. O app aplica as de rastreamento na próxima sincronização.</p>
      </aside>

      <main className="conteudo">
        <div className="formulario vidro entrar">
          {grupos.map((g) => {
            const Icone = ICONES[g];
            return (
              <section key={g} id={`grupo-${g}`} className="secao">
                <div className="secao-titulo">
                  <span className="cabeca-icone grad-suave" style={{ width: 34, height: 34, borderRadius: 11 }}><Icone size={17} aria-hidden /></span>
                  <div>
                    <h3>{GRUPOS[g].titulo}</h3>
                    <p className="dica">{GRUPOS[g].descricao}</p>
                  </div>
                </div>
                {PARAMETROS.filter((p) => p.grupo === g).map((p) => {
                  const valor = cfg[p.chave];
                  const st = estado[p.chave];
                  return (
                    <div key={p.chave} className="parametro">
                      <div>
                        <strong>{p.rotulo}</strong>
                        {p.descricao && <p className="dica">{p.descricao}</p>}
                      </div>
                      <div className="controle">
                        {st === "salvo" && <Check size={16} style={{ color: "var(--verde)" }} aria-label="Salvo" />}
                        {st === "erro" && <span className="erro">Erro</span>}
                        {p.tipo === "booleano" && (
                          <input type="checkbox" checked={Boolean(valor)} onChange={(e) => salvar(p, e.target.checked)} aria-label={p.rotulo} />
                        )}
                        {p.tipo === "numero" && (
                          <>
                            {p.unidade === "R$" && <span className="unidade">R$</span>}
                            <input inputMode="decimal" style={{ width: 110 }}
                              value={rascunho[p.chave] ?? String(valor).replace(".", ",")}
                              onChange={(e) => aoDigitar(p, e.target.value)} aria-label={p.rotulo} />
                            {p.unidade && p.unidade !== "R$" && <span className="unidade">{p.unidade}</span>}
                          </>
                        )}
                        {p.tipo === "opcoes" && (
                          <select value={String(valor)} style={{ width: 150 }} onChange={(e) => salvar(p, Number(e.target.value))} aria-label={p.rotulo}>
                            {p.opcoes!.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
