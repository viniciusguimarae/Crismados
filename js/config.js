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
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2RudWp0aHh0d3poYW1oaGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjc2NzAsImV4cCI6MjA5Mzg0MzY3MH0.3ljwlifeQGb6UpPNVBo521nzplJ67JRn9XLbZiSyyS8';

// ─── Modo de desenvolvimento ──────────────────────────────────
// Defina como true para simular que hoje é domingo (útil para testar o botão)
// Volte para false antes de usar em produção
export const DEBUG_SIMULATE_SUNDAY = false;

// Data simulada (usado apenas quando DEBUG_SIMULATE_SUNDAY = true)
// Formato: 'YYYY-MM-DD' — deve ser uma data de domingo
export const DEBUG_SUNDAY_DATE = '2026-05-10';
