// Leonida Trophy Guide: an offline tracker + guide for the 55 official GTA VI trophies.
// Progress lives in localStorage under the starter-compatible key; export/import use validated JSON.
const KEY = 'gta6-trophy-checklist';
const $ = (id) => document.getElementById(id);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byName = new Map(trophies.map((t) => [t.name, t]));
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set();
try {
  const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
  if (Array.isArray(raw)) earned = new Set(raw.filter((n) => byName.has(n)));
} catch { earned = new Set(); }
let selectedId = trophies[0].id;
const revealed = new Set(); // per-session spoiler reveals

function save() { localStorage.setItem(KEY, JSON.stringify([...earned])); }
function firstLine(text) { const s = String(text).split('. ')[0]; return s.endsWith('.') ? s : s + '.'; }
function isSpoiler(t) { return t.secret || t.kind === 'story' || t.kind === 'side'; }
function isHidden(t) { return $('spoilerToggle').checked && isSpoiler(t) && !earned.has(t.name) && !revealed.has(t.id); }

// ---------- header progress ----------
function renderProgress() {
  const total = trophies.length;
  const pct = Math.round((earned.size / total) * 100);
  $('progressText').textContent = `${earned.size} of ${total} earned`;
  $('ringPct').textContent = pct + '%';
  $('ring').style.background = `conic-gradient(var(--teal) ${pct * 3.6}deg, #3a2a6e ${pct * 3.6}deg)`;
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  $('gradeCounters').replaceChildren(...grades.map((g) => {
    const all = trophies.filter((t) => t.grade === g);
    const got = all.filter((t) => earned.has(t.name)).length;
    const div = document.createElement('div');
    div.className = 'gc';
    const a = document.createElement('span'); a.textContent = g[0].toUpperCase() + g.slice(1);
    const b = document.createElement('strong'); b.textContent = `${got} / ${all.length}`;
    div.append(a, b);
    return div;
  }));
}

// ---------- checklist ----------
function trophyRow(t) {
  const hidden = isHidden(t);
  const row = document.createElement('div');
  row.className = 'row' + (earned.has(t.name) ? ' earned' : '') + (t.id === selectedId ? ' selected' : '');
  row.setAttribute('role', 'listitem');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', 'Mark ' + t.name + ' as earned');
  box.addEventListener('click', (e) => e.stopPropagation());
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name); else earned.delete(t.name);
    save(); renderAll();
  });
  const main = document.createElement('div'); main.className = 'main';
  const name = document.createElement('div'); name.className = 'name' + (hidden ? ' blurred' : '');
  name.textContent = hidden ? 'Hidden trophy' : t.name;
  const desc = document.createElement('div'); desc.className = 'desc' + (hidden ? ' blurred' : '');
  desc.textContent = hidden ? 'Spoiler protection is on: earn it, or open it and choose Reveal, to see the details.' : t.description;
  const hint = document.createElement('div'); hint.className = 'hint';
  hint.textContent = hidden ? '' : firstLine(t.guide);
  const badges = document.createElement('div'); badges.className = 'badges';
  const mk = (txt, cls) => { const s = document.createElement('span'); s.className = 'badge ' + cls; s.textContent = txt; return s; };
  badges.append(mk(t.grade, 'grade-' + t.grade), mk(t.kind, ''));
  if (t.missable) badges.append(mk('missable-risk', 'risk'));
  if (t.secret) badges.append(mk('secret', 'secret'));
  main.append(name, desc, hint, badges);
  row.append(box, main);
  row.addEventListener('click', () => { selectedId = t.id; renderList(); renderDetail(); });
  return row;
}

function renderList() {
  const q = $('search').value.trim().toLowerCase();
  const gf = $('gradeFilter').value, kf = $('kindFilter').value, sf = $('statusFilter').value;
  const list = $('list');
  list.replaceChildren();
  let shown = 0;
  for (const t of trophies) {
    if (gf !== 'all' && t.grade !== gf) continue;
    if (kf !== 'all' && t.kind !== kf) continue;
    if (sf === 'earned' && !earned.has(t.name)) continue;
    if (sf === 'missing' && earned.has(t.name)) continue;
    if (q && !(t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind).toLowerCase().includes(q)) continue;
    list.append(trophyRow(t)); shown++;
  }
  if (!shown) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'No trophies match these filters.'; list.append(p); }
  $('countLine').textContent = `Showing ${shown} of ${trophies.length} trophies · ${earned.size} earned overall`;
}

function renderDetail() {
  const t = byId.get(selectedId);
  const d = $('detail');
  d.replaceChildren();
  const hidden = isHidden(t);
  const h = document.createElement('h2'); h.textContent = hidden ? 'Hidden trophy' : t.name;
  const desc = document.createElement('p'); desc.className = 'desc';
  desc.textContent = hidden ? 'This trophy is spoiler-protected (secret or story-related) and not yet earned.' : t.description;
  d.append(h, desc);
  const badges = document.createElement('div'); badges.className = 'badges';
  const mk = (txt, cls) => { const s = document.createElement('span'); s.className = 'badge ' + cls; s.textContent = txt; return s; };
  badges.append(mk(t.grade, 'grade-' + t.grade), mk(t.kind, ''), mk('Trophy #' + t.id, ''));
  if (t.missable) badges.append(mk('missable-risk', 'risk'));
  if (t.secret) badges.append(mk('secret', 'secret'));
  d.append(badges);
  if (hidden) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'earnBtn';
    b.textContent = 'Reveal anyway (spoilers)';
    b.addEventListener('click', () => { revealed.add(t.id); renderList(); renderDetail(); });
    d.append(b);
    return;
  }
  const sect = (title, text, cls) => {
    const h3 = document.createElement('h3'); h3.textContent = title;
    const p = document.createElement('p'); if (cls) p.className = cls; p.textContent = text;
    d.append(h3, p);
  };
  sect('Guide — in our own words', t.guide);
  sect('Why this type', t.kindBasis);
  if (t.missable) sect('Missable-risk note', t.missableNote);
  else sect('Missable check', t.missableNote);
  sect('Sources', t.sources, 'sources');
  const b = document.createElement('button'); b.type = 'button'; b.className = 'earnBtn';
  b.textContent = earned.has(t.name) ? 'Earned ✓ — tap to unmark' : 'Mark as earned';
  b.addEventListener('click', () => {
    if (earned.has(t.name)) earned.delete(t.name); else earned.add(t.name);
    save(); renderAll();
  });
  d.append(b);
}

// ---------- roadmap ----------
const PHASES = [
  { title: 'Phase 1 — Arrival in Leonida', ids: [2, 3, 44, 21],
    why: 'The opening mission and Chapter 1, plus two small moments that sit early in the world: the Ocean Beach cocktail (its name, “In The Beginning…”, points at the start) and one finished arcade game while you are learning the map.' },
  { title: 'Phase 2 — The Story Campaign', ids: [4, 5, 6, 8, 9, 10, 11, 12, 13, 48, 7],
    why: 'Chapters 2–4, every named story mission, the choice counter that fills as you play, and the final mission. Watch VCIA on the way through: a second trophy hides in a departure from the same location. Save before the finale.' },
  { title: 'Phase 3 — Strangers & Strands', ids: [22, 23, 24, 26, 27, 29, 25],
    why: 'The five named strand finales (Andy, Kenton, Billy, Randy, Tyrone), Bret’s unique-animal hunt, and the silver for finishing 8 stranger strands. Strands only pay out when finished — close each chain you open.' },
  { title: 'Phase 4 — Leonida in Full', ids: [16, 18, 19, 20, 46, 55, 28, 30, 42, 35, 15, 31, 32, 17, 36, 33, 34, 39, 40, 41, 43, 51, 45, 37, 38, 47, 49, 50],
    why: 'Everything the open world offers: sample every activity, win races, sweep meditation spots and card sets region by region, and work the combat feats and robberies. The big counters (250 stunts, 100 WAiNK locations, 100 vehicles) live here but should already be growing from Phase 1 travel.' },
  { title: 'Phase 5 — Money, Completion & the Platinum', ids: [52, 53, 54, 14, 1],
    why: 'The economy totals ($250,000 laundered, $100,000 spent, all 8 garages) finish once income is flowing, then the 100% completion gold mops up whatever category is still short — and the platinum awards itself.' },
];
function chipFor(t) {
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'chip' + (earned.has(t.name) ? ' done' : '');
  b.textContent = (earned.has(t.name) ? '✓ ' : '') + t.name;
  b.addEventListener('click', () => { selectedId = t.id; showView('checklist'); renderList(); renderDetail(); });
  return b;
}
function renderRoadmap() {
  const wrap = $('phases'); wrap.replaceChildren();
  for (const ph of PHASES) {
    const ts = ph.ids.map((id) => byId.get(id));
    const got = ts.filter((t) => earned.has(t.name)).length;
    const card = document.createElement('div'); card.className = 'card phase';
    const head = document.createElement('div'); head.className = 'phase-head';
    const h = document.createElement('h2'); h.textContent = ph.title;
    const prog = document.createElement('span'); prog.className = 'prog'; prog.textContent = `${got} / ${ts.length} earned`;
    head.append(h, prog);
    const why = document.createElement('p'); why.className = 'why'; why.textContent = ph.why;
    const bar = document.createElement('div'); bar.className = 'bar';
    const fill = document.createElement('i'); fill.style.width = (ts.length ? (got / ts.length) * 100 : 0) + '%';
    bar.append(fill);
    const chips = document.createElement('div'); chips.className = 'chips';
    chips.append(...ts.map(chipFor));
    card.append(head, why, bar, chips);
    wrap.append(card);
  }
}

// ---------- missables ----------
function renderMissables() {
  const wrap = $('missableList'); wrap.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const card = document.createElement('div'); card.className = 'card miss-card';
    const h = document.createElement('h3'); h.textContent = `${t.name} (${t.grade})`;
    const p = document.createElement('p'); p.textContent = t.missableNote;
    const g = document.createElement('p'); g.textContent = t.guide;
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Open in checklist';
    b.addEventListener('click', () => { selectedId = t.id; revealed.add(t.id); showView('checklist'); renderList(); renderDetail(); });
    card.append(h, p, g, b);
    wrap.append(card);
  }
  const secrets = trophies.filter((x) => x.secret);
  $('secretNote').textContent = `${secrets.length} trophies on the official list have cryptic descriptions that withhold their requirement (marked “secret” in the checklist). This guide says plainly what can and cannot be derived from them instead of inventing steps:`;
  const sl = $('secretList'); sl.replaceChildren();
  const chips = document.createElement('div'); chips.className = 'chips';
  chips.append(...secrets.map(chipFor));
  sl.append(chips);
}

// ---------- next up ----------
const QUICK = [21, 20, 16, 44, 46, 45, 41, 51, 55, 37, 39];
const CUMULATIVE = [15, 31, 32, 35, 52, 53, 17];
function nextReason(t) {
  if (t.kind === 'story') return 'Story progression — it unlocks strands, activities and map access for everything else.';
  if (QUICK.includes(t.id)) return 'A quick single-action trophy: set it up deliberately and bank it in minutes.';
  if (t.kind === 'side') return 'A strand finale or strand task — strands only pay out when the chain is finished.';
  if (CUMULATIVE.includes(t.id)) return 'A cumulative counter — worth starting now and feeding passively, not a good endgame grind.';
  if (t.id === 14) return 'The 100% completion gold — an endgame mop-up once strands, activities and counters are done.';
  if (t.id === 1) return 'The platinum: it is the only trophy left. Congratulations in advance.';
  return 'Open-world progress that fits naturally between story missions.';
}
function nextScore(t) {
  if (t.id === 1) return earned.size >= 54 ? 0 : 999;
  if (t.id === 14) return 90;
  if (t.kind === 'story') return 10 + t.id;
  if (QUICK.includes(t.id)) return 30;
  if (t.kind === 'side') return 40;
  if (CUMULATIVE.includes(t.id)) return 60;
  return 50;
}
function renderNext() {
  const wrap = $('nextList'); wrap.replaceChildren();
  const missing = trophies.filter((t) => !earned.has(t.name)).sort((a, b) => nextScore(a) - nextScore(b) || a.id - b.id);
  if (!missing.length) {
    const p = document.createElement('div'); p.className = 'card';
    p.textContent = 'Nothing left: all 55 trophies are earned. Leonida Legend status achieved.';
    wrap.append(p); return;
  }
  missing.slice(0, 8).forEach((t, i) => {
    const card = document.createElement('div'); card.className = 'card next-card';
    const rank = document.createElement('p'); rank.className = 'rank'; rank.textContent = 'Next ' + (i + 1) + ' · ' + t.grade + ' · ' + t.kind;
    const h = document.createElement('h3'); h.textContent = t.name;
    const why = document.createElement('p'); why.className = 'why'; why.textContent = nextReason(t);
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Open guide';
    b.addEventListener('click', () => { selectedId = t.id; showView('checklist'); renderList(); renderDetail(); });
    card.append(rank, h, why, b);
    wrap.append(card);
  });
}

// ---------- views ----------
function showView(name) {
  for (const v of ['checklist', 'roadmap', 'missables', 'next']) {
    $('view-' + v).hidden = v !== name;
    document.querySelector(`.tab[data-view="${v}"]`).classList.toggle('active', v === name);
  }
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  window.scrollTo(0, 0);
}
document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => showView(tab.dataset.view)));

// ---------- import / export ----------
function ioMsg(text) { $('ioMsg').textContent = text; }
$('exportBtn').addEventListener('click', () => {
  const payload = JSON.stringify({ app: 'leonida-trophy-guide', version: 1, earned: [...earned] }, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
  ioMsg(`Exported ${earned.size} earned trophies.`);
});
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    if (!Array.isArray(names) || names.some((n) => typeof n !== 'string')) throw new Error('bad format');
    const valid = names.filter((n) => byName.has(n));
    const ignored = names.length - valid.length;
    earned = new Set(valid);
    save(); renderAll();
    ioMsg(`Imported ${valid.length} earned trophies${ignored ? `; ignored ${ignored} unknown entr${ignored === 1 ? 'y' : 'ies'}` : ''}.`);
  } catch {
    ioMsg('Import failed: that file is not a valid trophy progress file.');
  }
  e.target.value = '';
});
$('resetBtn').addEventListener('click', () => {
  earned = new Set(); save(); renderAll();
  ioMsg('Progress reset.');
});

// ---------- wiring ----------
const kinds = [...new Set(trophies.map((t) => t.kind))].sort();
for (const k of kinds) {
  const o = document.createElement('option'); o.value = k; o.textContent = k[0].toUpperCase() + k.slice(1);
  $('kindFilter').append(o);
}
for (const id of ['search', 'gradeFilter', 'kindFilter', 'statusFilter']) $(id).addEventListener('input', renderList);
$('spoilerToggle').addEventListener('change', () => { renderList(); renderDetail(); });

function renderAll() { renderProgress(); renderList(); renderDetail(); renderRoadmap(); renderMissables(); renderNext(); }
renderAll();
const startView = location.hash.replace('#', '');
if (['roadmap', 'missables', 'next'].includes(startView)) showView(startView);
