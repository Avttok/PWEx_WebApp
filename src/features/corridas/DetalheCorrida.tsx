"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { decodificarPolyline } from "@/lib/geo/polyline";
import { moeda } from "@/features/precos/estrategias";
import { MapaCorridas } from "./MapaCorridas";
import { traduzirErro, useEquipe } from "./dados";
import {
  COR_CORRIDA, ROTULO_CORRIDA, ROTULO_PARADA, formatarDuracao, formatarKm, hora,
  type Corrida, type Evento, type Oferta,
} from "./tipos";

const ROTULO_EVENTO: Record<string, string> = {
  criada: "Corrida criada",
  oferta_enviada: "Oferta enviada",
  oferta_recusada: "Oferta recusada",
  oferta_expirada: "Oferta expirou (30 s)",
  sem_motoboy: "Nenhum motoboy disponível",
  redespachada: "Novo despacho",
  aceita: "Aceita",
  chegou: "Chegou na parada",
  parada_concluida: "Parada concluída",
  concluida: "Corrida concluída",
  cancelada: "Cancelada",
};

function useEventos(corridaId: string) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  useEffect(() => {
    const sb = supabase();
    const carregar = () =>
      sb.from("eventos_corrida").select("*").eq("corrida_id", corridaId).order("criado_em")
        .then(({ data }) => data && setEventos(data as Evento[]));
    const canal = sb.channel(`eventos-${corridaId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "eventos_corrida", filter: `corrida_id=eq.${corridaId}` }, carregar)
      .subscribe();
    carregar();
    return () => { sb.removeChannel(canal); };
  }, [corridaId]);
  return eventos;
}

/** Trilha real: polyline compactada ou pontos ao vivo. */
function useTrilha(corrida: Corrida) {
  const [pontos, setPontos] = useState<[number, number][]>([]);
  const compactada = corrida.trajeto;
  useEffect(() => {
    if (compactada) { setPontos(decodificarPolyline(compactada)); return; }
    const sb = supabase();
    sb.from("localizacoes").select("lat,lng,registrado_em").eq("corrida_id", corrida.id).order("registrado_em").limit(5000)
      .then(({ data }) => data && setPontos(data.map((p) => [p.lng, p.lat] as [number, number])));
    const canal = sb.channel(`trilha-${corrida.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "localizacoes", filter: `corrida_id=eq.${corrida.id}` },
        (payload) => {
          const p = payload.new as { lat: number; lng: number };
          setPontos((l) => [...l, [p.lng, p.lat]]);
        })
      .subscribe();
    return () => { sb.removeChannel(canal); };
  }, [corrida.id, compactada]);
  return pontos;
}

function Comprovante({ caminho, rotulo }: { caminho: string; rotulo: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase().storage.from("comprovantes").createSignedUrl(caminho, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [caminho]);
  if (!url) return <span className="dica">Carregando {rotulo.toLowerCase()}…</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="comprovante">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={rotulo} />
      <span>{rotulo}</span>
    </a>
  );
}

export function DetalheCorrida({ corrida, oferta, onVoltar }: { corrida: Corrida; oferta?: Oferta; onVoltar: () => void }) {
  const equipe = useEquipe();
  const eventos = useEventos(corrida.id);
  const trilha = useTrilha(corrida);
  const [agora, setAgora] = useState(() => Date.now());
  const [erro, setErro] = useState<string | null>(null);
  const [motoboyRedespacho, setMotoboyRedespacho] = useState("");

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const nome = (id: string | null | undefined) => equipe.find((m) => m.id === id)?.nome ?? "Motoboy";
  const motoboy = equipe.find((m) => m.id === corrida.motoboy_id);
  const ativa = ["aceita", "em_andamento"].includes(corrida.status);

  const pinos = useMemo(
    () => corrida.paradas.map((p) => ({
      chave: p.id, lat: p.lat, lng: p.lng, tipo: p.tipo, rotulo: String(p.ordem + 1), concluida: p.status === "concluida",
    })),
    [corrida.paradas],
  );

  async function cancelar() {
    if (!confirm(`Cancelar a corrida #${corrida.numero}?`)) return;
    const { error } = await supabase().rpc("cancelar_corrida", { p_corrida: corrida.id, p_motivo: "Cancelada pelo gestor" });
    if (error) setErro(traduzirErro(error.message));
  }

  async function redespachar() {
    const { error } = await supabase().rpc("redespachar", { p_corrida: corrida.id, p_motoboy: motoboyRedespacho || null });
    if (error) setErro(traduzirErro(error.message));
  }

  const restante = oferta ? Math.max(0, Math.round((new Date(oferta.expira_em).getTime() - agora) / 1000)) : 0;

  return (
    <>
      <aside className="lateral lateral-larga">
        <div className="lateral-cabecalho">
          <button className="botao-texto" onClick={onVoltar}>← Corridas</button>
          <span className="rotulo">Corrida #{corrida.numero}</span>
        </div>

        <section className="bloco">
          <div className="status-grande" style={{ color: COR_CORRIDA[corrida.status] }}>{ROTULO_CORRIDA[corrida.status]}</div>
          {oferta && (
            <p className="dica">Oferecida a <strong>{nome(oferta.motoboy_id)}</strong> ({formatarKm(oferta.distancia_m)} da coleta) · responde em {restante}s</p>
          )}
          {corrida.motoboy_id && <p>Motoboy: <strong>{nome(corrida.motoboy_id)}</strong></p>}
          <div className="numeros">
            <div><span className="rotulo">Valor</span><strong>{moeda(corrida.valor)}</strong></div>
            <div><span className="rotulo">Planejado</span><strong>{formatarKm(corrida.distancia_planejada_m)}</strong><small>{formatarDuracao(corrida.duracao_planejada_s)}</small></div>
            <div><span className="rotulo">Real</span><strong>{formatarKm(corrida.distancia_real_m)}</strong></div>
          </div>
          {corrida.exige_codigo && corrida.codigo_entrega && (
            <p className="codigo">Código de entrega: <strong>{corrida.codigo_entrega}</strong> <span className="dica">(passe para quem vai receber)</span></p>
          )}
        </section>

        {corrida.status === "sem_motoboy" && (
          <section className="bloco alerta-bloco">
            <span className="rotulo">Despachar de novo</span>
            <select value={motoboyRedespacho} onChange={(e) => setMotoboyRedespacho(e.target.value)}>
              <option value="">Mais próximo (cascata)</option>
              {equipe.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <button className="botao-ouro" onClick={redespachar}>Despachar</button>
          </section>
        )}

        <section className="bloco">
          <span className="rotulo">Paradas</span>
          {corrida.paradas.map((p) => (
            <div key={p.id} className={`parada-detalhe ${p.status}`}>
              <span className={`pino-mini ${p.tipo}`}>{p.ordem + 1}</span>
              <div className="parada-texto">
                <strong>{p.tipo === "coleta" ? "Coleta" : "Entrega"} · {ROTULO_PARADA[p.status]}</strong>
                <span>{p.endereco}</span>
                {(p.contato_nome || p.contato_telefone) && <span className="dica">{p.contato_nome} {p.contato_telefone}</span>}
                {p.concluida_em && <span className="dica">Concluída às {hora(p.concluida_em)}</span>}
                {p.recebedor_nome && <span>Recebido por <strong>{p.recebedor_nome}</strong></span>}
                <div className="comprovantes">
                  {p.foto_path && <Comprovante caminho={p.foto_path} rotulo="Foto" />}
                  {p.assinatura_path && <Comprovante caminho={p.assinatura_path} rotulo="Assinatura" />}
                </div>
              </div>
            </div>
          ))}
        </section>

        {corrida.observacoes && (
          <section className="bloco"><span className="rotulo">Observações</span><p>{corrida.observacoes}</p></section>
        )}

        <section className="bloco">
          <span className="rotulo">Linha do tempo</span>
          <ol className="timeline">
            {eventos.map((e) => (
              <li key={e.id}>
                <span className="hora">{new Date(e.criado_em).toLocaleTimeString("pt-BR")}</span>
                <span>
                  {ROTULO_EVENTO[e.tipo] ?? e.tipo}
                  {typeof e.dados.motoboy_id === "string" && ` · ${nome(e.dados.motoboy_id)}`}
                  {typeof e.dados.parada === "number" && ` · parada ${e.dados.parada + 1}`}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {erro && <p className="erro">{erro}</p>}
        {!["concluida", "cancelada"].includes(corrida.status) && (
          <button className="botao-perigo" onClick={cancelar}>Cancelar corrida</button>
        )}
      </aside>

      <MapaCorridas
        paradas={pinos}
        rotaPlanejada={corrida.rota_planejada}
        trilha={trilha}
        motoboys={ativa && motoboy?.lat != null && motoboy.lng != null
          ? [{ id: motoboy.id, nome: motoboy.nome, lat: motoboy.lat, lng: motoboy.lng, status: motoboy.status }] : []}
        enquadrar={corrida.id}
      />
    </>
  );
}
