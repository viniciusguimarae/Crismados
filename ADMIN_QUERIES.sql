-- ============================================================
-- CONFRARIA DOS CRISMADOS — ADMIN_QUERIES.sql
-- SQL pronto para uso pelo administrador no Supabase
-- SQL Editor → New Query → Cole o trecho → Run
-- ============================================================


-- ─── 1. VER TODOS OS MEMBROS E SEUS IDs ──────────────────────
-- Use para encontrar o member_id antes de inserir presenças manualmente.

SELECT id, name, auth_user_id, created_at
FROM members
ORDER BY name;


-- ─── 2. INSERÇÃO RETROATIVA DE PRESENÇA ──────────────────────
-- Use quando um membro esqueceu de registrar no domingo/segunda.
-- Substitua o nome e as datas conforme necessário.

INSERT INTO attendances (member_id, sunday_date, month_key)
VALUES (
  (SELECT id FROM members WHERE name ILIKE 'Vinicius'),  -- ← troque o nome
  '2026-05-04',                                           -- ← troque pelo domingo correto (YYYY-MM-DD)
  '2026-05'                                               -- ← troque pelo mês correto (YYYY-MM)
)
ON CONFLICT (member_id, sunday_date) DO NOTHING;
-- ON CONFLICT garante que não cria duplicata caso a presença já exista.


-- ─── 3. VER PRESENÇAS DO MÊS ATUAL ──────────────────────────
-- Substitua '2026-05' pelo mês que quiser consultar.

SELECT
  m.name,
  a.sunday_date,
  a.month_key,
  a.created_at
FROM attendances a
JOIN members m ON a.member_id = m.id
WHERE a.month_key = '2026-05'   -- ← troque pelo mês
ORDER BY m.name, a.sunday_date;


-- ─── 4. REMOVER PRESENÇA INCORRETA ──────────────────────────
-- Use com cuidado — apaga um registro específico.

DELETE FROM attendances
WHERE member_id = (SELECT id FROM members WHERE name ILIKE 'Vinicius')  -- ← troque o nome
  AND sunday_date = '2026-05-04';  -- ← troque pela data


-- ─── 5. RESUMO DO MÊS (presenças por membro) ────────────────

SELECT
  m.name,
  COUNT(a.id) AS total_missas,
  STRING_AGG(a.sunday_date::text, ', ' ORDER BY a.sunday_date) AS datas
FROM members m
LEFT JOIN attendances a ON a.member_id = m.id AND a.month_key = '2026-05'  -- ← troque o mês
GROUP BY m.name
ORDER BY total_missas DESC, m.name;


-- ─── 6. ADICIONAR COLUNA auth_user_id (já feito no setup) ────
-- Execute apenas se ainda não tiver rodado durante a configuração.

-- ALTER TABLE members ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
-- ALTER TABLE members ADD CONSTRAINT members_auth_user_id_unique UNIQUE (auth_user_id);


-- ─── 7. VER USUÁRIOS AUTENTICADOS VINCULADOS ─────────────────

SELECT
  m.name,
  m.auth_user_id,
  u.email,
  u.created_at AS conta_criada_em
FROM members m
LEFT JOIN auth.users u ON m.auth_user_id = u.id
ORDER BY m.name;
