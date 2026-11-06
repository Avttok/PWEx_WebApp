"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Building2, CheckCircle2, MapPin, Plus, Save, Search, Star, Trash2, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { geo } from "@/features/geo";
import { useEmpresas, useEquipe } from "@/features/corridas/dados";
import { ROTULO_MODALIDADE, VALOR_KM_PADRAO, moeda, type Modalidade } from "@/features/precos/estrategias";
import { CabecaPagina } from "@/features/ui/CabecaPagina";
import type { Empresa } from "@/features/corridas/tipos";
import type { DadosCnpj } from "@/lib/cnpj/consulta";

interface Formulario {
  nome: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao: string;
  telefone: string;
  email: string;
  endereco: string;
  lat: number | null;
  lng: number | null;
  instrucoes_coleta: string;
  modalidade_preco: Modalidade;
  valor_km: string;
  valor_fixo: string;
  cliente_ve_ao_vivo: boolean;
  observacoes: string;
  favoritos: string[]; // ordem de prioridade
  dados_receita: unknown | null;
}

const vazio: Formulario = {
  nome: "", cnpj: "", razao_social: "", nome_fantasia: "", situacao: "", telefone: "", email: "",
  endereco: "", lat: null, lng: null, instrucoes_coleta: "",
  modalidade_preco: "por_km", valor_km: String(VALOR_KM_PADRAO), valor_fixo: "", cliente_ve_ao_vivo: false,
  observacoes: "", favoritos: [], dados_receita: null,
};

const numero = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const soDigitos = (s: string) => s.replace(/\D/g, "");

function formatarCnpj(s: string) {
  const d = soDigitos(s).slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarTelefone(d: string) {
  return d.length === 11 ? d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

function textoEndereco(e: DadosCnpj["endereco"]) {
  const rua = [e.logradouro, e.numero].filter(Boolean).join(", ");
  const local = [e.bairro, e.cidade && e.uf ? `${e.cidade} - ${e.uf}` : e.cidade].filter(Boolean).join(", ");
  return [rua, local].filter(Boolean).join(", ");
}

export function PainelEmpresas() {
  const { empresas, favoritos, recarregar } = useEmpresas();
  const equipe = useEquipe();
  const [selecionada, setSelecionada] = useState<string | "nova" | null>(null);
  const [form, setForm] = useState<Formulario>(vazio);
  const [salvando, setSalvando] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    if (selecionada === "nova" || selecionada === null) { setForm(vazio); setMsg(null); return; }
    const e = empresas.find((x) => x.id === selecionada);
    if (!e) return;
    setForm({
      nome: e.nome, cnpj: e.cnpj ? formatarCnpj(e.cnpj) : "",
      razao_social: e.razao_social ?? "", nome_fantasia: e.nome_fantasia ?? "", situacao: e.situacao ?? "",
      telefone: e.telefone ?? "", email: e.email ?? "", endereco: e.endereco ?? "", lat: e.lat, lng: e.lng,
      instrucoes_coleta: e.instrucoes_coleta ?? "",
      modalidade_preco: e.modalidade_preco,
      valor_km: e.valor_km != null ? String(e.valor_km) : "", valor_fixo: e.valor_fixo != null ? String(e.valor_fixo) : "",
      cliente_ve_ao_vivo: e.cliente_ve_ao_vivo, observacoes: e.observacoes ?? "",
      favoritos: favoritos.filter((f) => f.empresa_id === e.id).sort((a, b) => a.ordem - b.ordem).map((f) => f.motoboy_id),
      dados_receita: null,
    });
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada]);

  const set = (m: Partial<Formulario>) => setForm((f) => ({ ...f, ...m }));

  async function localizar(texto: string) {
    if (!texto.trim()) return;
    setLocalizando(true);
    const r = await geo.buscarEnderecos(texto).catch(() => []);
    setLocalizando(false);
    if (r[0]) set({ lat: r[0].lat, lng: r[0].lng });
    else setMsg({ tipo: "erro", texto: "Não encontrei esse endereço no mapa. Ajuste o texto e clique em Localizar." });
  }

  async function consultar() {
    setMsg(null);
    const cnpj = soDigitos(form.cnpj);
    if (cnpj.length !== 14) return setMsg({ tipo: "erro", texto: "Digite os 14 dígitos do CNPJ." });
    setConsultando(true);
    const { data } = await supabase().auth.getSession();
    const r = await fetch(`/api/cnpj/${cnpj}`, { headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` } });
    setConsultando(false);
    const j = await r.json();
    if (!r.ok) return setMsg({ tipo: "erro", texto: `Consulta falhou: ${j.erro ?? r.status}` });
    const d = j as DadosCnpj;
    const endereco = textoEndereco(d.endereco);
    setForm((f) => ({
      ...f,
      nome: f.nome || d.nomeFantasia || d.razaoSocial || "",
      razao_social: d.razaoSocial ?? "",
      nome_fantasia: d.nomeFantasia ?? "",
      situacao: d.situacao ?? "",
      telefone: f.telefone || (d.telefones[0] ? formatarTelefone(d.telefones[0]) : ""),
      email: f.email || d.emails[0] || "",
      endereco: f.endereco || endereco,
      dados_receita: d.bruto,
    }));
    setMsg({ tipo: "ok", texto: `Dados da Receita carregados (${d.fonte === "receitaws" ? "ReceitaWS" : "BrasilAPI"}).` });
    if (!form.endereco && endereco) localizar(endereco);
  }

  function alternarFavorito(id: string) {
    setForm((f) => ({ ...f, favoritos: f.favoritos.includes(id) ? f.favoritos.filter((x) => x !== id) : [...f.favoritos, id] }));
  }

  async function salvar() {
    setMsg(null);
    if (!form.nome.trim()) return setMsg({ tipo: "erro", texto: "Informe o nome." });
    if (form.cnpj && soDigitos(form.cnpj).length !== 14) return setMsg({ tipo: "erro", texto: "CNPJ deve ter 14 dígitos." });
    setSalvando(true);
    const sb = supabase();
    const linha: Record<string, unknown> = {
      nome: form.nome.trim(),
      cnpj: form.cnpj ? soDigitos(form.cnpj) : null,
      razao_social: form.razao_social || null,
      nome_fantasia: form.nome_fantasia || null,
      situacao: form.situacao || null,
      telefone: form.telefone || null,
      email: form.email || null,
      endereco: form.endereco || null,
      lat: form.lat,
      lng: form.lng,
      instrucoes_coleta: form.instrucoes_coleta || null,
      modalidade_preco: form.modalidade_preco,
      valor_km: numero(form.valor_km) ?? VALOR_KM_PADRAO,
      valor_fixo: numero(form.valor_fixo),
      cliente_ve_ao_vivo: form.cliente_ve_ao_vivo,
      observacoes: form.observacoes.trim() || null,
    };
    if (form.dados_receita) { linha.dados_receita = form.dados_receita; linha.consultado_em = new Date().toISOString(); }
    const r = selecionada && selecionada !== "nova"
      ? await sb.from("empresas").update(linha).eq("id", selecionada).select("id").single()
      : await sb.from("empresas").insert(linha).select("id").single();
    if (r.error) {
      setSalvando(false);
      return setMsg({ tipo: "erro", texto: r.error.code === "23505" ? "Já existe empresa com esse CNPJ." : r.error.message });
    }
    const id = (r.data as { id: string }).id;
    await sb.from("empresa_favoritos").delete().eq("empresa_id", id);
    if (form.favoritos.length) {
      await sb.from("empresa_favoritos").insert(form.favoritos.map((m, i) => ({ empresa_id: id, motoboy_id: m, ordem: i })));
    }
    setSalvando(false);
    setSelecionada(id);
    recarregar();
    setMsg({ tipo: "ok", texto: "Salvo." });
  }

  async function excluir() {
    if (!selecionada || selecionada === "nova") return;
    if (!confirm("Excluir esta empresa? As corridas antigas ficam, mas sem vínculo.")) return;
    const { error } = await supabase().from("empresas").delete().eq("id", selecionada);
    if (error) return setMsg({ tipo: "erro", texto: error.message });
    setSelecionada(null);
    recarregar();
  }

  const descricaoPreco = (e: Empresa) =>
    e.modalidade_preco === "por_km" ? `${moeda(e.valor_km)}/km` : e.modalidade_preco === "fixo" ? moeda(e.valor_fixo) : "Por zona";
  const inativa = form.situacao && form.situacao !== "ATIVA";

  return (
    <>
      <aside className="lateral entrar">
        <CabecaPagina icone={Building2} titulo="Empresas" subtitulo={`${empresas.length} clientes cadastrados`} />
        <button className="botao-ouro" onClick={() => setSelecionada("nova")}><Plus size={17} aria-hidden /> Nova empresa</button>
        {empresas.map((e) => (
          <button key={e.id} className={`cartao-motoboy ${selecionada === e.id ? "selecionado" : ""}`} onClick={() => setSelecionada(e.id)}>
            <div className="linha">
              <strong>{e.nome}</strong>
              <span className="espaco" />
              <span className="selo" style={{ color: "var(--ouro)" }}>{descricaoPreco(e)}</span>
            </div>
            <div className="detalhes">
              {e.cnpj && <span>{formatarCnpj(e.cnpj)}</span>}
              <span><Star size={12} aria-hidden /> {favoritos.filter((f) => f.empresa_id === e.id).length}</span>
              {e.lat != null && <span><MapPin size={12} aria-hidden /> coleta padrão</span>}
              {e.situacao && e.situacao !== "ATIVA" && <span style={{ color: "var(--vermelho)" }}><AlertTriangle size={12} aria-hidden /> {e.situacao}</span>}
            </div>
          </button>
        ))}
      </aside>

      <main className="conteudo">
        {selecionada === null ? (
          <div className="formulario vidro entrar"><p className="vazio">Selecione uma empresa ou crie uma nova.</p></div>
        ) : (
          <div className="formulario vidro entrar" key={selecionada}>
            <h2 className="display">{selecionada === "nova" ? "Nova empresa" : form.nome}</h2>

            <section className="secao">
              <div className="secao-titulo"><span className="cabeca-icone grad-suave" style={{ width: 34, height: 34, borderRadius: 11 }}><Search size={17} /></span><h3>Identificação</h3></div>
              <div className="grade-2">
                <label className="campo"><span>CNPJ</span>
                  <input value={form.cnpj} placeholder="00.000.000/0000-00" onChange={(e) => set({ cnpj: formatarCnpj(e.target.value) })} /></label>
                <div className="campo"><span>&nbsp;</span>
                  <button className="botao-texto" type="button" onClick={consultar} disabled={consultando} style={{ justifyContent: "center", padding: "10px" }}>
                    <Search size={15} aria-hidden /> {consultando ? "Consultando…" : "Consultar na Receita"}
                  </button>
                </div>
              </div>
              {form.razao_social && (
                <div className={`bloco ${inativa ? "alerta-bloco" : ""}`}>
                  <strong>{form.razao_social}</strong>
                  {form.nome_fantasia && <span className="dica">{form.nome_fantasia}</span>}
                  <span className="dica" style={{ display: "flex", alignItems: "center", gap: 6, color: inativa ? "var(--vermelho)" : "var(--verde)" }}>
                    {inativa ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />} Situação cadastral: {form.situacao || "—"}
                  </span>
                </div>
              )}
              <div className="grade-2">
                <label className="campo"><span>Nome (como aparece no sistema)</span>
                  <input value={form.nome} onChange={(e) => set({ nome: e.target.value })} /></label>
                <label className="campo"><span>Telefone</span>
                  <input value={form.telefone} onChange={(e) => set({ telefone: e.target.value })} /></label>
              </div>
              <label className="campo"><span>E-mail</span>
                <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} /></label>
            </section>

            <section className="secao">
              <div className="secao-titulo"><span className="cabeca-icone grad-suave" style={{ width: 34, height: 34, borderRadius: 11 }}><MapPin size={17} /></span>
                <div><h3>Coleta padrão</h3><p className="dica">Preenche a primeira coleta ao lançar uma corrida para esta empresa.</p></div></div>
              <div className="grade-2">
                <label className="campo"><span>Endereço</span>
                  <input value={form.endereco} onChange={(e) => set({ endereco: e.target.value, lat: null, lng: null })} /></label>
                <div className="campo"><span>&nbsp;</span>
                  <button className="botao-texto" type="button" onClick={() => localizar(form.endereco)} disabled={localizando} style={{ justifyContent: "center", padding: "10px" }}>
                    <MapPin size={15} aria-hidden /> {localizando ? "Localizando…" : form.lat != null ? "Localizado ✓" : "Localizar no mapa"}
                  </button>
                </div>
              </div>
              <label className="campo"><span>Instruções para a coleta</span>
                <input value={form.instrucoes_coleta} placeholder="Portaria, doca, horário…" onChange={(e) => set({ instrucoes_coleta: e.target.value })} /></label>
            </section>

            <section className="secao">
              <div className="secao-titulo"><span className="cabeca-icone grad-suave" style={{ width: 34, height: 34, borderRadius: 11 }}><Wallet size={17} /></span><h3>Preço</h3></div>
              <div className="checks">
                {(Object.keys(ROTULO_MODALIDADE) as Modalidade[]).map((m) => (
                  <label key={m}><input type="radio" checked={form.modalidade_preco === m} onChange={() => set({ modalidade_preco: m })} /> {ROTULO_MODALIDADE[m]}</label>
                ))}
              </div>
              {form.modalidade_preco === "por_km" && (
                <label className="campo curto"><span>Valor por km (R$)</span>
                  <input inputMode="decimal" value={form.valor_km} onChange={(e) => set({ valor_km: e.target.value })} /></label>
              )}
              {form.modalidade_preco === "fixo" && (
                <label className="campo curto"><span>Valor fixo por corrida (R$)</span>
                  <input inputMode="decimal" value={form.valor_fixo} onChange={(e) => set({ valor_fixo: e.target.value })} /></label>
              )}
              {form.modalidade_preco === "por_zona" && <p className="dica">Tabela de zonas virá numa próxima fase. Por enquanto o valor é digitado na corrida.</p>}
              <label className="opcao"><span>Cliente pode acompanhar o motoboy ao vivo</span>
                <input type="checkbox" checked={form.cliente_ve_ao_vivo} onChange={(e) => set({ cliente_ve_ao_vivo: e.target.checked })} /></label>
            </section>

            <section className="secao">
              <div className="secao-titulo"><span className="cabeca-icone grad-suave" style={{ width: 34, height: 34, borderRadius: 11 }}><Star size={17} /></span>
                <div><h3>Motoboys favoritos</h3><p className="dica">Clique na ordem de prioridade. Eles recebem primeiro na cascata.</p></div></div>
              <div className="favoritos">
                {equipe.length === 0 && <span className="dica">Nenhum motoboy cadastrado.</span>}
                {equipe.map((m) => {
                  const pos = form.favoritos.indexOf(m.id);
                  return (
                    <button key={m.id} type="button" className={`chip ${pos >= 0 ? "ativo" : ""}`} onClick={() => alternarFavorito(m.id)}>
                      {pos >= 0 && <span className="ordem grad">{pos + 1}</span>}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {m.foto && <img src={m.foto} alt="" className="foto-chip" />}
                      {m.nome}
                    </button>
                  );
                })}
              </div>
              <label className="campo"><span>Observações internas</span>
                <textarea rows={3} value={form.observacoes} onChange={(e) => set({ observacoes: e.target.value })} /></label>
            </section>

            {msg && <p className={msg.tipo === "erro" ? "erro" : "sucesso"}>{msg.texto}</p>}
            <div className="linha-botoes">
              <button className="botao-ouro" disabled={salvando} onClick={salvar}><Save size={16} aria-hidden /> {salvando ? "Salvando…" : "Salvar"}</button>
              {selecionada !== "nova" && <button className="botao-perigo" onClick={excluir}><Trash2 size={16} aria-hidden /> Excluir</button>}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
