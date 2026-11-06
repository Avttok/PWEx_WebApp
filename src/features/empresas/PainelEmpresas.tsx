"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useEmpresas, useEquipe } from "@/features/corridas/dados";
import { ROTULO_MODALIDADE, VALOR_KM_PADRAO, moeda, type Modalidade } from "@/features/precos/estrategias";
import type { Empresa } from "@/features/corridas/tipos";

interface Formulario {
  nome: string;
  cnpj: string;
  modalidade_preco: Modalidade;
  valor_km: string;
  valor_fixo: string;
  cliente_ve_ao_vivo: boolean;
  observacoes: string;
  favoritos: string[]; // ordem de prioridade
}

const vazio: Formulario = {
  nome: "", cnpj: "", modalidade_preco: "por_km", valor_km: String(VALOR_KM_PADRAO),
  valor_fixo: "", cliente_ve_ao_vivo: false, observacoes: "", favoritos: [],
};

const numero = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const soDigitos = (s: string) => s.replace(/\D/g, "");

function formatarCnpj(s: string) {
  const d = soDigitos(s).slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

export function PainelEmpresas() {
  const { empresas, favoritos, recarregar } = useEmpresas();
  const equipe = useEquipe();
  const [selecionada, setSelecionada] = useState<string | "nova" | null>(null);
  const [form, setForm] = useState<Formulario>(vazio);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => {
    if (selecionada === "nova" || selecionada === null) { setForm(vazio); return; }
    const e = empresas.find((x) => x.id === selecionada);
    if (!e) return;
    setForm({
      nome: e.nome,
      cnpj: e.cnpj ? formatarCnpj(e.cnpj) : "",
      modalidade_preco: e.modalidade_preco,
      valor_km: e.valor_km != null ? String(e.valor_km) : "",
      valor_fixo: e.valor_fixo != null ? String(e.valor_fixo) : "",
      cliente_ve_ao_vivo: e.cliente_ve_ao_vivo,
      observacoes: e.observacoes ?? "",
      favoritos: favoritos.filter((f) => f.empresa_id === e.id).sort((a, b) => a.ordem - b.ordem).map((f) => f.motoboy_id),
    });
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionada]);

  function alternarFavorito(id: string) {
    setForm((f) => ({ ...f, favoritos: f.favoritos.includes(id) ? f.favoritos.filter((x) => x !== id) : [...f.favoritos, id] }));
  }

  async function salvar() {
    setMsg(null);
    if (!form.nome.trim()) return setMsg({ tipo: "erro", texto: "Informe o nome." });
    if (form.cnpj && soDigitos(form.cnpj).length !== 14) return setMsg({ tipo: "erro", texto: "CNPJ deve ter 14 dígitos." });
    setSalvando(true);
    const sb = supabase();
    const linha = {
      nome: form.nome.trim(),
      cnpj: form.cnpj ? soDigitos(form.cnpj) : null,
      modalidade_preco: form.modalidade_preco,
      valor_km: numero(form.valor_km) ?? VALOR_KM_PADRAO,
      valor_fixo: numero(form.valor_fixo),
      cliente_ve_ao_vivo: form.cliente_ve_ao_vivo,
      observacoes: form.observacoes.trim() || null,
    };
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

  return (
    <>
      <aside className="lateral">
        <div className="lateral-cabecalho">
          <span className="rotulo">Empresas</span>
          <span className="contador">{empresas.length}</span>
        </div>
        <button className="botao-ouro" onClick={() => setSelecionada("nova")}>+ Nova empresa</button>
        {empresas.map((e) => (
          <button key={e.id} className={`cartao-motoboy ${selecionada === e.id ? "selecionado" : ""}`} onClick={() => setSelecionada(e.id)}>
            <div className="linha"><strong>{e.nome}</strong><span className="status">{descricaoPreco(e)}</span></div>
            <div className="detalhes">
              {e.cnpj && <span>{formatarCnpj(e.cnpj)}</span>}
              <span>{favoritos.filter((f) => f.empresa_id === e.id).length} favoritos</span>
              {e.cliente_ve_ao_vivo && <span>Vê ao vivo</span>}
            </div>
          </button>
        ))}
      </aside>

      <main className="conteudo">
        {selecionada === null ? (
          <p className="vazio">Selecione uma empresa ou crie uma nova.</p>
        ) : (
          <div className="formulario">
            <h2>{selecionada === "nova" ? "Nova empresa" : form.nome}</h2>
            <div className="grade-2">
              <label className="campo"><span>Nome</span>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
              <label className="campo"><span>CNPJ</span>
                <input value={form.cnpj} placeholder="00.000.000/0000-00" onChange={(e) => setForm({ ...form, cnpj: formatarCnpj(e.target.value) })} /></label>
            </div>

            <span className="rotulo">Preço</span>
            <div className="checks">
              {(Object.keys(ROTULO_MODALIDADE) as Modalidade[]).map((m) => (
                <label key={m}><input type="radio" checked={form.modalidade_preco === m}
                  onChange={() => setForm({ ...form, modalidade_preco: m })} /> {ROTULO_MODALIDADE[m]}</label>
              ))}
            </div>
            {form.modalidade_preco === "por_km" && (
              <label className="campo curto"><span>Valor por km (R$)</span>
                <input inputMode="decimal" value={form.valor_km} onChange={(e) => setForm({ ...form, valor_km: e.target.value })} /></label>
            )}
            {form.modalidade_preco === "fixo" && (
              <label className="campo curto"><span>Valor fixo por corrida (R$)</span>
                <input inputMode="decimal" value={form.valor_fixo} onChange={(e) => setForm({ ...form, valor_fixo: e.target.value })} /></label>
            )}
            {form.modalidade_preco === "por_zona" && <p className="dica">Tabela de zonas virá numa próxima fase. Por enquanto o valor é digitado na corrida.</p>}

            <label className="checks"><span>
              <input type="checkbox" checked={form.cliente_ve_ao_vivo} onChange={(e) => setForm({ ...form, cliente_ve_ao_vivo: e.target.checked })} />{" "}
              Cliente pode acompanhar o motoboy ao vivo
            </span></label>

            <span className="rotulo">Motoboys favoritos (clique na ordem de prioridade)</span>
            <div className="favoritos">
              {equipe.length === 0 && <span className="dica">Nenhum motoboy cadastrado.</span>}
              {equipe.map((m) => {
                const pos = form.favoritos.indexOf(m.id);
                return (
                  <button key={m.id} type="button" className={`chip ${pos >= 0 ? "ativo" : ""}`} onClick={() => alternarFavorito(m.id)}>
                    {pos >= 0 && <span className="ordem">{pos + 1}</span>}{m.nome}
                  </button>
                );
              })}
            </div>

            <label className="campo"><span>Observações internas</span>
              <textarea rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></label>

            {msg && <p className={msg.tipo === "erro" ? "erro" : "sucesso"}>{msg.texto}</p>}
            <div className="linha-botoes">
              <button className="botao-ouro" disabled={salvando} onClick={salvar}>{salvando ? "Salvando…" : "Salvar"}</button>
              {selecionada !== "nova" && <button className="botao-perigo" onClick={excluir}>Excluir</button>}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
