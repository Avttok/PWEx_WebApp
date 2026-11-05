"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { LoginForm } from "@/features/auth/LoginForm";
import { MapaAoVivo } from "@/features/rastreamento/MapaAoVivo";

type Acesso = "carregando" | "anonimo" | "negado" | "gestor";

export default function PaginaMapa() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [acesso, setAcesso] = useState<Acesso>("carregando");

  useEffect(() => {
    const sb = supabase();
    async function verificar(s: Session | null) {
      setSessao(s);
      if (!s) return setAcesso("anonimo");
      const { data } = await sb.rpc("is_gestor");
      setAcesso(data === true ? "gestor" : "negado");
    }
    sb.auth.getSession().then(({ data }) => verificar(data.session));
    const { data } = sb.auth.onAuthStateChange((evento, s) => {
      if (evento === "SIGNED_IN" || evento === "SIGNED_OUT") verificar(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const sair = () => supabase().auth.signOut();

  if (acesso === "carregando") return <main className="tela-login"><p className="subtitulo">Carregando…</p></main>;
  if (acesso === "anonimo") return <LoginForm titulo="Painel do gestor" />;
  if (acesso === "negado")
    return (
      <main className="tela-login">
        <div className="caixa-login">
          <p className="erro">Este usuário não tem acesso de gestor.</p>
          <button className="botao-ouro" onClick={sair}>Sair</button>
        </div>
      </main>
    );
  return <MapaAoVivo email={sessao?.user.email ?? ""} onSair={sair} />;
}
