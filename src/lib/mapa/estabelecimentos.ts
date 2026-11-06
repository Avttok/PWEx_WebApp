"use client";

import { useSyncExternalStore } from "react";

/** Mostrar/ocultar nomes de estabelecimentos em todos os mapas (lembrado neste navegador). */
const CHAVE = "pwex-estabelecimentos";
const ouvintes = new Set<() => void>();

export function estabelecimentosVisiveis(): boolean {
  try { return localStorage.getItem(CHAVE) !== "0"; } catch { return true; }
}

export function definirEstabelecimentos(v: boolean) {
  try { localStorage.setItem(CHAVE, v ? "1" : "0"); } catch {}
  ouvintes.forEach((f) => f());
}

export function aoMudarEstabelecimentos(f: () => void) {
  ouvintes.add(f);
  return () => { ouvintes.delete(f); };
}

export function useEstabelecimentos(): [boolean, (v: boolean) => void] {
  const v = useSyncExternalStore(aoMudarEstabelecimentos, estabelecimentosVisiveis, () => true);
  return [v, definirEstabelecimentos];
}

// ------------------------------------------------------------------ nomes de rua
/** Como mostrar os nomes das ruas: escritos na própria rua, em placas, ou ocultos. */
export type ModoRuas = "rua" | "placa" | "oculta";
const CHAVE_RUAS = "pwex-ruas";
const ouvintesRuas = new Set<() => void>();
export function modoRuas(): ModoRuas {
  try { return (localStorage.getItem(CHAVE_RUAS) as ModoRuas) || "rua"; } catch { return "rua"; }
}
export function definirModoRuas(v: ModoRuas) {
  try { localStorage.setItem(CHAVE_RUAS, v); } catch {}
  ouvintesRuas.forEach((f) => f());
}
export function aoMudarRuas(f: () => void) {
  ouvintesRuas.add(f);
  return () => { ouvintesRuas.delete(f); };
}
export function useModoRuas(): [ModoRuas, (v: ModoRuas) => void] {
  const v = useSyncExternalStore(aoMudarRuas, modoRuas, () => "rua" as ModoRuas);
  return [v, definirModoRuas];
}
