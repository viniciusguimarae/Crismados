# Confraria dos Crismados

App mobile-first para rastreamento de presença dominical.  
Tema católico · Supabase + HTML/CSS/JS puro · Mobile-first

---

## Setup em 3 passos

### 1. Crie o projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **New Project** e preencha o nome (ex: `crismados`)
3. Aguarde o projeto inicializar (~1 minuto)
4. Vá em **Settings → API** e copie:
   - **Project URL** (ex: `https://xyzxyz.supabase.co`)
   - **anon public** key

### 2. Configure o `config.js`

Abra `js/config.js` e substitua os placeholders:

```js
export const SUPABASE_URL      = 'https://SEU_PROJETO.supabase.co';
export const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
```

### 3. Rode o SQL no Supabase

No painel do Supabase, vá em **SQL Editor → New Query** e cole o SQL abaixo:

```sql
-- Extensão UUID
create extension if not exists "pgcrypto";

-- ── Tabela de membros ────────────────────────────────────────
create table members (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  created_at timestamptz default now()
);

-- Inserir os 6 membros da Confraria
insert into members (name) values
  ('Vinicius'),
  ('Letícia'),
  ('Tailana'),
  ('Alice'),
  ('Rodrigo'),
  ('Matheus');

-- ── Tabela de presenças ──────────────────────────────────────
create table attendances (
  id          uuid        primary key default gen_random_uuid(),
  member_id   uuid        references members(id) on delete cascade,
  sunday_date date        not null,
  month_key   text        not null,
  created_at  timestamptz default now(),
  -- Evita registro duplicado para o mesmo membro no mesmo domingo
  unique (member_id, sunday_date)
);

-- ── Tabela de meses (histórico futuro) ──────────────────────
create table months (
  id         uuid    primary key default gen_random_uuid(),
  month_key  text    unique not null,
  winner_id  uuid    references members(id),
  closed     boolean default false
);

-- ── Row Level Security (permissivo para v1) ──────────────────
alter table members    enable row level security;
alter table attendances enable row level security;
alter table months     enable row level security;

-- Permite leitura e escrita sem autenticação (v1 — sem PIN)
create policy "Allow all on members"     on members     for all using (true) with check (true);
create policy "Allow all on attendances" on attendances for all using (true) with check (true);
create policy "Allow all on months"      on months      for all using (true) with check (true);
```

Clique em **Run** (ou F5). O banco estará pronto.

---

## Rodando localmente

O app usa ES Modules nativos, então **precisa de um servidor HTTP**.

**Opção mais simples (Node.js):**
```bash
npx serve .
```
Ou com Python:
```bash
python -m http.server 8080
```

Acesse `http://localhost:3000` (ou a porta indicada).

---

## Modo debug (simular domingo)

Para testar o botão de registro sem esperar domingo, abra `js/config.js` e ative:

```js
export const DEBUG_SIMULATE_SUNDAY = true;
export const DEBUG_SUNDAY_DATE = '2026-05-10'; // deve ser um domingo real
```

⚠️ Lembre-se de desativar antes de usar em produção.

---

## Deploy (Netlify)

1. Faça o drag & drop da pasta `Crismados/` no [netlify.com/drop](https://app.netlify.com/drop)
2. O app estará online em segundos com uma URL pública
3. Compartilhe com os membros da Confraria

---

## Estrutura do projeto

```
Crismados/
├── index.html          ← SPA principal (todas as telas)
├── config.js           ← Credenciais Supabase ⚠️
├── css/
│   ├── main.css        ← Variáveis, reset, tipografia
│   ├── animations.css  ← Todos os @keyframes
│   ├── components.css  ← Cards, velas, botões, nav, ranking
│   └── certificate.css ← Pergaminho e certificado
└── js/
    ├── app.js          ← Orquestrador principal e estado
    ├── supabase.js     ← Queries isoladas ao banco
    ├── members.js      ← Dados dos membros e quotes
    ├── dates.js        ← Utilitários de data e domingos
    ├── animations.js   ← Triggers de animação
    ├── certificate.js  ← Lógica do certificado
    └── ui.js           ← Renderização de componentes
```

---

## Adicionando PIN (v2)

O código está preparado. No `app.js`, a função `selectMember()` tem um comentário `TODO (v2)`.
Basta adicionar a verificação antes de setar `state.currentMember`.

No `members.js`, adicione o campo `pin` aos membros locais.

---

*"Ide pelo mundo inteiro e proclamai o Evangelho." — Mc 16,15*
