"use client";

import { useMemo, useState } from "react";
import { moeda } from "@/features/precos/estrategias";
import { MapaCorridas } from "./MapaCorridas";
import { NovaCorrida } from "./NovaCorrida";
import { DetalheCorrida } from "./DetalheCorrida";
import { useCorridas, useEquipe } from "./dados";
import { ATIVAS, COR_CORRIDA, ROTULO_CORRIDA, formatarKm, hora } from "./tipos";

type Visao = { tipo: "lista" } | { tipo: "nova" } | { tipo: "detalhe"; id: string };

export function PainelCorridas() {
  const { corridas, ofertas, erro } = useCorridas();
  const equipe = useEquipe();
  const [visao, setVisao] = useState<Visao>({ tipo: "lista" });
  const [filtro, setFiltro] = useState<"ativas" | "todas">("ativas");

  const lista = filtro === "ativas" ? corridas.filter((c) => ATIVAS.includes(c.status)) : corridas;
  const nome = (id: string | null) => equipe.find((m) => m.id === id)?.nome;

  const pinosAtivos = useMemo(
    () => corridas.filter((c) => ATIVAS.includes(c.status)).flatMap((c) =>
      c.paradas.filter((p) => p.status !== "concluida").map((p) => ({
        chave: p.id, lat: p.lat, lng: p.lng, tipo: p.tipo, rotulo: `#${c.numero}`,
      }))),
    [corridas],
  );

  if (visao.tipo === "nova") {
    return <NovaCorrida onVoltar={() => setVisao({ tipo: "lista" })} onCriada={(id) => setVisao({ tipo: "detalhe", id })} />;
  }
  if (visao.tipo === "detalhe") {
    const corrida = corridas.find((c) => c.id === visao.id);
    if (corrida) {
      return (
        <DetalheCorrida
          key={corrida.id}
          corrida={corrida}
          oferta={ofertas.find((o) => o.corrida_id === corrida.id)}
          onVoltar={() => setVisao({ tipo: "lista" })}
        />
      );
    }
  }

  return (
    <>
      <aside className="lateral lateral-larga">
        <div className="lateral-cabecalho">
          <span className="rotulo">Corridas</span>
          <div className="filtro">
            <button className={filtro === "ativas" ? "ativo" : ""} onClick={() => setFiltro("ativas")}>Ativas</button>
            <button className={filtro === "todas" ? "ativo" : ""} onClick={() => setFiltro("todas")}>Últimos 3 dias</button>
          </div>
        </div>
        <button className="botao-ouro" onClick={() => setVisao({ tipo: "nova" })}>+ Nova corrida</button>
        {erro && <p className="erro">{erro}</p>}
        {lista.length === 0 && <p className="vazio">Nenhuma corrida {filtro === "ativas" ? "ativa" : "recente"}.</p>}
        {lista.map((c) => {
          const oferta = ofertas.find((o) => o.corrida_id === c.id);
          const coleta = c.paradas[0];
          const entregas = c.paradas.filter((p) => p.tipo === "entrega");
          return (
            <button key={c.id} className="cartao-motoboy" onClick={() => setVisao({ tipo: "detalhe", id: c.id })}>
              <div className="linha">
                <strong>#{c.numero}</strong>
                <span className="status" style={{ color: COR_CORRIDA[c.status] }}>{ROTULO_CORRIDA[c.status]}</span>
                <span className="espaco" />
                <span className="valor-lista">{moeda(c.valor)}</span>
              </div>
              <div className="trajeto-lista">
                <span>↑ {coleta?.endereco}</span>
                <span>↓ {entregas[entregas.length - 1]?.endereco}{entregas.length > 1 ? ` (+${entregas.length - 1})` : ""}</span>
              </div>
              <div className="detalhes">
                <span>{hora(c.criada_em)}</span>
                <span>{formatarKm(c.distancia_planejada_m)}</span>
                {c.motoboy_id && <span>🏍 {nome(c.motoboy_id)}</span>}
                {oferta && <span>Oferecida a {nome(oferta.motoboy_id)}</span>}
              </div>
            </button>
          );
        })}
      </aside>
      <MapaCorridas
        paradas={pinosAtivos}
        motoboys={equipe.filter((m) => m.status !== "offline" && m.lat != null && m.lng != null)
          .map((m) => ({ id: m.id, nome: m.nome, lat: m.lat!, lng: m.lng!, status: m.status }))}
        enquadrar={String(pinosAtivos.length)}
      />
    </>
  );
}
