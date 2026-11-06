"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FlaskConical, MapPinned, Route, Trash2, XCircle } from "lucide-react";
import { ExcluirCorridas } from "./ExcluirCorridas";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
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

export function DetalheCorrida({ corrida, oferta, onVoltar, onExcluida }: { corrida: Corrida; oferta?: Oferta; onVoltar: () => void; onExcluida?: () => void }) {
  const [excluindo, setExcluindo] = useState(false);
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
      <aside className="lateral lateral-larga entrar">
        <div className="lateral-cabecalho">
          <button className="botao-texto" onClick={onVoltar}><ArrowLeft size={15} aria-hidden /> Corridas</button>
          {corrida.teste && <span className="selo" style={{ color: "#a78bfa" }}><FlaskConical size={11} aria-hidden /> TESTE</span>}
        </div>
        <CabecaPagina icone={Route} titulo={`Corrida #${corrida.numero}`} subtitulo={`Criada às ${hora(corrida.criada_em)}`} />

        <section className="bloco">
          <div className="status-grande display" style={{ color: COR_CORRIDA[corrida.status] }}>{ROTULO_CORRIDA[corrida.status]}</div>
          {oferta && (
            <p className="dica">Oferecida a <strong>{nome(oferta.motoboy_id)}</strong> ({formatarKm(oferta.distancia_m)} da coleta) · responde em {restante}s</p>
          )}
          {corrida.motoboy_id && (
            <p className="pessoa">
              {motoboy?.foto
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={motoboy.foto} alt="" className="foto-mini" style={{ borderColor: "var(--ouro)" }} />
                : <span className="avatar grad" style={{ width: 26, height: 26, fontSize: 11 }}>{nome(corrida.motoboy_id).charAt(0)}</span>}
              <span>Motoboy: <strong>{nome(corrida.motoboy_id)}</strong></span>
            </p>
          )}
          <div className="numeros">
            <div><span className="rotulo">Valor</span><strong>{moeda(corrida.valor)}</strong></div>
            <div><span className="rotulo">Planejado</span><strong>{formatarKm(corrida.distancia_planejada_m)}</strong><small>{formatarDuracao(corrida.duracao_planejada_s)}</small></div>
            <div><span className="rotulo">Real</span><strong>{formatarKm(corrida.distancia_real_m)}</strong></div>
          </div>
          {corrida.valor_motoboy != null && (
            <div className="numeros">
              <div><span className="rotulo">Motoboy ({Number(corrida.repasse_pct)}%)</span><strong>{moeda(corrida.valor_motoboy)}</strong></div>
              <div><span className="rotulo">Gestão</span><strong className="texto-grad">{moeda(corrida.valor_gestao)}</strong></div>
            </div>
          )}
          <p className="dica" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MapPinned size={13} aria-hidden />
            {corrida.exigir_no_local ? `Etapas exigem estar no local (raio de ${corrida.raio_chegada_m} m)` : "Etapas liberadas em qualquer lugar"}
          </p>
          {corrida.exige_codigo && corrida.codigo_entrega && (
            <p className="codigo">Código de entrega: <strong className="texto-grad">{corrida.codigo_entrega}</strong> <span className="dica">(passe para quem vai receber)</span></p>
          )}
        </section>

        {corrida.status === "sem_motoboy" && (
          <section className="bloco alerta-bloco">
            <span className="rotulo">Despachar de novo</span>
            <select value={motoboyRedespacho} onChange={(e) => setMotoboyRedespacho(e.target.value)}>
              <option value="">Mais próximo da coleta</option>
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
                {p.distancia_chegada_m != null && (
                  <span className="dica">Marcado a {p.distancia_chegada_m} m do endereço{p.local_ignorado ? " · localização ignorada (teste)" : ""}</span>
                )}
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
                  {typeof e.dados.distancia_m === "number" && ` · a ${e.dados.distancia_m} m`}
                  {e.dados.local_ignorado === true && " · local ignorado"}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {erro && <p className="erro">{erro}</p>}
        {!["concluida", "cancelada"].includes(corrida.status) && (
          <button className="botao-perigo" onClick={cancelar}><XCircle size={16} aria-hidden /> Cancelar corrida</button>
        )}
        {["aceita", "em_andamento"].includes(corrida.status) ? (
          <p className="dica">Para apagar esta corrida, cancele-a primeiro.</p>
        ) : (
          <button className="botao-texto" style={{ justifyContent: "center", color: "var(--vermelho)" }} onClick={() => setExcluindo(true)}>
            <Trash2 size={15} aria-hidden /> Apagar corrida
          </button>
        )}
        {excluindo && (
          <ExcluirCorridas corridas={[corrida]} onFechar={() => setExcluindo(false)} onExcluidas={() => { setExcluindo(false); (onExcluida ?? onVoltar)(); }} />
        )}
      </aside>

      <MapaCorridas
        paradas={pinos}
        rotaPlanejada={corrida.rota_planejada}
        trilha={trilha}
        motoboys={ativa && motoboy?.lat != null && motoboy.lng != null
          ? [{ id: motoboy.id, nome: motoboy.nome, lat: motoboy.lat, lng: motoboy.lng, status: motoboy.status, foto: motoboy.foto }] : []}
        enquadrar={corrida.id}
      />
    </>
  );
}
