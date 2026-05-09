// ============================================================
// CONFRARIA DOS CRISMADOS — config.js
// Credenciais do Supabase — preencha após criar o projeto
// ============================================================
// 
// INSTRUÇÕES:
// 1. Acesse https://supabase.com e crie um projeto gratuito
// 2. Vá em Settings → API
// 3. Copie a "Project URL" e a "anon public" key
// 4. Cole abaixo e salve o arquivo
// 5. Rode o SQL do README.md no editor SQL do Supabase
//
// ⚠️  Não commite este arquivo com chaves reais em repositórios públicos.
// ============================================================

export const SUPABASE_URL     = 'https://kswdnujthxtwzhamhhfe.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_evkis287e07eb509ef2d2d907084511516e5';

// ─── Modo de desenvolvimento ──────────────────────────────────
// Defina como true para simular que hoje é domingo (útil para testar o botão)
// Volte para false antes de usar em produção
export const DEBUG_SIMULATE_SUNDAY = false;

// Data simulada (usado apenas quando DEBUG_SIMULATE_SUNDAY = true)
// Formato: 'YYYY-MM-DD' — deve ser uma data de domingo
export const DEBUG_SUNDAY_DATE = '2026-05-10';
