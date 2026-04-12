# Disparador de Mensagens - Frontend

Frontend administrativo para operar campanhas de WhatsApp usando Supabase + N8N + Uazapi.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- React Hook Form + Zod
- TanStack Query
- Supabase JS
- lucide-react

## Como rodar
1. Instale dependências
```
npm install
```

2. Configure o `.env`
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # obrigatório para acessar schema private (instâncias e auditoria)

# Storage (opcional): default = supabase
STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=campaign-media

# Storage R2 (Cloudflare): usar quando STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=campaign-media
R2_PUBLIC_BASE_URL=https://cdn.seudominio.com
# opcional (override automático do endpoint)
# R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

3. Rode o projeto
```
npm run dev
```

## Estrutura de pastas
- `app/` rotas App Router e API routes
- `components/` UI, layout e módulos de campanha
- `lib/` acesso a dados, schemas, helpers
- `types/` tipos TypeScript das entidades

## Acesso a dados
- Tabelas públicas (`public.*`) são consumidas em rotas server-side (`app/api`).
- Tabelas privadas (`private.*`) são acessadas apenas com `SUPABASE_SERVICE_ROLE_KEY` via `createAdminClient`.

## Módulo de campanhas
- `/campaigns` listagem com filtros e KPIs.
- `/campaigns/new` criação com seções e randomizador.
- `/campaigns/[id]` detalhes, KPIs, abas, envios e auditoria.
- `/campaigns/[id]/edit` edição completa.

## Notas
- O módulo de envios consulta `public.campaign_messages` e abre detalhes em drawer.
- Auditoria lê `private.webhook_events` via rota protegida.
- Caso variáveis não estejam configuradas, o sistema usa mocks locais.
- Upload de mídia usa `/api/storage/upload`.
- Quando `STORAGE_PROVIDER=r2`, o upload vai para Cloudflare R2 (S3 compatível) e o frontend salva em banco a URL pública de `R2_PUBLIC_BASE_URL`.

