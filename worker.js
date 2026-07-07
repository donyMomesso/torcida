/**
 * Pappi Pizza — Cloudflare Worker
 * Rotas:
 *   POST /api/leads        → salva lead (WhatsApp + time) no KV
 *   GET  /api/leads        → lista todos os leads (protegido por senha)
 *   GET  /api/leads.csv    → exporta CSV (protegido por senha)
 *   GET  /admin            → painel de administração HTML
 *   GET  /*                → serve arquivos estáticos
 *
 * KV Namespace: LEADS_KV (bind no wrangler.jsonc)
 * Variável de ambiente: ADMIN_PASSWORD (definida no Cloudflare Dashboard)
 */

const ADMIN_PATH = '/admin';
const API_LEADS  = '/api/leads';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* ── POST /api/leads ── Salva lead ── */
    if (request.method === 'POST' && url.pathname === API_LEADS) {
      return handleSaveLead(request, env);
    }

    /* ── GET /api/leads ── Lista leads (JSON) ── */
    if (request.method === 'GET' && url.pathname === API_LEADS) {
      return handleListLeads(request, env);
    }

    /* ── GET /api/leads.csv ── Exporta CSV ── */
    if (request.method === 'GET' && url.pathname === '/api/leads.csv') {
      return handleExportCSV(request, env);
    }

    /* ── GET /admin ── Painel HTML ── */
    if (request.method === 'GET' && url.pathname === ADMIN_PATH) {
      return handleAdmin(request, env);
    }

    /* ── Serve arquivos estáticos (Cloudflare Assets) ── */
    return env.ASSETS.fetch(request);
  }
};

/* ─────────────────────────────────────────────────────────────────────────── */

async function handleSaveLead(request, env) {
  try {
    const body = await request.json();
    const { whatsapp, time, time_nome, data } = body;

    if (!whatsapp || whatsapp.replace(/\D/g,'').length < 10) {
      return json({ ok: false, error: 'WhatsApp inválido' }, 400);
    }

    const key = 'lead:' + whatsapp.replace(/\D/g,'');
    const existing = await env.LEADS_KV.get(key, { type: 'json' });

    const lead = {
      whatsapp: whatsapp.replace(/\D/g,''),
      time: time || 'none',
      time_nome: time_nome || '',
      data_cadastro: existing?.data_cadastro || data || new Date().toISOString(),
      data_atualizacao: data || new Date().toISOString(),
      visitas: (existing?.visitas || 0) + 1
    };

    await env.LEADS_KV.put(key, JSON.stringify(lead));

    return json({ ok: true, lead });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

async function handleListLeads(request, env) {
  if (!checkAuth(request, env)) return unauthorized();

  const leads = await getAllLeads(env);
  return json({ ok: true, total: leads.length, leads });
}

async function handleExportCSV(request, env) {
  if (!checkAuth(request, env)) return unauthorized();

  const leads = await getAllLeads(env);
  const header = 'WhatsApp,Time,Nome do Time,Data Cadastro,Visitas\n';
  const rows = leads.map(l =>
    [l.whatsapp, l.time, l.time_nome, l.data_cadastro, l.visitas].join(',')
  ).join('\n');

  return new Response(header + rows, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads-pappi-pizza.csv"'
    }
  });
}

async function handleAdmin(request, env) {
  /* Autenticação básica via query string: /admin?senha=XXXX */
  const url = new URL(request.url);
  const senha = url.searchParams.get('senha');
  const adminPass = env.ADMIN_PASSWORD || 'pappi2025';

  if (senha !== adminPass) {
    return new Response(loginPage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  const leads = await getAllLeads(env);

  /* Agrupa por time */
  const porTime = {};
  leads.forEach(l => {
    const k = l.time_nome || l.time || 'Sem time';
    porTime[k] = (porTime[k] || 0) + 1;
  });

  return new Response(adminPage(leads, porTime, senha), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

async function getAllLeads(env) {
  const list = await env.LEADS_KV.list({ prefix: 'lead:' });
  const leads = [];
  for (const key of list.keys) {
    const val = await env.LEADS_KV.get(key.name, { type: 'json' });
    if (val) leads.push(val);
  }
  leads.sort((a, b) => new Date(b.data_cadastro) - new Date(a.data_cadastro));
  return leads;
}

function checkAuth(request, env) {
  const url = new URL(request.url);
  const senha = url.searchParams.get('senha');
  return senha === (env.ADMIN_PASSWORD || 'pappi2025');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: 'Não autorizado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

/* ─── HTML do Login ────────────────────────────────────────────────────────── */

function loginPage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pappi Pizza — Painel Admin</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#080808;color:#fff;font-family:system-ui,sans-serif;
  display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{background:#111;border:1px solid rgba(255,255,255,.1);border-radius:20px;
  padding:32px;width:100%;max-width:360px;text-align:center}
img{width:80px;margin-bottom:16px}
h1{font-size:22px;margin-bottom:6px}
p{font-size:13px;color:#888;margin-bottom:24px}
input{width:100%;padding:14px;background:#1a1a1a;border:1.5px solid rgba(255,255,255,.15);
  border-radius:12px;color:#fff;font-size:16px;outline:none;margin-bottom:12px}
input:focus{border-color:#ffd21f}
button{width:100%;padding:14px;background:linear-gradient(135deg,#ffe033,#ffd21f,#ffb300);
  color:#111;border:0;border-radius:12px;font-size:16px;font-weight:900;cursor:pointer}
</style>
</head>
<body>
<div class="card">
  <img src="/public/logo-pappi.png" alt="Pappi Pizza">
  <h1>Painel Admin</h1>
  <p>Digite a senha para acessar os leads</p>
  <form onsubmit="entrar(event)">
    <input type="password" id="senha" placeholder="Senha" autocomplete="current-password">
    <button type="submit">Entrar</button>
  </form>
</div>
<script>
function entrar(e){
  e.preventDefault();
  var s = document.getElementById('senha').value;
  window.location.href = '/admin?senha=' + encodeURIComponent(s);
}
</script>
</body>
</html>`;
}

/* ─── HTML do Painel Admin ─────────────────────────────────────────────────── */

function adminPage(leads, porTime, senha) {
  const rows = leads.map(l => {
    const d = new Date(l.data_cadastro);
    const dataFmt = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    const wa = l.whatsapp;
    const waLink = `https://wa.me/55${wa}`;
    return `<tr>
      <td><a href="${waLink}" target="_blank" style="color:#25d366;font-weight:700">${formatWa(wa)}</a></td>
      <td>${l.time_nome || l.time || '—'}</td>
      <td>${dataFmt}</td>
      <td>${l.visitas || 1}</td>
    </tr>`;
  }).join('');

  const timeRows = Object.entries(porTime)
    .sort((a,b) => b[1]-a[1])
    .map(([t,n]) => `<tr><td>${t}</td><td><b>${n}</b></td></tr>`).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pappi Pizza — Painel de Leads</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#080808;color:#fff;font-family:system-ui,sans-serif;padding:16px}
.header{display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap}
.header img{width:52px}
.header h1{font-size:22px}
.header p{font-size:13px;color:#888}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px}
.stat{background:#111;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px;text-align:center}
.stat-n{font-size:36px;font-weight:900;color:#ffd21f}
.stat-l{font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.5px}
.card{background:#111;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:16px;margin-bottom:16px}
.card h2{font-size:16px;margin-bottom:12px;color:#ffd21f}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px;color:#888;font-weight:700;border-bottom:1px solid rgba(255,255,255,.08)}
td{padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.05)}
tr:last-child td{border-bottom:0}
.btn-export{display:inline-block;padding:12px 20px;background:linear-gradient(135deg,#25d366,#1da851);
  color:#fff;border-radius:12px;font-weight:900;font-size:14px;text-decoration:none;margin-bottom:16px}
.search{width:100%;padding:12px;background:#1a1a1a;border:1.5px solid rgba(255,255,255,.15);
  border-radius:12px;color:#fff;font-size:14px;outline:none;margin-bottom:12px}
.search:focus{border-color:#ffd21f}
</style>
</head>
<body>
<div class="header">
  <img src="/public/logo-pappi.png" alt="Pappi Pizza">
  <div>
    <h1>Painel de Leads</h1>
    <p>Pappi Pizza · Campinas</p>
  </div>
</div>

<div class="stats">
  <div class="stat">
    <div class="stat-n">${leads.length}</div>
    <div class="stat-l">Total de leads</div>
  </div>
  <div class="stat">
    <div class="stat-n">${Object.keys(porTime).length}</div>
    <div class="stat-l">Times diferentes</div>
  </div>
  <div class="stat">
    <div class="stat-n">${leads.filter(l=>l.visitas>1).length}</div>
    <div class="stat-l">Clientes recorrentes</div>
  </div>
</div>

<a class="btn-export" href="/api/leads.csv?senha=${encodeURIComponent(senha)}">⬇ Exportar CSV</a>

<div class="card">
  <h2>📊 Leads por Time</h2>
  <table>
    <thead><tr><th>Time</th><th>Leads</th></tr></thead>
    <tbody>${timeRows}</tbody>
  </table>
</div>

<div class="card">
  <h2>📋 Todos os Leads</h2>
  <input class="search" type="text" placeholder="Buscar por WhatsApp ou time..." oninput="filtrar(this.value)">
  <table id="leadsTable">
    <thead><tr><th>WhatsApp</th><th>Time</th><th>Data</th><th>Visitas</th></tr></thead>
    <tbody id="leadsBody">${rows}</tbody>
  </table>
</div>

<script>
var allRows = document.querySelectorAll('#leadsBody tr');
function filtrar(q){
  q = q.toLowerCase();
  allRows.forEach(function(r){
    r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}
</script>
</body>
</html>`;
}

function formatWa(n) {
  if (!n) return '';
  n = n.replace(/\D/g,'');
  if (n.length === 11) return '(' + n.slice(0,2) + ') ' + n.slice(2,7) + '-' + n.slice(7);
  if (n.length === 10) return '(' + n.slice(0,2) + ') ' + n.slice(2,6) + '-' + n.slice(6);
  return n;
}
