# PW Express · Web (gestor + clientes) e banco de dados

Next.js na Vercel + Supabase (PostgreSQL/PostGIS, Auth, Realtime).

> **Fase atual: piloto do GPS.** Só existe a página `/gestor/mapa`, que mostra os motoboys e as trilhas em tempo real.

## Estrutura

```
src/app/                 → rotas (páginas). Ficam finas: só montam as features.
src/features/<nome>/     → cada funcionalidade isolada (auth, rastreamento, marca…)
src/lib/                 → infraestrutura compartilhada (cliente Supabase)
supabase/migrations/     → banco versionado: um arquivo por mudança, aplicados em ordem
supabase/seed/           → dados de teste
```

## Banco de dados

1. Supabase → **SQL Editor** → New query → cole `supabase/migrations/20261105000001_piloto_gps.sql` → **Run**.
2. Nova query → cole `supabase/seed/piloto_usuario_teste.sql` → **Run**. A última consulta deve mostrar seu usuário com `{gestor,motoboy}`.

Regras de segurança: ninguém grava direto nas tabelas. O app usa as funções `atualizar_status` e `registrar_localizacoes`; leitura é liberada para o próprio motoboy e para gestores.

## Rodar localmente

```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy na Vercel

1. vercel.com → **Add New → Project** → importe `Avttok/PWEx_WebApp`.
2. Framework: Next.js (detectado sozinho). Clique em **Deploy**.

As chaves públicas já estão no `.env`. Chaves secretas (quando existirem) vão só em *Settings → Environment Variables* da Vercel, nunca no repositório.
