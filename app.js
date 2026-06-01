/* ──────────────────────────────────────────────────────────────────────────
   Риелти — Telegram Mini App. Тёмный минимализм. Vanilla JS, без сборки.
   ────────────────────────────────────────────────────────────────────────── */
const tg = window.Telegram?.WebApp;
const INIT = tg?.initData || "";
const AUTHQ = encodeURIComponent(INIT);

if (tg) {
  tg.ready(); tg.expand();
  try { tg.setHeaderColor("#0d0f12"); tg.setBackgroundColor("#0d0f12"); } catch (e) {}
  try { tg.enableClosingConfirmation(); } catch (e) {}
}
const haptic = (t = "light") => { try { tg?.HapticFeedback?.impactOccurred(t); } catch (e) {} };
const notify = (t = "success") => { try { tg?.HapticFeedback?.notificationOccurred(t); } catch (e) {} };

/* ── API ──
   Фронт может быть на другом домене (GitHub Pages, чистый HTTPS без заглушки),
   а данные брать с ngrok. На github.io берём API с ngrok; иначе — со своего origin.
   Заголовок ngrok-skip-browser-warning снимает заглушку для fetch/картинок. */
const NGROK_BASE = "https://postage-bucket-anything.ngrok-free.dev";
const API_BASE = location.hostname.endsWith("github.io") ? NGROK_BASE : "";
const BASE_HEADERS = { "X-Init-Data": INIT, "ngrok-skip-browser-warning": "true" };

async function api(path, opts = {}) {
  const headers = { ...BASE_HEADERS };
  if (opts.body) headers["Content-Type"] = "application/json";
  const r = await fetch(API_BASE + "/api" + path, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
  return r.json();
}

// Картинку нельзя грузить простым <img src> (cross-origin не добавит заголовок и
// упрётся в заглушку ngrok). Тянем через fetch с заголовком и отдаём blob-URL.
async function fetchImg(path) {
  const r = await fetch(API_BASE + "/api" + path, { headers: BASE_HEADERS });
  if (!r.ok) throw new Error("img " + r.status);
  return URL.createObjectURL(await r.blob());
}

/* ── Голосовой ввод: запись через микрофон -> Whisper на бэке -> текст ── */
function voiceButton(onText, label = "🎤 Голосом") {
  const btn = el(`<button class="btn btn-soft sm voicebtn">${label}</button>`);
  let rec = null, chunks = [], stream = null;
  btn.onclick = async () => {
    if (rec && rec.state === "recording") { rec.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia) { toast("Микрофон недоступен", "err"); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { toast("Нет доступа к микрофону", "err"); return; }
    chunks = [];
    try { rec = new MediaRecorder(stream); }
    catch (e) { rec = new MediaRecorder(stream, { mimeType: "audio/webm" }); }
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      btn.textContent = "⏳ Распознаю…"; btn.disabled = true; btn.classList.remove("rec");
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      try {
        const r = await fetch(API_BASE + "/api/transcribe", {
          method: "POST", headers: { ...BASE_HEADERS, "Content-Type": blob.type }, body: blob,
        });
        const j = await r.json();
        if (j.text && j.text.trim()) { onText(j.text.trim()); notify("success"); toast("Распознал ✓", "ok"); }
        else toast("Не расслышал, попробуй ещё", "err");
      } catch (e) { toast("Ошибка распознавания", "err"); }
      btn.textContent = label; btn.disabled = false;
    };
    rec.start(); haptic("medium");
    btn.textContent = "⏹ Стоп — записываю…"; btn.classList.add("rec");
  };
  return btn;
}

/* ── Ленивая подгрузка миниатюр (первое фото объекта) ── */
const thumbObserver = ("IntersectionObserver" in window) ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const node = e.target; thumbObserver.unobserve(node);
    fetchImg(`/listings/${node.dataset.thumb}/photo`)
      .then(url => { node.style.backgroundImage = `url(${url})`; node.classList.add("loaded"); })
      .catch(() => node.classList.add("nophoto"));
  }
}, { rootMargin: "150px" }) : null;

/* ── helpers ── */
const $ = (s, r = document) => r.querySelector(s);
const view = $("#view");
const el = (h) => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstElementChild; };
const esc = (s) => (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtMoney = (n) => n ? n.toLocaleString("ru-RU").replace(/,/g, " ") : "—";
const initials = (name) => (name || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const STATUS_RU = { active: "активный", paused: "на паузе", done: "в архиве" };

function toast(msg, kind = "") {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast " + kind;
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.add("hidden"), 2600);
}
function loading() { view.innerHTML = `<div class="loader"><div class="spin"></div></div>`; }
function setTitle(t, sub = "") { $("#tbTitle").textContent = t; $("#tbSub").textContent = sub; }

function roomsLabel(r) {
  if (!r) return "";
  return String(r).split(",").map(x => x.trim()).map(x => /^\d$/.test(x) ? x + "к" : x).join("/");
}
function critSummary(c) {
  const p = [];
  if (c.rooms) p.push(roomsLabel(c.rooms));
  if (c.budget_max || c.budget_min) {
    const lo = c.budget_min ? Math.round(c.budget_min / 1000) + "" : "";
    const hi = c.budget_max ? Math.round(c.budget_max / 1000) + "к" : "∞";
    p.push((lo ? lo + "–" : "до ") + hi);
  }
  if (c.districts) p.push(c.districts);
  if (c.metro_stations) p.push("м." + c.metro_stations);
  return p.join(" · ") || "критерии не заданы";
}
function listingTitle(l) {
  if (l.jk_name) return "ЖК " + l.jk_name;
  if (l.address) return l.address;
  if (l.district) return l.district;
  return "Объект #" + l.id;
}
function listingMeta(l) {
  const p = [];
  if (l.rooms) p.push(roomsLabel(l.rooms));
  if (l.area) p.push(l.area + " м²");
  if (l.floor && l.total_floors) p.push(l.floor + "/" + l.total_floors + " эт");
  if (l.metro) p.push("м. " + l.metro);
  return p.join(" · ");
}

/* ── Bottom sheet ── */
function openSheet(html) {
  const s = $("#sheet"), b = $("#sheetBody");
  b.innerHTML = `<div class="sheet-grip"></div>` + html;
  s.classList.remove("hidden");
  return b;
}
function closeSheet() { $("#sheet").classList.add("hidden"); }
$("#sheet").addEventListener("click", (e) => { if (e.target.classList.contains("sheet-backdrop")) closeSheet(); });

/* ── Router ── */
let stack = [];
function go(fn, push = true) { if (push) stack.push(fn); fn(); updateBack(); }
function back() { if (stack.length > 1) { stack.pop(); stack[stack.length - 1](); updateBack(); } }
function updateBack() {
  if (!tg?.BackButton) return;
  if (stack.length > 1) { tg.BackButton.show(); } else { tg.BackButton.hide(); }
}
tg?.BackButton?.onClick(() => { haptic(); back(); });

let activeTab = "home";
function switchTab(tab) {
  activeTab = tab; stack = [];
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  haptic();
  if (tab === "home") go(renderHome);
  else if (tab === "clients") go(() => renderClients());
  else if (tab === "listings") go(() => renderListings());
  else if (tab === "search") go(renderSearch);
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));
view.addEventListener("scroll", () => $("#topbar").classList.toggle("scrolled", view.scrollTop > 6));

/* ════════════════════════ HOME ════════════════════════ */
async function renderHome() {
  setTitle("Главная", "помощник риелтора");
  loading();
  let s = {}; try { s = await api("/stats"); } catch (e) {}
  let morning = false; try { morning = (await api("/morning")).enabled; } catch (e) {}
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  wrap.innerHTML = `
    <div class="stats-grid">
      <div class="stat a"><div class="glow"></div><div class="num">${s.active ?? 0}</div><div class="lbl">Активные клиенты</div></div>
      <div class="stat g"><div class="glow"></div><div class="num">${s.sent_week ?? 0}</div><div class="lbl">Отправок за неделю</div></div>
      <div class="stat am"><div class="glow"></div><div class="num">${s.paused ?? 0}</div><div class="lbl">На паузе</div></div>
      <div class="stat p"><div class="glow"></div><div class="num">${s.done ?? 0}</div><div class="lbl">Нашли квартиру</div></div>
    </div>
    <div class="section-title">Быстрые действия</div>
    <div class="quick">
      <button class="quick-btn" id="qSearch"><span class="qi">⌕</span><span class="qt">Поиск вариантов</span><span class="qs">по всей базе</span></button>
      <button class="quick-btn" id="qClients"><span class="qi">☺</span><span class="qt">Клиенты</span><span class="qs">${s.active ?? 0} активных</span></button>
      <button class="quick-btn" id="qAdd"><span class="qi">＋</span><span class="qt">Новый клиент</span><span class="qs">добавить вручную</span></button>
      <button class="quick-btn" id="qCov"><span class="qi">▤</span><span class="qt">Охват по чатам</span><span class="qs">что собрано</span></button>
    </div>
    <div class="section-title">Утренняя рассылка</div>
    <div class="card row-between">
      <div><div style="font-weight:640">${morning ? "Включена" : "Выключена"}</div>
      <div class="muted">тёплое «доброе утро» клиентам</div></div>
      <button class="btn sm ${morning ? "btn-danger" : "btn-green"}" id="mToggle">${morning ? "Выключить" : "Включить"}</button>
    </div>`;
  view.appendChild(wrap);
  $("#qSearch").onclick = () => switchTab("search");
  $("#qClients").onclick = () => switchTab("clients");
  $("#qAdd").onclick = () => sheetAddClient();
  $("#qCov").onclick = () => sheetCoverage();
  $("#mToggle").onclick = async (e) => {
    haptic();
    const r = await api("/morning", { method: "POST", body: { enabled: !morning } });
    toast(r.enabled ? "Утренняя рассылка включена" : "Выключена", "ok"); renderHome();
  };
}

/* ════════════════════════ CLIENTS ════════════════════════ */
async function renderClients(status = "active") {
  setTitle("Клиенты");
  loading();
  let clients = []; try { clients = await api("/clients?status=" + status); } catch (e) {}
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  wrap.appendChild(el(`
    <div class="seg">
      <button data-s="active" class="${status === "active" ? "on" : ""}">Активные</button>
      <button data-s="paused" class="${status === "paused" ? "on" : ""}">Пауза</button>
      <button data-s="done" class="${status === "done" ? "on" : ""}">Архив</button>
    </div>`));
  if (!clients.length) {
    wrap.appendChild(el(`<div class="empty"><span class="em-ic">☺</span>Пока нет клиентов в этой группе</div>`));
  }
  for (const c of clients) {
    const row = el(`
      <div class="card tap">
        <div class="client-row">
          <div class="avatar" data-av="${c.id}">${esc(initials(c.name))}</div>
          <div class="client-main">
            <div class="client-name"><span class="dot ${c.status}"></span>${esc(c.name)}</div>
            <div class="client-crit">${esc(critSummary(c))}</div>
          </div>
          <div class="chev">›</div>
        </div>
      </div>`);
    row.onclick = () => { haptic(); go(() => renderClientDetail(c.id)); };
    wrap.appendChild(row);
    lazyAvatar(row.querySelector("[data-av]"), c);
  }
  view.appendChild(wrap);
  wrap.querySelectorAll(".seg button").forEach(b => b.onclick = () => { haptic(); stack[stack.length - 1] = () => renderClients(b.dataset.s); renderClients(b.dataset.s); });
  // FAB
  let fab = $("#fab"); if (fab) fab.remove();
  fab = el(`<button class="fab" id="fab">＋</button>`);
  fab.onclick = () => { haptic(); sheetAddClient(); };
  $("#app").appendChild(fab);
}

function lazyAvatar(node, c) {
  if (!c.telegram_id && !c.username) return;
  fetchImg(`/clients/${c.id}/avatar`).then(url => {
    const img = new Image();
    img.onload = () => { node.innerHTML = ""; node.appendChild(img); };
    img.src = url;
  }).catch(() => {});
}

function removeFab() { const f = $("#fab"); if (f) f.remove(); }

async function renderClientDetail(id) {
  removeFab();
  setTitle("Клиент");
  loading();
  let c; try { c = await api("/clients/" + id); } catch (e) { return toast("Не загрузить клиента", "err"); }
  view.innerHTML = "";
  const geo = c.geo_points || [];
  const wrap = el(`<div class="fade-in"></div>`);
  const contact = c.username ? "@" + c.username : (c.telegram_id ? "id " + c.telegram_id : "контакт не указан");
  wrap.innerHTML = `
    <div class="detail-hero">
      <div class="avatar" data-av="${c.id}">${esc(initials(c.name))}</div>
      <div><h2>${esc(c.name)}</h2><div class="sub">${esc(contact)} · ${STATUS_RU[c.status] || ""}</div></div>
    </div>
    <div class="chips" style="margin-bottom:18px">
      ${c.rooms ? `<span class="chip accent">🛏 ${esc(roomsLabel(c.rooms))}</span>` : ""}
      ${(c.budget_min || c.budget_max) ? `<span class="chip accent">💰 ${c.budget_min ? fmtMoney(c.budget_min) : "0"}–${c.budget_max ? fmtMoney(c.budget_max) : "∞"} ₽</span>` : ""}
      ${c.districts ? `<span class="chip">📍 ${esc(c.districts)}</span>` : ""}
      ${c.metro_stations ? `<span class="chip">🚇 ${esc(c.metro_stations)}</span>` : ""}
      ${(c.area_min || c.area_max) ? `<span class="chip">📐 ${c.area_min || 0}–${c.area_max || "∞"} м²</span>` : ""}
      ${c.has_pets ? `<span class="chip pet">🐾 с животными</span>` : ""}
    </div>
    ${c.notes ? `<div class="card"><div class="muted" style="margin-bottom:4px">Заметки</div>${esc(c.notes)}</div>` : ""}
    ${geo.length ? `<div class="section-title">Гео-точки</div>` + geo.map(g => `
      <div class="card"><div class="row-between"><div><b>${esc(g.label || "точка")}</b>
      <div class="muted">${esc(g.address || "")}</div></div>
      <div class="muted">${g.max_minutes ? "до " + g.max_minutes + " мин" : ""}${g.is_strict ? " · строго" : ""}</div></div></div>`).join("") : ""}
    <div class="btn-primary btn" id="bMatch" style="margin-top:18px">🔎 Подобрать варианты</div>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn btn-soft" id="bEdit">✏️ Критерии</button>
      <button class="btn btn-soft" id="bStatus">⚙️ Статус</button>
    </div>`;
  view.appendChild(wrap);
  lazyAvatar(wrap.querySelector("[data-av]"), c);
  $("#bMatch").onclick = () => { haptic(); go(() => renderMatch(c)); };
  $("#bEdit").onclick = () => sheetEditCriteria(c);
  $("#bStatus").onclick = () => sheetStatus(c);
}

async function renderMatch(client, page = 0, acc = null) {
  setTitle("Подбор", client.name);
  if (!acc) loading();
  let data; try { data = await api(`/clients/${client.id}/match?page=${page}`); } catch (e) { return toast("Ошибка подбора", "err"); }
  if (!acc) {
    view.innerHTML = "";
    acc = el(`<div class="fade-in"></div>`);
    acc.appendChild(el(`<div class="muted" style="margin:2px 4px 12px">Найдено ${data.total} вариантов под критерии</div>`));
    const listWrap = el(`<div id="matchList"></div>`);
    acc.appendChild(listWrap);
    view.appendChild(acc);
    if (!data.total) acc.querySelector("#matchList").appendChild(el(`<div class="empty"><span class="em-ic">⌂</span>Подходящих вариантов нет</div>`));
  }
  const list = acc.querySelector("#matchList");
  for (const l of data.listings) list.appendChild(listingCard(l, () => sendListing(l, client.id)));
  const oldMore = acc.querySelector(".more-btn"); if (oldMore) oldMore.remove();
  if (data.has_more) {
    const more = el(`<button class="btn btn-soft more-btn" style="margin-top:6px">Ещё ${Math.min(12, data.total - (page + 1) * 12)} вариантов</button>`);
    more.onclick = () => { haptic(); more.remove(); renderMatch(client, page + 1, acc); };
    acc.appendChild(more);
  }
}

/* ════════════════════════ LISTINGS ════════════════════════ */
async function renderListings(source = "all") {
  setTitle("Объекты", "последние объявления");
  removeFab();
  loading();
  let listings = []; try { listings = await api("/listings?limit=50&source=" + source); } catch (e) {}
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  wrap.appendChild(el(`
    <div class="seg">
      <button data-s="all" class="${source === "all" ? "on" : ""}">Все</button>
      <button data-s="exclusives" class="${source === "exclusives" ? "on" : ""}">Эксклюзивы</button>
      <button data-s="arendok" class="${source === "arendok" ? "on" : ""}">Arendok</button>
    </div>`));
  if (!listings.length) wrap.appendChild(el(`<div class="empty"><span class="em-ic">⌂</span>Здесь пока пусто</div>`));
  for (const l of listings) wrap.appendChild(listingCard(l, null, true));
  view.appendChild(wrap);
  wrap.querySelectorAll(".seg button").forEach(b => b.onclick = () => {
    haptic(); stack[stack.length - 1] = () => renderListings(b.dataset.s); renderListings(b.dataset.s);
  });
}

function listingCard(l, onSend, openable = true, thumb = true) {
  const card = el(`
    <div class="card pad0 ${openable ? "tap" : ""}">
      ${thumb ? `<div class="card-thumb" data-thumb="${l.id}"><span class="src-badge">${esc(l.source || "")}</span></div>` : ""}
      <div class="card-body">
        <div class="row-between" style="align-items:flex-start">
          <div style="min-width:0">
            <div class="listing-price">${fmtMoney(l.price)} ₽<span class="muted" style="font-size:13px;font-weight:500">/мес</span></div>
            <div class="listing-title">${esc(listingTitle(l))}</div>
            <div class="listing-meta">${esc(listingMeta(l))}</div>
          </div>
        </div>
        ${(l.geo && l.geo.length) ? `<div style="margin-top:8px">${l.geo.map(g => `<div class="geo-line">${esc(g)}</div>`).join("")}</div>` : ""}
        <div class="btn-row" style="margin-top:12px">
          ${onSend ? `<button class="btn btn-green sm" style="flex:1" data-send>📤 Отправить</button>` : ""}
          ${l.url ? `<button class="btn btn-soft sm" style="flex:1" data-open>👁 Пост</button>` : ""}
          <button class="btn btn-soft sm" style="flex:1" data-detail>Подробнее</button>
        </div>
      </div>
    </div>`);
  if (thumb && thumbObserver) thumbObserver.observe(card.querySelector(".card-thumb"));
  if (onSend) card.querySelector("[data-send]").onclick = (e) => { e.stopPropagation(); haptic(); onSend(); };
  const openBtn = card.querySelector("[data-open]");
  if (openBtn) openBtn.onclick = (e) => { e.stopPropagation(); haptic(); tg?.openTelegramLink ? tg.openTelegramLink(l.url) : window.open(l.url); };
  card.querySelector("[data-detail]").onclick = (e) => { e.stopPropagation(); haptic(); go(() => renderListingDetail(l.id)); };
  return card;
}

async function renderListingDetail(id) {
  removeFab(); setTitle("Объект");
  loading();
  let l; try { l = await api("/listings/" + id); } catch (e) { return toast("Не загрузить", "err"); }
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  wrap.innerHTML = `
    <img class="listing-thumb" data-photo style="display:none">
    <div class="listing-price" style="font-size:26px">${fmtMoney(l.price)} ₽ <span class="muted" style="font-size:14px;font-weight:500">/мес</span></div>
    <div class="listing-title" style="font-size:18px;margin:4px 0 14px">${esc(listingTitle(l))}</div>
    <div class="card">
      ${l.rooms ? kv("Комнат", roomsLabel(l.rooms)) : ""}
      ${l.area ? kv("Площадь", l.area + " м²") : ""}
      ${(l.floor && l.total_floors) ? kv("Этаж", l.floor + " / " + l.total_floors) : ""}
      ${l.metro ? kv("Метро", l.metro) : ""}
      ${l.district ? kv("Район", l.district) : ""}
      ${kv("Источник", l.source || "—")}
    </div>
    ${l.raw_text ? `<div class="section-title">Текст объявления</div><div class="card muted" style="white-space:pre-wrap;color:var(--txt)">${esc(l.raw_text)}</div>` : ""}
    <div class="btn btn-green" id="bSend" style="margin-top:18px">📤 Отправить клиенту</div>
    <div class="btn-row" style="margin-top:10px">
      ${l.url ? `<button class="btn btn-soft" id="bOpen">👁 Открыть пост</button>` : ""}
      <button class="btn btn-soft" id="bBroad">📣 Рассылка</button>
    </div>`;
  view.appendChild(wrap);
  // фото (через fetch+blob, чтобы обойти заглушку ngrok)
  const ph = wrap.querySelector("[data-photo]");
  fetchImg(`/listings/${id}/photo`).then(url => { ph.src = url; ph.style.display = "block"; }).catch(() => {});
  $("#bSend").onclick = () => { haptic(); sheetClientPicker((cid) => sendListing(l, cid)); };
  $("#bBroad").onclick = () => { haptic(); sheetBroadcast(l); };
  const ob = $("#bOpen"); if (ob) ob.onclick = () => { haptic(); tg?.openTelegramLink ? tg.openTelegramLink(l.url) : window.open(l.url); };
}
const kv = (k, v) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${esc(String(v))}</span></div>`;

/* ════════════════════════ SEARCH ════════════════════════ */
let searchState = { text: "", results: [], page: 0, hasMore: false, sel: new Set() };
async function renderSearch() {
  setTitle("Поиск вариантов", "по всей базе объявлений");
  removeFab();
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  wrap.innerHTML = `
    <div class="field">
      <textarea class="input" id="sInput" placeholder="Напишите или надиктуйте: «2к юго-запад до 150», «студия у метро Фили 60 метров»…">${esc(searchState.text)}</textarea>
    </div>
    <div class="btn-row">
      <span id="sVoice" style="flex:1;display:flex"></span>
      <button class="btn btn-primary" id="sGo" style="flex:1">⌕ Найти</button>
    </div>
    <div id="sResults" style="margin-top:18px"></div>`;
  view.appendChild(wrap);
  $("#sVoice").replaceWith(voiceButton((text) => {
    const ta = $("#sInput"); ta.value = ta.value ? (ta.value + " " + text) : text; runSearch();
  }, "🎤 Голосом"));
  $("#sGo").onclick = runSearch;
  if (searchState.results.length) paintSearch();
}
async function runSearch() {
  const text = $("#sInput").value.trim();
  if (!text) return toast("Напишите критерии");
  haptic(); searchState = { text, results: [], page: 0, hasMore: false, sel: new Set() };
  $("#sResults").innerHTML = `<div class="loader"><div class="spin"></div></div>`;
  let data; try { data = await api("/search", { method: "POST", body: { text, page: 0 } }); }
  catch (e) { return toast("Ошибка поиска", "err"); }
  searchState.results = data.listings; searchState.hasMore = data.has_more; searchState.crit = data.criteria; searchState.total = data.total;
  paintSearch();
}
function paintSearch() {
  const box = $("#sResults"); box.innerHTML = "";
  box.appendChild(el(`<div class="muted" style="margin:0 4px 12px">${esc(searchState.crit || "")} — найдено ${searchState.total}</div>`));
  if (!searchState.results.length) { box.appendChild(el(`<div class="empty"><span class="em-ic">⌕</span>Ничего не нашлось</div>`)); return; }
  // мультивыбор
  const selBar = el(`<button class="btn btn-soft sm" style="margin-bottom:12px">☑️ Выбрать несколько → одному клиенту</button>`);
  let selectMode = false;
  selBar.onclick = () => { selectMode = !selectMode; haptic(); renderRows(); selBar.textContent = selectMode ? "✕ Отменить выбор" : "☑️ Выбрать несколько → одному клиенту"; };
  box.appendChild(selBar);
  const rows = el(`<div></div>`); box.appendChild(rows);

  function renderRows() {
    rows.innerHTML = "";
    for (const l of searchState.results) {
      if (selectMode) {
        const on = searchState.sel.has(l.id);
        const row = el(`<div class="card tap"><div class="client-row">
          <div class="check ${on ? "on" : ""}">${on ? "✓" : ""}</div>
          <div class="client-main"><div class="client-name" style="font-size:15px">${fmtMoney(l.price)} ₽ · ${esc(roomsLabel(l.rooms))}</div>
          <div class="client-crit">${esc(listingTitle(l))}</div></div></div></div>`);
        row.onclick = () => { haptic(); on ? searchState.sel.delete(l.id) : searchState.sel.add(l.id); renderRows(); };
        rows.appendChild(row);
      } else {
        rows.appendChild(listingCard(l, () => sheetClientPicker((cid) => sendListing(l, cid))));
      }
    }
    let sendSel = rows.querySelector(".send-sel");
    if (selectMode && searchState.sel.size) {
      const b = el(`<button class="btn btn-green send-sel" style="margin-top:6px">📨 Отправить отмеченные (${searchState.sel.size}) одному</button>`);
      b.onclick = () => { haptic(); sheetClientPicker((cid) => sendMany([...searchState.sel], cid)); };
      rows.appendChild(b);
    }
  }
  renderRows();
  if (searchState.hasMore) {
    const more = el(`<button class="btn btn-soft" style="margin-top:6px">Ещё варианты</button>`);
    more.onclick = async () => {
      haptic(); const p = searchState.page + 1;
      const d = await api("/search", { method: "POST", body: { text: searchState.text, page: p } });
      searchState.page = p; searchState.results.push(...d.listings); searchState.hasMore = d.has_more; paintSearch();
    };
    box.appendChild(more);
  }
}

/* ════════════════════════ Отправка ════════════════════════ */
async function sendListing(l, clientId) {
  toast("Отправляю…");
  try {
    const r = await api("/send", { method: "POST", body: { client_id: clientId, listing_id: l.id } });
    if (r.sent) { notify("success"); toast("Отправлено клиенту ✓", "ok"); }
    else { notify("error"); toast("Не удалось отправить", "err"); }
  } catch (e) { toast("Ошибка: " + e.message, "err"); }
}
async function sendMany(ids, clientId) {
  closeSheet(); toast(`Отправляю ${ids.length} вариантов…`);
  try {
    const r = await api("/send", { method: "POST", body: { client_id: clientId, listing_ids: ids } });
    notify("success"); toast(`Отправлено: ${r.sent}${r.failed ? ", ошибок " + r.failed : ""}`, "ok");
    searchState.sel.clear();
  } catch (e) { toast("Ошибка: " + e.message, "err"); }
}

/* ════════════════════════ Sheets ════════════════════════ */
async function sheetClientPicker(onPick, status = "active") {
  const b = openSheet(`<div class="sheet-title">Кому отправить?</div>
    <div class="seg"><button data-s="active" class="${status === "active" ? "on" : ""}">Активные</button>
    <button data-s="paused" class="${status === "paused" ? "on" : ""}">Пауза</button>
    <button data-s="done" class="${status === "done" ? "on" : ""}">Архив</button></div>
    <div id="pkList"><div class="loader"><div class="spin"></div></div></div>`);
  b.querySelectorAll(".seg button").forEach(x => x.onclick = () => { haptic(); sheetClientPicker(onPick, x.dataset.s); });
  let clients = []; try { clients = await api("/clients?status=" + status); } catch (e) {}
  const list = b.querySelector("#pkList"); list.innerHTML = "";
  if (!clients.length) list.innerHTML = `<div class="empty">Нет клиентов</div>`;
  for (const c of clients) {
    const row = el(`<div class="card tap"><div class="client-row">
      <div class="avatar" data-av="${c.id}">${esc(initials(c.name))}</div>
      <div class="client-main"><div class="client-name">${esc(c.name)}</div>
      <div class="client-crit">${esc(critSummary(c))}</div></div></div></div>`);
    row.onclick = () => { haptic(); closeSheet(); onPick(c.id); };
    list.appendChild(row); lazyAvatar(row.querySelector("[data-av]"), c);
  }
}

function sheetAddClient() {
  const b = openSheet(`<div class="sheet-title">Новый клиент</div>
    <div class="field"><label>Имя</label><input class="input" id="nName" placeholder="Например, Вероника"></div>
    <div class="field"><label>Telegram (@username или id) — чтобы писать ему</label><input class="input" id="nUser" placeholder="@username"></div>
    <div class="field"><label>Критерии — текстом или голосом (необязательно)</label>
    <textarea class="input" id="nCrit" placeholder="2к юго-запад до 150, с животными"></textarea>
    <div class="btn-row" style="margin-top:8px"><span id="nVoice" style="flex:1;display:flex"></span></div></div>
    <button class="btn btn-primary" id="nSave">Создать клиента</button>`);
  b.querySelector("#nVoice").replaceWith(voiceButton((text) => {
    const ta = b.querySelector("#nCrit"); ta.value = ta.value ? (ta.value + " " + text) : text;
  }, "🎤 Надиктовать критерии"));
  b.querySelector("#nSave").onclick = async () => {
    const name = b.querySelector("#nName").value.trim();
    if (!name) return toast("Введите имя");
    haptic();
    const body = { name };
    const u = b.querySelector("#nUser").value.trim();
    if (u) { if (/^-?\d+$/.test(u.replace("@", ""))) body.telegram_id = parseInt(u.replace("@", "")); else body.telegram_username = u; }
    try {
      const r = await api("/clients", { method: "POST", body });
      const crit = b.querySelector("#nCrit").value.trim();
      if (crit) await api(`/clients/${r.id}/criteria`, { method: "POST", body: { text: crit } });
      closeSheet(); notify("success"); toast("Клиент создан ✓", "ok");
      switchTab("clients");
    } catch (e) { toast("Ошибка: " + e.message, "err"); }
  };
}

const ROOM_OPTS = [["студия", "Студия"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5+"]];
const ZONE_CHIPS = [["центр", "Центр"], ["север", "Север"], ["юг", "Юг"], ["запад", "Запад"],
  ["восток", "Восток"], ["северо-запад", "С-З"], ["северо-восток", "С-В"],
  ["юго-запад", "Ю-З"], ["юго-восток", "Ю-В"]];

async function applyCritText(cid, text) {
  await api(`/clients/${cid}/criteria`, { method: "POST", body: { text } });
}

function sheetEditCriteria(c) {
  const curRooms = new Set(String(c.rooms || "").split(",").map(s => s.trim()).filter(Boolean));
  const b = openSheet(`
    <div class="sheet-title">Критерии · ${esc(c.name)}</div>
    <div class="btn-row" style="margin-bottom:6px">
      <span id="vSlot" style="flex:1;display:flex"></span>
      <button class="btn btn-soft sm" id="eTextToggle" style="flex:1">✍️ Текстом</button>
    </div>
    <div id="eTextBox" style="display:none;margin:8px 0 4px">
      <textarea class="input" id="eCrit" placeholder="2к юго-запад до 150, с животными"></textarea>
      <button class="btn btn-primary sm" id="eParse" style="margin-top:8px">Применить текст</button>
    </div>

    <div class="ed-label">Комнаты</div>
    <div class="chipsel" id="edRooms">
      ${ROOM_OPTS.map(([v, t]) => `<button class="chsel ${curRooms.has(v) ? "on" : ""}" data-v="${v}">${t}</button>`).join("")}
    </div>

    <div class="ed-label">Бюджет, ₽/мес</div>
    <div class="two">
      <input class="input" id="edBmin" inputmode="numeric" placeholder="от" value="${c.budget_min || ""}">
      <input class="input" id="edBmax" inputmode="numeric" placeholder="до" value="${c.budget_max || ""}">
    </div>

    <div class="ed-label">Площадь, м²</div>
    <div class="two">
      <input class="input" id="edAmin" inputmode="numeric" placeholder="от" value="${c.area_min || ""}">
      <input class="input" id="edAmax" inputmode="numeric" placeholder="до" value="${c.area_max || ""}">
    </div>

    <div class="ed-label">Район / зона / метро</div>
    <input class="input" id="edLoc" placeholder="напр. юго-запад, Хамовники, Фили"
      value="${esc([c.districts, c.metro_stations].filter(Boolean).join(", "))}">
    <div class="chipsel" id="edZones" style="margin-top:8px">
      ${ZONE_CHIPS.map(([v, t]) => `<button class="chsel sm2" data-z="${v}">${t}</button>`).join("")}
    </div>

    <div class="ed-label">Питомцы</div>
    <div class="chipsel"><button class="chsel ${c.has_pets ? "on" : ""}" id="edPets">🐾 С животными</button></div>

    <button class="btn btn-primary" id="edSave" style="margin-top:20px">Сохранить критерии</button>
  `);

  const reopen = () => { closeSheet(); go(() => renderClientDetail(c.id), false); };
  b.querySelector("#vSlot").replaceWith(voiceButton(async (text) => {
    await applyCritText(c.id, text); notify("success"); toast("Применил голос ✓", "ok"); reopen();
  }, "🎤 Надиктовать"));
  b.querySelector("#eTextToggle").onclick = () => {
    const box = b.querySelector("#eTextBox"); box.style.display = box.style.display === "none" ? "block" : "none";
  };
  b.querySelector("#eParse").onclick = async () => {
    const t = b.querySelector("#eCrit").value.trim(); if (!t) return toast("Впиши текст");
    haptic(); await applyCritText(c.id, t); toast("Применил ✓", "ok"); reopen();
  };
  b.querySelectorAll("#edRooms .chsel").forEach(x => x.onclick = () => { haptic(); x.classList.toggle("on"); });
  b.querySelectorAll("#edZones .chsel").forEach(x => x.onclick = () => {
    haptic(); const loc = b.querySelector("#edLoc");
    const parts = loc.value.split(",").map(s => s.trim()).filter(Boolean);
    if (!parts.map(p => p.toLowerCase()).includes(x.dataset.z)) { parts.push(x.dataset.z); loc.value = parts.join(", "); }
  });
  b.querySelector("#edPets").onclick = (e) => { haptic(); e.currentTarget.classList.toggle("on"); };
  b.querySelector("#edSave").onclick = async () => {
    haptic();
    const rooms = [...b.querySelectorAll("#edRooms .chsel.on")].map(x => x.dataset.v);
    const num = (id) => { const v = parseInt((b.querySelector(id).value || "").replace(/\D/g, "")); return isNaN(v) ? null : v; };
    const body = {
      rooms: rooms.length ? rooms.join(",") : null,
      budget_min: num("#edBmin"), budget_max: num("#edBmax"),
      area_min: num("#edAmin"), area_max: num("#edAmax"),
      has_pets: b.querySelector("#edPets").classList.contains("on"),
      location_text: b.querySelector("#edLoc").value.trim(),
    };
    try {
      await api(`/clients/${c.id}/criteria_structured`, { method: "POST", body });
      notify("success"); toast("Критерии сохранены ✓", "ok"); reopen();
    } catch (e) { toast("Ошибка: " + e.message, "err"); }
  };
}

function sheetStatus(c) {
  const opt = (s, label, cls) => `<button class="btn ${cls}" data-st="${s}" ${c.status === s ? "disabled style=opacity:.4" : ""}>${label}</button>`;
  const b = openSheet(`<div class="sheet-title">Статус клиента</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${opt("active", "📌 Активный (в подборе)", "btn-soft")}
      ${opt("paused", "💤 На паузе", "btn-soft")}
      ${opt("done", "🎉 Нашёл квартиру (архив)", "btn-soft")}
    </div>`);
  b.querySelectorAll("[data-st]").forEach(x => x.onclick = async () => {
    haptic();
    try { await api(`/clients/${c.id}/status`, { method: "POST", body: { status: x.dataset.st } });
      closeSheet(); toast("Статус обновлён ✓", "ok"); go(() => renderClientDetail(c.id), false);
    } catch (e) { toast("Ошибка", "err"); }
  });
}

function sheetBroadcast(l) {
  const b = openSheet(`<div class="sheet-title">Рассылка варианта</div>
    <div class="card" style="margin-bottom:14px"><b>${fmtMoney(l.price)} ₽</b> · ${esc(listingTitle(l))}</div>
    <div class="muted" style="margin-bottom:12px">⚠️ Уйдёт РЕАЛЬНЫМ клиентам выбранной группы. Подтвердите.</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn btn-soft" data-g="active">📌 Активным</button>
      <button class="btn btn-soft" data-g="paused">💤 На паузе</button>
      <button class="btn btn-danger" data-g="all">👥 Всем</button>
    </div>`);
  b.querySelectorAll("[data-g]").forEach(x => x.onclick = () => {
    haptic();
    const g = x.dataset.g, names = { active: "активным", paused: "на паузе", all: "ВСЕМ" };
    if (!confirm(`Точно отправить ${names[g]} клиентам?`)) return;
    api("/broadcast", { method: "POST", body: { listing_id: l.id, group: g } })
      .then(r => { closeSheet(); notify("success"); toast(`Рассылка запущена (${r.queued} клиентов)`, "ok"); })
      .catch(e => toast("Ошибка: " + e.message, "err"));
  });
}

async function sheetCoverage() {
  const b = openSheet(`<div class="sheet-title">Охват по чатам</div><div id="covB"><div class="loader"><div class="spin"></div></div></div>`);
  let cov = []; try { cov = await api("/coverage"); } catch (e) {}
  const box = b.querySelector("#covB"); box.innerHTML = "";
  if (!cov.length) { box.innerHTML = `<div class="empty">Пока ничего не собрано</div>`; return; }
  for (const r of cov) {
    const fmt = (s) => s ? new Date(s).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "—";
    box.appendChild(el(`<div class="card"><div class="row-between"><b>${esc(r.source)}</b><span class="chip accent">${r.count}</span></div>
      <div class="muted" style="margin-top:6px">с ${fmt(r.first)} по ${fmt(r.last)}</div></div>`));
  }
}

/* ── start ── */
switchTab("home");
