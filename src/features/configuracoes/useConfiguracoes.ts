"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { PADROES, type Configuracoes } from "./definicoes";

/** Configurações atuais (com padrões para o que ainda não existe), atualizadas em tempo real. */
export function useConfiguracoes(): Configuracoes {
  const [cfg, setCfg] = useState<Configuracoes>(PADROES);
  useEffect(() => {
    const sb = supabase();
    const carregar = () =>
      sb.from("configuracoes").select("chave,valor").then(({ data }) => {
        if (data) setCfg({ ...PADROES, ...Object.fromEntries(data.map((l) => [l.chave, l.valor as number | boolean])) });
      });
    const canal = sb.channel(`cfg-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "configuracoes" }, carregar)
      .subscribe();
    carregar();
    return () => { sb.removeChannel(canal); };
  }, []);
  return cfg;
}
