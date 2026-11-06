# PW Express · Web (gestor + clientes) e banco de dados

Next.js na Vercel + Supabase (PostgreSQL/PostGIS, Auth, Realtime).

> **Fase atual: corridas em teste.** Páginas do gestor: `/gestor/mapa`, `/gestor/corridas`, `/gestor/empresas`.

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

3. Fase de corridas: rode `supabase/migrations/20261106000001_corridas.sql`.

Regras de segurança: ninguém grava direto nas tabelas. O app usa as funções `atualizar_status` e `registrar_localizacoes`; leitura é liberada para o próprio motoboy e para gestores.

## Push das ofertas (Firebase)

O banco avisa o site (`/api/push`) e o site envia a notificação pelo Firebase.
Variáveis na Vercel (*Settings → Environment Variables*):

| Nome | Valor |
|------|-------|
| `FIREBASE_SERVICE_ACCOUNT` | conteúdo inteiro do JSON da conta de serviço do Firebase |
| `PUSH_SECRET` | resultado de `select valor from privado.config where chave = 'push_secret';` no SQL Editor |

Depois de salvar, faça *Redeploy*. Conferir: abrir `/api/push` deve mostrar as duas como `true`.

## Mapas

`src/features/geo/` isola busca de endereço e rota. Hoje usa OpenStreetMap + OSRM (grátis, para testes).
Para trocar pelo Google, crie `google.ts` com as mesmas funções e mude o export em `index.ts`.

## Rodar localmente

```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy na Vercel

1. vercel.com → **Add New → Project** → importe `Avttok/PWEx_WebApp`.
2. Framework: Next.js (detectado sozinho). Clique em **Deploy**.

As chaves públicas já estão no `.env`. Chaves secretas (quando existirem) vão só em *Settings → Environment Variables* da Vercel, nunca no repositório.
