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
