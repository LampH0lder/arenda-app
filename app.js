/* ──────────────────────────────────────────────────────────────────────────
   Риелти — Telegram Mini App. Тёмный минимализм. Vanilla JS, без сборки.
   ────────────────────────────────────────────────────────────────────────── */
const tg = window.Telegram?.WebApp;
const INIT = tg?.initData || "";
const AUTHQ = encodeURIComponent(INIT);

// ── Тема (тёмная/светлая). Приоритет: ручной выбор > тема Telegram > тёмная (дефолт) ──
const THEME_KEY = "arendbot_theme";  // 'auto' | 'dark' | 'light'
function getThemePref() { try { return localStorage.getItem(THEME_KEY) || "auto"; } catch (e) { return "auto"; } }
function tgScheme() { try { return tg && tg.colorScheme === "light" ? "light" : "dark"; } catch (e) { return "dark"; } }
function effectiveTheme() { const p = getThemePref(); return p === "auto" ? tgScheme() : p; }
function applyTheme() {
  const t = effectiveTheme();
  document.documentElement.setAttribute("data-theme", t);
  const hdr = t === "light" ? "#f4f5f7" : "#0d0f12";
  try { tg?.setHeaderColor?.(hdr); tg?.setBackgroundColor?.(hdr); } catch (e) {}
}
function setThemePref(p) { try { localStorage.setItem(THEME_KEY, p); } catch (e) {} applyTheme(); }
applyTheme();

if (tg) {
  tg.ready(); tg.expand();
  try { tg.enableClosingConfirmation(); } catch (e) {}
  // если пользователь не зафиксировал тему вручную (auto) — следуем за темой Telegram
  try { tg.onEvent("themeChanged", () => { if (getThemePref() === "auto") applyTheme(); }); } catch (e) {}
  // реальная стабильная высота вьюпорта Telegram → CSS-переменная, чтобы нижние панели
  // не уезжали под системный UI/клавиатуру (fallback 100vh для обычного браузера).
  const syncVH = () => {
    try { const h = tg.viewportStableHeight; if (h) document.documentElement.style.setProperty("--tg-vh", h + "px"); } catch (e) {}
  };
  syncVH();
  try { tg.onEvent("viewportChanged", syncVH); } catch (e) {}
}
const haptic = (t = "light") => { try { tg?.HapticFeedback?.impactOccurred(t); } catch (e) {} };
const notify = (t = "success") => { try { tg?.HapticFeedback?.notificationOccurred(t); } catch (e) {} };
// Открыть ссылку объявления: t.me -> openTelegramLink, внешние (Циан/Авито) -> openLink, иначе новое окно.
function openPost(url) {
  if (!url) return;
  try {
    const isTg = /^tg:|\/\/(?:t|telegram)\.me\//i.test(url);
    if (isTg && tg?.openTelegramLink) return tg.openTelegramLink(url);
    if (tg?.openLink) return tg.openLink(url);
  } catch (e) {}
  window.open(url, "_blank", "noopener");
}

// показываемая версия (фиксированная семантическая); кэш-бастер ?v=N — отдельно и невидим
const APP_VERSION = "v1.5.1";

/* ── API ──
   Фронт может быть на другом домене (GitHub Pages, чистый HTTPS без заглушки),
   а данные брать с ngrok. На github.io берём API с ngrok; иначе — со своего origin.
   Заголовок ngrok-skip-browser-warning снимает заглушку для fetch/картинок. */
const NGROK_BASE = "https://postage-bucket-anything.ngrok-free.dev";
const API_BASE = location.hostname.endsWith("github.io") ? NGROK_BASE : "";
const BASE_HEADERS = { "X-Init-Data": INIT, "ngrok-skip-browser-warning": "true" };

// ── Lucide-иконки (контурные, красятся в currentColor; size = 1em по контексту) ──
const _ICONS = {"mic": "<path d=\"M12 19v3\"/><path d=\"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z\"/><path d=\"M19 10v2a7 7 0 0 1-14 0v-2\"/>", "loader": "<path d=\"M21 12a9 9 0 1 1-6.219-8.56\"/>", "square": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/>", "percent": "<path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\"/><path d=\"m15 9-6 6\"/><path d=\"M9 9h.01\"/><path d=\"M15 15h.01\"/>", "megaphone": "<path d=\"m3 11 18-5v12L3 14v-3z\"/><path d=\"M11.6 16.8a3 3 0 1 1-5.8-1.6\"/>", "bed": "<path d=\"M2 4v16\"/><path d=\"M2 8h18a2 2 0 0 1 2 2v10\"/><path d=\"M2 17h20\"/><path d=\"M6 8v9\"/>", "wallet": "<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>", "map-pin": "<path d=\"M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"3\"/>", "train": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"16\" rx=\"2\"/><path d=\"M4 11h16\"/><path d=\"M12 3v8\"/><path d=\"m8 19-2 3\"/><path d=\"m18 22-2-3\"/><circle cx=\"8\" cy=\"15\" r=\"1\"/><circle cx=\"16\" cy=\"15\" r=\"1\"/>", "ruler": "<path d=\"M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z\"/><path d=\"m14.5 12.5 2-2\"/><path d=\"m11.5 9.5 2-2\"/><path d=\"m8.5 6.5 2-2\"/><path d=\"m17.5 15.5 2-2\"/>", "paw": "<circle cx=\"11\" cy=\"4\" r=\"2\"/><circle cx=\"18\" cy=\"8\" r=\"2\"/><circle cx=\"20\" cy=\"16\" r=\"2\"/><path d=\"M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z\"/>", "compass": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><polygon points=\"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76\"/>", "plus": "<path d=\"M5 12h14\"/><path d=\"M12 5v14\"/>", "search": "<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/>", "pencil": "<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z\"/>", "sliders": "<line x1=\"21\" y1=\"4\" x2=\"14\" y2=\"4\"/><line x1=\"10\" y1=\"4\" x2=\"3\" y2=\"4\"/><line x1=\"21\" y1=\"12\" x2=\"12\" y2=\"12\"/><line x1=\"8\" y1=\"12\" x2=\"3\" y2=\"12\"/><line x1=\"21\" y1=\"20\" x2=\"16\" y2=\"20\"/><line x1=\"12\" y1=\"20\" x2=\"3\" y2=\"20\"/><line x1=\"14\" y1=\"2\" x2=\"14\" y2=\"6\"/><line x1=\"8\" y1=\"10\" x2=\"8\" y2=\"14\"/><line x1=\"16\" y1=\"18\" x2=\"16\" y2=\"22\"/>", "settings": "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>", "footprints": "<path d=\"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z\"/><path d=\"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z\"/><path d=\"M16 17h4\"/><path d=\"M4 13h4\"/>", "car": "<path d=\"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2\"/><circle cx=\"7\" cy=\"17\" r=\"2\"/><path d=\"M9 17h6\"/><circle cx=\"17\" cy=\"17\" r=\"2\"/>", "send": "<path d=\"m22 2-7 20-4-9-9-4Z\"/><path d=\"M22 2 11 13\"/>", "send-h": "<path d=\"M3.7 3a.5.5 0 0 0-.68.62l2.84 7.62a2 2 0 0 1 0 1.4L3.02 20.3a.5.5 0 0 0 .68.62l18-8.5a.5.5 0 0 0 0-.9z\"/><path d=\"M6 12h16\"/>", "ext-link": "<path d=\"M15 3h6v6\"/><path d=\"M10 14 21 3\"/><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"/>", "crown": "<path d=\"M11.6 3.3a.5.5 0 0 1 .9 0l2.9 5.6a1 1 0 0 0 1.5.3l4.3-3.7a.5.5 0 0 1 .8.5l-2.8 10.3a1 1 0 0 1-1 .7H5.8a1 1 0 0 1-1-.7L2 6a.5.5 0 0 1 .8-.5l4.3 3.7a1 1 0 0 0 1.5-.3z\"/><path d=\"M5 21h14\"/>", "login": "<path d=\"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4\"/><polyline points=\"10 17 15 12 10 7\"/><line x1=\"15\" y1=\"12\" x2=\"3\" y2=\"12\"/>", "star": "<polygon points=\"12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2\"/>", "check": "<path d=\"M20 6 9 17l-5-5\"/>", "inbox": "<polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\"/><path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/>", "map": "<path d=\"M14.1 5.5a2 2 0 0 0 1.8 0l3.6-1.8A1 1 0 0 1 21 4.6v12.8a1 1 0 0 1-.55.9l-4.55 2.3a2 2 0 0 1-1.8 0l-4.2-2.1a2 2 0 0 0-1.8 0l-3.6 1.8A1 1 0 0 1 3 19.4V6.6a1 1 0 0 1 .55-.9l4.55-2.3a2 2 0 0 1 1.8 0z\"/><path d=\"M15 5.8v15\"/><path d=\"M9 3.2v15\"/>", "refresh": "<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/><path d=\"M3 21v-5h5\"/>", "smartphone": "<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\"/><path d=\"M12 18h.01\"/>", "building2": "<path d=\"M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z\"/><path d=\"M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2\"/><path d=\"M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2\"/><path d=\"M10 6h4\"/><path d=\"M10 10h4\"/><path d=\"M10 14h4\"/>", "building": "<rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\"/><path d=\"M9 22v-4h6v4\"/><path d=\"M8 6h.01\"/><path d=\"M16 6h.01\"/><path d=\"M12 6h.01\"/><path d=\"M12 10h.01\"/><path d=\"M8 10h.01\"/><path d=\"M16 10h.01\"/>", "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>", "pin": "<path d=\"M12 17v5\"/><path d=\"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1Z\"/>", "moon": "<path d=\"M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z\"/>", "party": "<path d=\"M5.8 11.3 2 22l10.7-3.79\"/><path d=\"M4 3h.01\"/><path d=\"M22 8h.01\"/><path d=\"M15 2h.01\"/><path d=\"m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10\"/><path d=\"m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11-.11.7-.72 1.22-1.43 1.22H17\"/><path d=\"M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z\"/>", "alert": "<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>", "ban": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m4.9 4.9 14.2 14.2\"/>", "lock": "<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>", "image": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21\"/>", "layers": "<path d=\"M12.8 2.2a2 2 0 0 0-1.6 0L2.6 6.1a1 1 0 0 0 0 1.8l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9a1 1 0 0 0 0-1.8Z\"/><path d=\"M2 12a1 1 0 0 0 .6.9l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9A1 1 0 0 0 22 12\"/><path d=\"M2 17a1 1 0 0 0 .6.9l8.6 3.9a2 2 0 0 0 1.6 0l8.6-3.9A1 1 0 0 0 22 17\"/>", "shower": "<path d=\"m4 4 2.5 2.5\"/><path d=\"M13.5 6.5a4.95 4.95 0 0 0-7 7\"/><path d=\"M15 5 5 15\"/><path d=\"M14 17v.01\"/><path d=\"M10 16v.01\"/><path d=\"M13 13v.01\"/><path d=\"M16 10v.01\"/><path d=\"M11 20v.01\"/><path d=\"M17 14v.01\"/>", "briefcase": "<path d=\"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16\"/><rect width=\"20\" height=\"14\" x=\"2\" y=\"6\" rx=\"2\"/>", "phone": "<path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4 12.8 12.8 0 0 0 2.8.7A2 2 0 0 1 22 16.9z\"/>", "folder": "<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"/>", "type": "<polyline points=\"4 7 4 4 20 4 20 7\"/><line x1=\"9\" y1=\"20\" x2=\"15\" y2=\"20\"/><line x1=\"12\" y1=\"4\" x2=\"12\" y2=\"20\"/>", "help": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3\"/><path d=\"M12 17h.01\"/>", "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>", "chart": "<path d=\"M3 3v18h18\"/><path d=\"M18 17V9\"/><path d=\"M13 17V5\"/><path d=\"M8 17v-3\"/>", "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2\"/><path d=\"M12 20v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"m17.66 17.66 1.41 1.41\"/><path d=\"M2 12h2\"/><path d=\"M20 12h2\"/><path d=\"m6.34 17.66-1.41 1.41\"/><path d=\"m19.07 4.93-1.41 1.41\"/>", "contrast": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 18a6 6 0 0 0 0-12v12z\"/>"};
_ICONS['eraser']='<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>';_ICONS['download']='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>';
_ICONS['x']='<path d="M18 6 6 18"/><path d="m6 6 12 12"/>';
_ICONS['bell']='<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.41 5.956-2.738 7.326"/>';
_ICONS['trash']='<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>';
_ICONS['heart']='<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>';
_ICONS['comment']='<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>';
_ICONS['sort']='<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>';
function icon(n){return '<svg class="lic" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.16em;flex:none" aria-hidden="true">'+(_ICONS[n]||'')+'</svg>';}


async function api(path, opts = {}) {
  const headers = { ...BASE_HEADERS };
  if (opts.body) headers["Content-Type"] = "application/json";
  const method = opts.method || "GET";
  // GET (загрузки) безопасно повторять при обрыве туннеля; мутирующие POST — нет
  // (повтор мог бы продублировать публикацию/обработку), им только понятная ошибка.
  const isGet = method === "GET";
  const maxTries = isGet ? 3 : 1;
  let lastErr;
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      const r = await fetch(API_BASE + "/api" + path, {
        method, headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      });
      // 502/503/504 — типичные ошибки лежащего туннеля; для GET повторяем с backoff
      if (isGet && attempt < maxTries && [502, 503, 504].includes(r.status)) {
        await sleep(700 * attempt); continue;
      }
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
      return r.json();
    } catch (e) {
      lastErr = e;
      const isNet = (e instanceof TypeError);  // «Failed to fetch» = сетевой обрыв
      if (isGet && isNet && attempt < maxTries) { await sleep(700 * attempt); continue; }
      if (isNet) throw new Error("сеть/туннель недоступны — попробуй ещё раз");
      throw e;
    }
  }
  throw lastErr;
}

// Картинку нельзя грузить простым <img src> (cross-origin не добавит заголовок и
// упрётся в заглушку ngrok). Тянем через fetch с заголовком и отдаём blob-URL.
// Кэшируем в Cache Storage по URL → при повторном открытии/прокрутке мгновенно,
// без повторной качки через медленный туннель (главный буст превью).
const IMG_CACHE = "img-v4";  // bump -> сброс кэша превью (800px от оригинала)
async function fetchImg(path) {
  const url = API_BASE + "/api" + path;
  let cache = null;
  try { cache = await caches.open(IMG_CACHE); } catch (e) {}
  if (cache) {
    try {
      const hit = await cache.match(url);
      if (hit) return URL.createObjectURL(await hit.blob());
    } catch (e) {}
  }
  const r = await fetch(url, { headers: BASE_HEADERS });
  if (!r.ok) throw new Error("img " + r.status);
  const blob = await r.blob();
  if (cache) {
    try { await cache.put(url, new Response(blob, { headers: { "Content-Type": blob.type } })); } catch (e) {}
  }
  return URL.createObjectURL(blob);
}

/* ── Голосовой ввод: запись через микрофон -> Whisper на бэке -> текст ── */
function voiceButton(onText, label = icon('mic')+" Голосом") {
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
      btn.innerHTML = icon('loader')+" Распознаю…"; btn.disabled = true; btn.classList.remove("rec");
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      try {
        const r = await fetch(API_BASE + "/api/transcribe", {
          method: "POST", headers: { ...BASE_HEADERS, "Content-Type": blob.type }, body: blob,
        });
        const j = await r.json();
        if (j.text && j.text.trim()) { onText(j.text.trim()); notify("success"); toast("Распознал ✓", "ok"); }
        else toast("Не расслышал, попробуй ещё", "err");
      } catch (e) { toast("Ошибка распознавания", "err"); }
      btn.innerHTML = label; btn.disabled = false;
    };
    rec.start(); haptic("medium");
    btn.innerHTML = icon('square')+" Стоп — записываю…"; btn.classList.add("rec");
  };
  return btn;
}

/* ── Ленивая подгрузка миниатюр (первое фото объекта) ──
   В сетке грузим ОДНО мелкое превью (быстро, кэшируется). Крупное-резкое — только
   в детальном просмотре. Так на сетку 1 запрос на карточку, а не два. */
const thumbObserver = ("IntersectionObserver" in window) ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const node = e.target; thumbObserver.unobserve(node);
    const cov = node.dataset.cov || 0;  // версия обложки — кэш-бастер (при смене обложки URL меняется)
    fetchImg(`/listings/${node.dataset.thumb}/photo?c=${cov}`)
      .then(url => { node.style.backgroundImage = `url(${url})`; node.classList.add("loaded"); })
      .catch(() => node.classList.add("nophoto"));
  }
}, { rootMargin: "300px" }) : null;

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
  clearTimeout(t._t); clearTimeout(t._t2);
  t.textContent = msg; t.className = "toast " + kind;  // снимает hidden/out, перезапускает вход
  // через 2.6с — плавный уход (opacity+сдвиг), потом прячем
  t._t = setTimeout(() => {
    t.classList.add("out");
    t._t2 = setTimeout(() => t.classList.add("hidden"), 200);
  }, 2600);
}
// Нативное подтверждение Telegram (аккуратный диалог) вместо браузерного confirm(),
// который в WebView выглядит криво (с заголовком домена). Фолбэк — обычный confirm().
function confirmA(msg) {
  return new Promise(res => {
    if (tg && tg.showConfirm) { try { tg.showConfirm(msg, ok => res(!!ok)); return; } catch (e) {} }
    res(confirm(msg));
  });
}
function loading() {
  // скелет-карточки вместо спиннера — ощущение скорости (форма повторяет карточку объекта)
  const card = `<div class="sk-card"><div class="sk-photo"></div>`
    + `<div class="sk-line w60"></div><div class="sk-line w40"></div>`
    + `<div class="sk-row"><span class="sk-btn"></span><span class="sk-btn"></span></div></div>`;
  view.innerHTML = `<div class="sk-list">${card.repeat(4)}</div>`;
}
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
function commissionLabel(l) {
  if (l.commission == null) return null;
  return l.commission === 0 ? icon('percent')+" без комиссии" : icon('percent')+" комиссия " + l.commission + "%";
}
function listingTitle(l) {
  const anons = l.is_announcement ? `<span class="anons-badge">${icon('megaphone')} Анонс</span> ` : "";
  if (l.jk_name) return anons + "ЖК " + esc(l.jk_name);
  if (l.address) return anons + esc(l.address);
  if (l.district) return anons + esc(l.district);
  return anons + "Объект #" + l.id;
}
function listingMeta(l) {
  const p = [];
  if (l.rooms) p.push(roomsLabel(l.rooms));
  if (l.area) p.push(l.area + " м²");
  if (l.floor && l.total_floors) p.push(l.floor + "/" + l.total_floors + " эт");
  if (l.metro) p.push("м. " + esc(l.metro));
  const cm = commissionLabel(l);
  if (cm) p.push(cm);
  return p.join(" · ");
}

/* ── Bottom sheet ── */
function openSheet(html) {
  const s = $("#sheet"), b = $("#sheetBody");
  b.innerHTML = `<div class="sheet-grip"></div>` + html;
  s.classList.remove("hidden", "closing");  // closing мог остаться, если открыли во время ухода
  return b;
}
function closeSheet() {
  const s = $("#sheet");
  if (s.classList.contains("hidden")) return;
  const body = $("#sheetBody");
  s.classList.add("closing");  // CSS: sheet-body уезжает вниз, backdrop гаснет
  let done = false;
  const finish = () => {
    if (done) return; done = true;
    s.classList.add("hidden"); s.classList.remove("closing");
  };
  body.addEventListener("transitionend", finish, { once: true });
  setTimeout(finish, 280);  // фолбэк, если transitionend не придёт (reduced-motion и т.п.)
}
// Универсальная шторка одиночного выбора: opts = [[value,label],...]
function sheetPick(title, opts, current, onPick) {
  const rows = opts.map(([v, label]) =>
    `<button class="pick-row ${String(v) === String(current) ? "on" : ""}" data-v="${esc(String(v))}">
       <span>${esc(label)}</span>${String(v) === String(current) ? `<span class="pick-ok">${icon('check')}</span>` : ""}
     </button>`).join("");
  const b = openSheet(`<div class="sheet-title">${esc(title)}</div><div class="pick-list">${rows}</div>`);
  b.querySelectorAll(".pick-row").forEach(r => r.onclick = () => {
    haptic(); closeSheet(); onPick(r.dataset.v);
  });
}
$("#sheet").addEventListener("click", (e) => { if (e.target.classList.contains("sheet-backdrop")) closeSheet(); });

/* ── Router ── */
let stack = [];
// при переходе на НОВЫЙ экран всегда мотаем наверх (иначе деталь объекта открывается
// на середине/внизу — на позиции скролла списка). fn() сперва рисует skeleton (короткий),
// поэтому scrollTop=0 после fn() надёжно ставит верх.
function go(fn, push = true) { if (push) stack.push(fn); fn(); if (push) view.scrollTop = 0; hideToTop(); updateBack(); }
function back() { if (stack.length > 1) { stack.pop(); stack[stack.length - 1](); view.scrollTop = 0; hideToTop(); updateBack(); } }
// Кнопка «наверх»: прячем при любой навигации (новый экран всегда открывается сверху).
function hideToTop() { const b = document.getElementById("toTop"); if (b) b.classList.add("hidden"); }
function updateBack() {
  const show = stack.length > 1;
  const bb = $("#backBtn"); if (bb) bb.classList.toggle("hidden", !show);
  const tb = $("#topbar"); if (tb) tb.classList.toggle("has-back", show);
  if (tg?.BackButton) { show ? tg.BackButton.show() : tg.BackButton.hide(); }
}
tg?.BackButton?.onClick(() => { haptic(); back(); });
$("#backBtn")?.addEventListener("click", () => { haptic(); back(); });

/* ── Свайп от левого края вправо → назад (как в iOS) ── */
let _swipe = null;
document.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) { _swipe = null; return; }
  const t = e.touches[0];
  // от левого края (~48px), не на скроллящихся/интерактивных элементах
  if (t.clientX > 48) { _swipe = null; return; }
  if (e.target.closest(".carousel,.map-box,.leaflet-container,textarea,input,.sheet,.seg,.gallery-ov")) { _swipe = null; return; }
  _swipe = { x: t.clientX, y: t.clientY };
}, { passive: true });
document.addEventListener("touchend", (e) => {
  if (!_swipe) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - _swipe.x, dy = t.clientY - _swipe.y;
  _swipe = null;
  // явный горизонтальный свайп вправо
  if (dx > 55 && dx > Math.abs(dy) * 1.4 && stack.length > 1) { haptic(); back(); }
}, { passive: true });

let activeTab = "home";
function switchTab(tab) {
  activeTab = tab; stack = [];
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  haptic();
  if (tab === "home") go(renderHome);
  else if (tab === "fdg") go(renderAutopost);
  else if (tab === "clients") go(() => renderClients());
  else if (tab === "listings") go(() => renderListings());
  else if (tab === "profile") go(renderProfile);
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));

/* ── Reveal-on-scroll меню (как в нативных приложениях): листаешь вниз — «менюшка»
   с поиском/фильтрами прячется; чуть листнул вверх — возвращается. Один общий
   обработчик скролла, активное меню задаётся через setRevealMenu() при рендере. ── */
let _revealEl = null, _revealLastY = 0;
function setRevealMenu(elm) {
  _revealEl = elm || null;
  _revealLastY = view.scrollTop;
  if (elm) { elm.classList.add("sticky-menu"); elm.classList.remove("hdr-hidden"); }
}
view.addEventListener("scroll", () => {
  $("#topbar").classList.toggle("scrolled", view.scrollTop > 6);
  // кнопка «наверх» — всплывает, когда пролистал заметно вниз (любой длинный список)
  const tt = document.getElementById("toTop");
  if (tt) tt.classList.toggle("hidden", view.scrollTop < 600);
  if (_revealEl && _revealEl.isConnected) {
    const y = view.scrollTop;
    if (y < 40) _revealEl.classList.remove("hdr-hidden");           // у самого верха — всегда видно
    else if (y > _revealLastY + 6) _revealEl.classList.add("hdr-hidden");    // вниз → прячем
    else if (y < _revealLastY - 6) _revealEl.classList.remove("hdr-hidden"); // вверх → показываем
    _revealLastY = y;
  }
});
document.getElementById("toTop")?.addEventListener("click", () => {
  haptic(); view.scrollTo({ top: 0, behavior: "smooth" });
});

/* ── Избранное агента (звёзды на карточках) — единый набор id, грузим один раз ── */
const FAVS = new Set();
async function loadFavs() {
  try { const r = await api("/favorites"); FAVS.clear(); (r.ids || []).forEach(i => FAVS.add(i)); }
  catch (e) {}
}
async function toggleFav(id, btn) {
  const was = FAVS.has(id);
  haptic();
  try {
    if (was) { await api("/favorites/" + id, { method: "DELETE" }); FAVS.delete(id); }
    else { await api("/favorites/" + id, { method: "POST" }); FAVS.add(id); }
    if (btn) btn.classList.toggle("on", !was);
  } catch (e) { toast("Не сохранить", "err"); }
}

/* ════════════════════════ HOME ════════════════════════ */
async function renderHome() {
  setTitle("Главная", "помощник риелтора");
  loading();
  let s = {}; try { s = await api("/stats"); } catch (e) {}
  let acc = {}; try { acc = await api("/account"); } catch (e) {}
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  wrap.innerHTML = `
    <div class="row-between" style="margin:2px 4px 10px">
      <div class="section-title" style="margin:0">Последние объекты</div>
      <button class="link-all" id="homeAll">все ›</button>
    </div>
    <div class="carousel" id="homeCarousel"><div class="loader" style="height:150px"><div class="spin"></div></div></div>
    <div class="section-title" style="margin-top:20px">Сводка</div>
    <div class="stats-grid">
      <div class="stat a"><div class="glow"></div><div class="num">${s.active ?? 0}</div><div class="lbl">Активные клиенты</div></div>
      <div class="stat g"><div class="glow"></div><div class="num">${s.sent_today ?? 0}</div><div class="lbl">Отправок сегодня</div></div>
      <div class="stat am"><div class="glow"></div><div class="num">${s.fdg_today ?? 0}</div><div class="lbl">ФДГ сегодня</div></div>
    </div>
    <div class="section-title">Быстрые действия</div>
    <div class="quick">
      <button class="quick-btn" id="qSearch"><span class="qi">${icon('search')}</span><span class="qt">Поиск вариантов</span><span class="qs">по всей базе</span></button>
      <button class="quick-btn" id="qHist"><span class="qi">${icon('refresh')}</span><span class="qt">История отправок</span><span class="qs">что уже ушло</span></button>
      <button class="quick-btn" id="qScan"><span class="qi">${icon('download')}</span><span class="qt">Собрать объявления</span><span class="qs">за период</span></button>
      <button class="quick-btn" id="qFav"><span class="qi">${icon('heart')}</span><span class="qt">Избранное</span><span class="qs">сохранённые объекты</span></button>
    </div>
    ${(!acc.connected) ? `
    <div class="card" id="connCard" style="border-color:var(--accent);margin-top:28px">
      <div style="font-weight:640;margin-bottom:4px">${icon('smartphone')} Подключите свой Telegram</div>
      <div class="muted" style="margin-bottom:10px">Чтобы отправлять варианты клиентам от вашего имени.</div>
      <button class="btn btn-primary sm" id="connBtn">Подключить</button>
    </div>` : ""}`;
  wrap.appendChild(el(`<div class="app-ver">Риелти · ${APP_VERSION}</div>`));
  view.appendChild(wrap);
  $("#homeAll").onclick = () => switchTab("listings");
  loadHomeCarousel();
  $("#qSearch").onclick = () => { haptic(); go(renderSearch); };
  $("#qHist").onclick = () => { haptic(); go(renderHistory); };
  $("#qScan").onclick = () => sheetScan();
  $("#qFav").onclick = () => { haptic(); go(renderFavorites); };
  const connBtn = $("#connBtn"); if (connBtn) connBtn.onclick = () => { haptic(); switchTab("profile"); };
}

async function loadHomeCarousel() {
  let items = []; try { items = await api("/listings?limit=12"); } catch (e) {}
  const box = $("#homeCarousel"); if (!box) return;
  if (!items.length) { box.innerHTML = `<div class="muted" style="padding:6px 4px">Пока нет объектов</div>`; return; }
  box.innerHTML = "";
  for (const l of items) {
    const it = el(`
      <div class="ccard">
        <div class="cc-thumb" data-thumb="${l.id}" data-cov="${l.cover_idx || 0}"><span class="src-badge">${esc(l.source || "")}</span></div>
        <div class="cc-body">
          <div class="cc-price">${fmtMoney(l.price)} ₽</div>
          <div class="cc-title">${listingTitle(l)}<span class="lid-badge">#${l.id}</span></div>
          <div class="cc-meta">${listingMeta(l)}</div>
        </div>
      </div>`);
    it.onclick = () => { haptic(); go(() => renderListingDetail(l.id)); };
    box.appendChild(it);
    if (thumbObserver) thumbObserver.observe(it.querySelector(".cc-thumb"));
  }
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
    wrap.appendChild(el(`<div class="empty"><span class="em-ic">&#9786;&#65038;</span>Пока нет клиентов в этой группе</div>`));
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
  fab = el(`<button class="fab" id="fab">${icon('plus')}</button>`);
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
      ${c.rooms ? `<span class="chip accent">${icon('bed')} ${esc(roomsLabel(c.rooms))}</span>` : ""}
      ${(c.budget_min || c.budget_max) ? `<span class="chip accent">${icon('wallet')} ${c.budget_min ? fmtMoney(c.budget_min) : "0"}–${c.budget_max ? fmtMoney(c.budget_max) : "∞"} ₽</span>` : ""}
      ${c.districts ? `<span class="chip">${icon('map-pin')} ${esc(c.districts)}</span>` : ""}
      ${c.metro_stations ? `<span class="chip">${icon('train')} ${esc(c.metro_stations)}</span>` : ""}
      ${(c.area_min || c.area_max) ? `<span class="chip">${icon('ruler')} ${c.area_min || 0}–${c.area_max || "∞"} м²</span>` : ""}
      ${c.has_pets ? `<span class="chip pet">${icon('paw')} с животными</span>` : ""}
    </div>
    ${c.notes ? `<div class="card"><div class="muted" style="margin-bottom:4px">Заметки</div>${esc(c.notes)}</div>` : ""}
    <div class="section-title">${icon('compass')} Гео-точки</div>
    ${geo.map(g => `
      <div class="card"><div class="row-between" style="align-items:center"><div><b>${esc(g.label || "точка")}</b>
      <div class="muted">${g.max_minutes ? "≤" + g.max_minutes + " мин " + (TRANSPORT_RU[g.transport] || "") : esc(g.address || "")}${g.is_strict ? " · строго" : ""}</div></div>
      <button class="tag-x geo-del" data-gid="${g.id}" style="font-size:20px;color:var(--muted);background:none;border:none;cursor:pointer;padding:0 4px">×</button></div></div>`).join("")}
    <button class="btn btn-soft sm" id="bAddGeo" style="width:100%;margin-top:2px">${icon('plus')} Гео-точка</button>
    <div class="btn-primary btn" id="bMatch" style="margin-top:18px">${icon('search')} Подобрать варианты</div>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn btn-soft" id="bEdit">${icon('pencil')} Критерии</button>
      <button class="btn btn-soft" id="bStatus">${icon('sliders')} Статус</button>
    </div>`;
  view.appendChild(wrap);
  lazyAvatar(wrap.querySelector("[data-av]"), c);
  $("#bMatch").onclick = () => { haptic(); go(() => renderMatch(c)); };
  $("#bEdit").onclick = () => sheetEditCriteria(c);
  $("#bStatus").onclick = () => sheetStatus(c);
  const addGeoBtn = wrap.querySelector("#bAddGeo");
  if (addGeoBtn) addGeoBtn.onclick = () => { haptic(); sheetAddGeo(c.id, () => renderClientDetail(c.id)); };
  wrap.querySelectorAll(".geo-del").forEach(x => x.onclick = async () => {
    haptic();
    try { await api(`/clients/${c.id}/geo/delete`, { method: "POST", body: { id: parseInt(x.dataset.gid) } }); renderClientDetail(c.id); }
    catch (e) { toast("Не удалить точку", "err"); }
  });
}

const TRANSPORT_RU = { foot: "пешком", car: "на машине", transit: "на транспорте" };

// Лист добавления гео-точки клиенту: адрес/метро + лимит минут + транспорт + строго.
function sheetAddGeo(clientId, onDone) {
  const b = openSheet(`
    <div class="sheet-title">${icon('compass')} Гео-точка</div>
    <div class="ed-label">Адрес или станция метро</div>
    <input class="input" id="gAddr" placeholder="метро Савёловская / ул. Тверская 7">
    <div class="ed-label">Не дольше, минут</div>
    <input class="input" id="gMin" inputmode="numeric" placeholder="напр. 20">
    <div class="ed-label">Транспорт</div>
    <div class="chipsel" id="gTr">
      <button class="chsel sm2 on" data-tr="transit">${icon('train')} транспорт</button>
      <button class="chsel sm2" data-tr="foot">${icon('footprints')} пешком</button>
      <button class="chsel sm2" data-tr="car">${icon('car')} машина</button>
    </div>
    <label class="row-between" style="margin-top:14px;cursor:pointer">
      <span>Строго отсеивать в подборе</span>
      <input type="checkbox" id="gStrict" checked style="width:20px;height:20px">
    </label>
    <div class="btn-row" style="margin-top:20px">
      <button class="btn btn-soft" id="gCancel" style="flex:1">Отмена</button>
      <button class="btn btn-primary" id="gSave" style="flex:2">Добавить</button>
    </div>`);
  b.querySelectorAll("#gTr .chsel").forEach(x => x.onclick = () => {
    haptic(); b.querySelectorAll("#gTr .chsel").forEach(c => c.classList.remove("on")); x.classList.add("on");
  });
  b.querySelector("#gCancel").onclick = () => { haptic(); closeSheet(); };
  b.querySelector("#gSave").onclick = async () => {
    const addr = (b.querySelector("#gAddr").value || "").trim();
    const min = parseInt((b.querySelector("#gMin").value || "").replace(/\D/g, ""));
    if (!addr) return toast("Укажи адрес или метро", "err");
    haptic();
    const trEl = b.querySelector("#gTr .chsel.on");
    const body = {
      address: addr,
      max_minutes: isNaN(min) ? null : min,
      transport: trEl ? trEl.dataset.tr : "transit",
      is_strict: b.querySelector("#gStrict").checked,
    };
    const btn = b.querySelector("#gSave"); btn.disabled = true;
    try {
      const r = await api(`/clients/${clientId}/geo`, { method: "POST", body });
      closeSheet();
      if (!r.resolved) toast("Точка добавлена, но адрес не распознан — уточни", "err");
      else toast("Гео-точка добавлена", "ok");
      if (onDone) onDone();
    } catch (e) { btn.disabled = false; toast("Не сохранить точку", "err"); }
  };
}

let matchSource = "all";   // all | exclusives | arendok  (как в «Объектах»/«Поиске»)
let matchCommMax = null;   // null | 0 | 50
let matchSort = "";        // см. SORT_OPTS
async function renderMatch(client, page = 0, acc = null, filter = null) {
  setTitle("Подбор", client.name);
  if (!acc) loading();
  let data;
  try {
    data = await api(`/clients/${client.id}/match`, { method: "POST", body: {
      page, filters: filter || {},
      source: matchSource, commission_max: matchCommMax, sort: matchSort,
    } });
  }
  catch (e) { return toast("Ошибка подбора", "err"); }
  if (!acc) {
    view.innerHTML = "";
    acc = el(`<div class="fade-in"></div>`);
    const on = filtersActive(filter);
    // единая панель фильтров — ТА ЖЕ, что в «Объектах» и «Поиске»
    const filterBar = el(`<div style="margin:0 0 10px"></div>`);
    acc.appendChild(filterBar);
    filterBar.appendChild(filterControlsEl({
      getSource: () => matchSource, setSource: (v) => { matchSource = v; },
      getComm: () => matchCommMax, setComm: (v) => { matchCommMax = v === "" ? null : parseInt(v); },
      getSort: () => matchSort, setSort: (v) => { matchSort = v; },
      advActive: () => filtersActive(filter),
      advSummary: () => filtersActive(filter) ? filtersSummary(filter) : "",
      onAdv: () => sheetFilters(filter || {}, (f) => renderMatch(client, 0, null, filtersActive(f) ? f : null)),
      onAdvClear: () => renderMatch(client, 0, null, null),
      onChange: () => renderMatch(client, 0, null, filter),
    }));
    acc.appendChild(el(`<div class="muted" style="margin:2px 4px 12px">Найдено ${data.total} вариантов${on ? " (с фильтрами)" : " под критерии"}</div>`));
    const listWrap = el(`<div id="matchList"></div>`);
    acc.appendChild(listWrap);
    view.appendChild(acc);
    if (!data.total) acc.querySelector("#matchList").appendChild(el(`<div class="empty"><span class="em-ic">${icon('inbox')}</span>Подходящих вариантов нет</div>`));
  }
  const list = acc.querySelector("#matchList");
  // мультивыбор — инициализируем один раз, не сбрасываем при подгрузке следующей страницы
  if (!acc._sel) {
    acc._sel = new Set();
    const selBar = el(`<div class="sel-bar hidden"></div>`);
    acc.insertBefore(selBar, acc.querySelector("#matchList"));
    acc._refreshBar = () => {
      if (!acc._sel.size) { selBar.classList.add("hidden"); return; }
      selBar.classList.remove("hidden");
      selBar.innerHTML = `<button class="btn btn-green sm" style="flex:1" data-ms>${icon('send-h')} Отправить выбранные (${acc._sel.size}) → ${esc(client.name)}</button>
        <button class="btn btn-soft sm" data-mc>Сброс</button>`;
      selBar.querySelector("[data-ms]").onclick = () => {
        const chosen = acc._allListings.filter(l => acc._sel.has(l.id));
        haptic(); acc._sel.clear(); acc._refreshBar();
        sendSelected(chosen, client.id, client.name);
      };
      selBar.querySelector("[data-mc]").onclick = () => { haptic(); acc._sel.clear(); acc._refreshBar(); acc._rerender(); };
    };
    acc._allListings = [];
    acc._rerender = () => {
      list.innerHTML = "";
      for (const l of acc._allListings) {
        list.appendChild(listingCard(l,
          () => sendListing(l, client.id, client.name), true, true,
          { checked: acc._sel.has(l.id), onToggle: () => { acc._sel.has(l.id) ? acc._sel.delete(l.id) : acc._sel.add(l.id); acc._refreshBar(); acc._rerender(); } }
        ));
      }
    };
  }
  acc._allListings.push(...data.listings);
  acc._rerender();
  const oldMore = acc.querySelector(".more-btn"); if (oldMore) oldMore.remove();
  if (data.has_more) {
    const more = el(`<button class="btn btn-soft more-btn" style="margin-top:6px">Ещё ${Math.min(12, data.total - (page + 1) * 12)} вариантов</button>`);
    more.onclick = () => { haptic(); more.remove(); renderMatch(client, page + 1, acc, filter); };
    acc.appendChild(more);
  }
}

/* ════════════════════════ LISTINGS ════════════════════════ */
let listingsFilter = null;
let listSource = "all";   // all | exclusives | arendok  (синхронно с поиском)
let listOnlyJk = false;   // показывать только объекты с заполненным ЖК
let listCommMax = null;   // null | 0 | 50
let listSort = "";        // см. SORT_OPTS
const LIST_PAGE = 50;
function listQueryBody(offset) {
  return { source: listSource, limit: LIST_PAGE, offset, commission_max: listCommMax, sort: listSort,
           filters: { ...(listingsFilter || {}), ...(listOnlyJk ? { only_jk: 1 } : {}) } };
}
async function renderListings() {
  setTitle("Объекты", "последние объявления");
  removeFab();
  loading();
  let listings = [];
  let listHasMore = false;
  try {
    const r = await api("/listings/query", { method: "POST", body: listQueryBody(0) });
    listings = r.listings || [];
    listHasMore = !!r.has_more;
  } catch (e) {}
  view.innerHTML = "";
  // «менюшка» поиска+фильтров — sticky, прячется при скролле вниз / возвращается при вверх.
  // ВАЖНО: menu — ПРЯМОЙ ребёнок #view, НЕ внутри .fade-in: у .fade-in анимация с transform,
  // а transform у родителя ломает position:sticky (родитель становится containing block).
  const menu = el(`<div></div>`);
  const searchBar = el(`<button class="search-bar" id="oSearch"><span class="sb-ic">${icon('search')}</span><span>Поиск вариантов и фильтры…</span></button>`);
  menu.appendChild(searchBar);
  // единая панель фильтров (та же, что в «Поиске»)
  const filterBar = el(`<div style="margin:0 0 12px"></div>`);
  menu.appendChild(filterBar);
  view.appendChild(menu);
  const wrap = el(`<div class="fade-in"></div>`);
  const on = filtersActive(listingsFilter);
  if (!listings.length) {
    wrap.appendChild(el(`<div class="empty"><span class="em-ic">${icon('inbox')}</span>${on ? "Под фильтры ничего не нашлось" : "Здесь пока пусто"}</div>`));
  }
  // мультивыбор по объектам (как в поиске): галочки + sticky-бар «отправить выбранные»
  const sel = new Set();
  const selBar = el(`<div class="sel-bar hidden"></div>`);
  wrap.appendChild(selBar);
  const rowsBox = el(`<div></div>`);
  wrap.appendChild(rowsBox);

  function refreshBar() {
    if (!sel.size) { selBar.classList.add("hidden"); return; }
    selBar.classList.remove("hidden");
    selBar.innerHTML = `
      <button class="btn btn-green sm" style="flex:1" data-multisend>${icon('send-h')} Отправить (${sel.size}) одному</button>
      <button class="btn btn-soft sm" data-multiclear>Сброс</button>`;
    selBar.querySelector("[data-multisend]").onclick = () => {
      const chosen = listings.filter(l => sel.has(l.id));
      haptic(); sheetClientPicker((cid, cname) => { sel.clear(); sendSelected(chosen, cid, cname); });
    };
    selBar.querySelector("[data-multiclear]").onclick = () => { haptic(); sel.clear(); renderRows(); };
  }
  function renderRows() {
    rowsBox.innerHTML = "";
    for (const l of listings) {
      rowsBox.appendChild(listingCard(
        l,
        () => sheetClientPicker((cid, cname) => sendListing(l, cid, cname)),
        true, true,
        {
          checked: sel.has(l.id),
          onToggle: () => { sel.has(l.id) ? sel.delete(l.id) : sel.add(l.id); renderRows(); },
        },
      ));
    }
    refreshBar();
  }
  renderRows();
  // «Загрузить ещё» — подгружает следующую страницу и дорисовывает строки
  const moreBox = el(`<div style="margin-top:14px"></div>`);
  wrap.appendChild(moreBox);
  function renderMore() {
    moreBox.innerHTML = "";
    if (!listHasMore) return;
    const btn = el(`<button class="btn btn-soft" style="width:100%">Загрузить ещё</button>`);
    moreBox.appendChild(btn);
    btn.onclick = async () => {
      haptic();
      btn.disabled = true; btn.textContent = "Загрузка…";
      try {
        const r = await api("/listings/query", { method: "POST", body: listQueryBody(listings.length) });
        listings.push(...(r.listings || []));
        listHasMore = !!r.has_more;
        renderRows();
        renderMore();
      } catch (e) { btn.disabled = false; btn.textContent = "Загрузить ещё"; toast("Не загрузить", "err"); }
    };
  }
  renderMore();
  view.appendChild(wrap);
  searchBar.onclick = () => { haptic(); go(renderSearch); };
  filterBar.appendChild(filterControlsEl({
    getSource: () => listSource, setSource: (v) => { listSource = v; },
    getComm: () => listCommMax, setComm: (v) => { listCommMax = v === "" ? null : parseInt(v); },
    getSort: () => listSort, setSort: (v) => { listSort = v; },
    getOnlyJk: () => listOnlyJk, setOnlyJk: (v) => { listOnlyJk = v; },
    advActive: () => filtersActive(listingsFilter),
    advSummary: () => filtersActive(listingsFilter) ? filtersSummary(listingsFilter) : "",
    onAdv: () => sheetFilters(listingsFilter || {}, (f) => { listingsFilter = filtersActive(f) ? f : null; renderListings(); }),
    onAdvClear: () => { listingsFilter = null; renderListings(); },
    onChange: () => renderListings(),
  }));
  setRevealMenu(menu);  // включаем reveal-on-scroll для «менюшки»
}

/* ════════════════════════ КАРТА (обвести область) ════════════════════════ */
let _leafletP = null;
function ensureLeaflet() {
  if (window.L) return Promise.resolve();
  if (_leafletP) return _leafletP;
  _leafletP = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = () => resolve();
    js.onerror = () => reject(new Error("leaflet load failed"));
    document.head.appendChild(js);
  });
  return _leafletP;
}

function filterQS() {
  if (!filtersActive(listingsFilter)) return "";
  let q = "";
  for (const [k, v] of Object.entries(listingsFilter)) {
    if (!v || k === "polygon" || k === "source" || typeof v === "object") continue;
    q += `&${k}=${encodeURIComponent(v)}`;
  }
  return q;
}

function pointInPoly(lat, lng, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i][0], xi = poly[i][1], yj = poly[j][0], xj = poly[j][1];
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

async function renderMap(source = "all", pick = null, initialPolys = null) {
  setTitle(pick ? "Область" : "Карта", "обведите район пальцем");
  removeFab();
  loading();
  try { await ensureLeaflet(); } catch (e) { return toast("Карта не загрузилась (проверь интернет)", "err"); }
  let data; try { data = await api("/map/points?source=" + source + filterQS()); } catch (e) { data = { points: [] }; }
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  wrap.innerHTML = `
    <div class="map-tools">
      <button class="btn btn-primary sm" id="mDraw">${icon('pencil')} Обвести область</button>
      <button class="btn btn-soft sm" id="mClear" style="display:none">Сбросить</button>
      <span class="muted" id="mInfo" style="margin-left:auto;font-size:12px"></span>
    </div>
    <div id="map" class="map-box"></div>
    <div class="map-legend"><span class="dotm blue"></span>точный адрес <span class="dotm amber"></span>у метро (примерно)</div>
    <div id="mAreas" class="area-chips"></div>
    <div id="mResults" style="margin-top:14px"></div>`;
  view.appendChild(wrap);

  if (!data.points.length) {
    $("#mInfo").textContent = "";
    $("#mResults").innerHTML = `<div class="empty"><span class="em-ic">${icon('map')}</span>Пока нечего показать на карте.<br>Координаты подгружаются в фоне — попробуй позже.</div>`;
    return;
  }

  const map = L.map("map", { center: [55.751, 37.618], zoom: 10, zoomControl: true, attributionControl: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
  setTimeout(() => map.invalidateSize(), 150);

  const renderer = L.canvas({ padding: 0.5 });
  const markers = [];
  for (const p of data.points) {
    const c = L.circleMarker([p.lat, p.lng], {
      renderer, radius: 5, weight: 1,
      color: p.approx ? "#f5b945" : "#5b8cff", fillColor: p.approx ? "#f5b945" : "#5b8cff", fillOpacity: .65,
    });
    c.addTo(map); markers.push(c);
  }
  $("#mInfo").textContent = `${data.points.length} объектов`;
  try { map.fitBounds(L.featureGroup(markers).getBounds().pad(0.08)); } catch (e) {}

  const mapEl = $("#map");
  const mDraw = $("#mDraw"), mClear = $("#mClear"), mInfo = $("#mInfo");
  let drawing = false, pathLL = [], preview = null;
  const areas = [];  // [{ path:[[lat,lng]...], layer }] — несколько контуров, объединение (OR)

  const ptOf = (e) => {
    const r = mapEl.getBoundingClientRect();
    return map.containerPointToLatLng(L.point(e.clientX - r.left, e.clientY - r.top));
  };
  function addPt(e) {
    const ll = ptOf(e); pathLL.push([ll.lat, ll.lng]);
    if (!preview) preview = L.polyline(pathLL, { color: "#37d39b", weight: 3 }).addTo(map);
    else preview.setLatLngs(pathLL);
  }
  function onDown(e) {
    if (!drawing) return;
    e.preventDefault();
    pathLL = []; if (preview) { map.removeLayer(preview); preview = null; }
    try { mapEl.setPointerCapture(e.pointerId); } catch (x) {}
    addPt(e);
    mapEl.addEventListener("pointermove", onMove);
    mapEl.addEventListener("pointerup", onUp, { once: true });
  }
  function onMove(e) { e.preventDefault(); addPt(e); }
  function onUp() { mapEl.removeEventListener("pointermove", onMove); finishDraw(); }

  function setDrawMode(on) {
    drawing = on;
    const fns = ["dragging", "touchZoom", "doubleClickZoom", "scrollWheelZoom", "boxZoom", "keyboard"];
    fns.forEach(f => { if (map[f]) on ? map[f].disable() : map[f].enable(); });
    mapEl.style.cursor = on ? "crosshair" : "";
    mapEl.classList.toggle("drawing", on);
  }

  // объект попадает в выборку, если он внутри ЛЮБОЙ из обведённых областей
  const ptsInAreas = () => data.points.filter(pt => areas.some(a => pointInPoly(pt.lat, pt.lng, a.path)));
  const pathsOf = () => areas.map(a => a.path.slice());

  function addArea(path) {
    const layer = L.polygon(path, { color: "#37d39b", weight: 2, fillColor: "#37d39b", fillOpacity: .08 }).addTo(map);
    areas.push({ path: path.slice(), layer });
  }
  function removeArea(i) {
    const a = areas[i]; if (!a) return;
    map.removeLayer(a.layer); areas.splice(i, 1); afterChange();
  }

  function enterDraw() {
    setDrawMode(true);
    mDraw.style.display = "none"; mClear.style.display = "";
    mInfo.textContent = "Веди пальцем по карте";
    mapEl.addEventListener("pointerdown", onDown);
  }
  function finishDraw() {
    setDrawMode(false);
    mapEl.removeEventListener("pointerdown", onDown);
    mDraw.style.display = "";
    if (preview) { map.removeLayer(preview); preview = null; }
    if (pathLL.length < 3) { mInfo.textContent = "Мало точек, попробуй ещё"; afterChange(); return; }
    addArea(pathLL); afterChange();
  }

  // перерисовать инфо / кнопки / чипы областей / результаты после любого изменения набора
  function afterChange() {
    const cnt = ptsInAreas().length;
    mDraw.innerHTML = icon('pencil') + (areas.length ? " Добавить ещё область" : " Обвести область");
    mClear.style.display = areas.length ? "" : "none";
    mInfo.textContent = areas.length ? `${areas.length} обл · ${cnt} в области` : `${data.points.length} объектов`;
    renderAreaChips();
    if (pick) showApplyBar(cnt);
    else if (areas.length) showMapResults(ptsInAreas());
    else $("#mResults").innerHTML = "";
  }

  function renderAreaChips() {
    const box = $("#mAreas"); if (!box) return;
    box.innerHTML = "";
    areas.forEach((a, i) => {
      const chip = el(`<span class="area-chip">${icon('map')} Область ${i + 1}<button class="area-x" data-x="${i}">✕</button></span>`);
      chip.querySelector("[data-x]").onclick = () => { haptic(); removeArea(i); };
      box.appendChild(chip);
    });
  }

  mDraw.onclick = () => { haptic(); enterDraw(); };
  mClear.onclick = () => {
    haptic(); areas.forEach(a => map.removeLayer(a.layer)); areas.length = 0; afterChange();
  };

  // режим ВЫБОРА области для фильтра: рисуешь (можно несколько) → «Применить области»
  function showApplyBar(n) {
    const box = $("#mResults"); box.innerHTML = "";
    box.appendChild(el(`<div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn btn-primary" id="mApplyArea" ${areas.length ? "" : "disabled"}>${icon('check')} Применить ${areas.length > 1 ? "области" : "область"} (${n})</button>
      <button class="btn btn-soft" id="mNoArea">Без области</button>
    </div>`));
    box.querySelector("#mApplyArea").onclick = () => { if (!areas.length) return; haptic(); pick(pathsOf()); back(); };
    box.querySelector("#mNoArea").onclick = () => { haptic(); pick(null); back(); };
  }

  // восстановление набора областей при повторном входе из фильтра
  if (initialPolys && initialPolys.length) {
    initialPolys.forEach(p => { if (Array.isArray(p) && p.length >= 3) addArea(p); });
    if (areas.length) { try { map.fitBounds(L.featureGroup(areas.map(a => a.layer)).getBounds().pad(0.2)); } catch (e) {} }
  }
  if (pick) afterChange();

  // результаты внутри области: карточки + мультивыбор + отправка
  const sel = new Set();
  function showMapResults(items) {
    const box = $("#mResults"); box.innerHTML = "";
    if (!items.length) { box.innerHTML = `<div class="empty"><span class="em-ic">${icon('map')}</span>В этой области ничего нет</div>`; return; }
    sel.clear();
    const selBar = el(`<div class="sel-bar hidden"></div>`);
    box.appendChild(selBar);
    const rows = el(`<div></div>`); box.appendChild(rows);
    function refreshBar() {
      if (!sel.size) { selBar.classList.add("hidden"); return; }
      selBar.classList.remove("hidden");
      selBar.innerHTML = `<button class="btn btn-green sm" style="flex:1" data-ms>${icon('send-h')} Отправить (${sel.size}) одному</button>
        <button class="btn btn-soft sm" data-mc>Сброс</button>`;
      selBar.querySelector("[data-ms]").onclick = () => {
        const chosen = items.filter(l => sel.has(l.id));
        haptic(); sheetClientPicker((cid, cname) => { sel.clear(); sendSelected(chosen, cid, cname); });
      };
      selBar.querySelector("[data-mc]").onclick = () => { haptic(); sel.clear(); draw(); };
    }
    function draw() {
      rows.innerHTML = "";
      for (const l of items) rows.appendChild(listingCard(
        l, () => sheetClientPicker((cid, cname) => sendListing(l, cid, cname)),
        true, true, { checked: sel.has(l.id), onToggle: () => { sel.has(l.id) ? sel.delete(l.id) : sel.add(l.id); draw(); } }));
      refreshBar();
    }
    draw();
  }
}

function listingCard(l, onSend, openable = true, thumb = true, select = null) {
  const card = el(`
    <div class="card pad0 ${openable ? "tap" : ""} ${select && select.checked ? "lc-sel" : ""}">
      ${thumb ? `<div class="card-thumb" data-thumb="${l.id}" data-cov="${l.cover_idx || 0}"><span class="src-badge">${esc(l.source || "")}</span><button class="fav-btn ${FAVS.has(l.id) ? "on" : ""}" data-fav title="В избранное">${icon('heart')}</button></div>` : ""}
      <div class="card-body">
        <div class="row-between" style="align-items:flex-start">
          <div style="min-width:0">
            <div class="listing-price">${fmtMoney(l.price)} ₽<span class="muted" style="font-size:13px;font-weight:500">/мес</span></div>
            <div class="listing-title">${listingTitle(l)}<span class="lid-badge">#${l.id}</span></div>
            <div class="listing-meta">${listingMeta(l)}</div>
            ${l.exclusive ? `<div class="excl-line">${icon('crown')} Эксклюзив${l.exclusive_owner ? ": " + esc(l.exclusive_owner) : ""}</div>` : ""}
          </div>
          ${select ? `<div class="lc-check ${select.checked ? "on" : ""}" data-check>${select.checked ? icon('check') : ""}</div>` : ""}
        </div>
        ${(l.geo && l.geo.length) ? `<div style="margin-top:8px">${l.geo.map(g => `<div class="geo-line">${esc(g)}</div>`).join("")}</div>` : ""}
        <div class="btn-row" style="margin-top:12px">
          ${onSend ? `<button class="btn btn-green sm" style="flex:1" data-send>${icon('send')} Отправить</button>` : ""}
          ${l.url ? `<button class="btn btn-soft sm" style="flex:1" data-open>${icon('ext-link')} Пост</button>` : ""}
          <button class="btn btn-soft sm" style="flex:1" data-detail>Подробнее&nbsp;›</button>
        </div>
      </div>
    </div>`);
  if (thumb && thumbObserver) thumbObserver.observe(card.querySelector(".card-thumb"));
  const favB = card.querySelector("[data-fav]");
  if (favB) favB.onclick = (e) => { e.stopPropagation(); toggleFav(l.id, favB); };
  if (select) {
    const chk = card.querySelector("[data-check]");
    if (chk) chk.onclick = (e) => { e.stopPropagation(); haptic(); select.onToggle(); };
  }
  if (onSend) card.querySelector("[data-send]").onclick = (e) => { e.stopPropagation(); haptic(); onSend(); };
  const openBtn = card.querySelector("[data-open]");
  if (openBtn) openBtn.onclick = (e) => { e.stopPropagation(); haptic(); openPost(l.url); };
  card.querySelector("[data-detail]").onclick = (e) => { e.stopPropagation(); haptic(); go(() => renderListingDetail(l.id)); };
  // тап по любому месту карточки → подробнее (кнопки/галочка перехватывают свой клик)
  if (openable) card.onclick = () => { haptic(); go(() => renderListingDetail(l.id)); };
  return card;
}

async function renderListingDetail(id) {
  removeFab(); setTitle("Объект");
  loading();
  let l; try { l = await api("/listings/" + id); } catch (e) { return toast("Не загрузить", "err"); }
  view.innerHTML = ""; view.scrollTop = 0;
  const wrap = el(`<div class="fade-in"></div>`);
  wrap.innerHTML = `
    <div class="detail-photo-wrap" data-photowrap style="display:none">
      <img class="detail-photo" data-photo>
      <span class="gal-count" id="galCount" style="display:none"></span>
    </div>
    <div class="detail-thumbs" id="detThumbs" style="display:none"></div>
    <button class="btn btn-soft sm" id="bGallery" style="display:none;width:100%;margin:0 0 6px">${icon('image')} Все фото</button>
    <div class="listing-price" style="font-size:26px">${fmtMoney(l.price)} ₽ <span class="muted" style="font-size:14px;font-weight:500">/мес</span></div>
    <div class="listing-title" style="font-size:18px;margin:4px 0 14px">${listingTitle(l)}<span class="lid-badge">#${l.id}</span></div>
    <div class="card">
      ${l.rooms ? kv("Комнат", roomsLabel(l.rooms)) : ""}
      ${l.area ? kv("Площадь", l.area + " м²") : ""}
      ${(l.floor && l.total_floors) ? kv("Этаж", l.floor + " / " + l.total_floors) : ""}
      ${l.metro ? kv("Метро", l.metro) : ""}
      ${l.district ? kv("Район", l.district) : ""}
      ${l.commission != null ? kv("Комиссия", l.commission === 0 ? "без комиссии" : l.commission + "%") : ""}
      ${l.is_announcement ? kv("Статус", "Анонс — фото пока нет, объект не актуален") : ""}
      ${kv("Источник", l.source || "—")}
      ${l.parsed_at ? kv("Добавлено", fmtAdded(l.parsed_at)) : ""}
      ${l.exclusive ? kv("Эксклюзив", l.exclusive_owner || "да") : ""}
    </div>
    ${ownerEditedHint(l)}
    ${l.is_owner ? `<button class="btn btn-soft sm" id="bEdit" style="width:100%;margin-top:10px">${icon('pencil')} Править объявление</button>` : ""}
    ${l.raw_text ? `<div class="section-title">Текст объявления</div><div class="card muted" style="white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;color:var(--txt)">${esc(l.raw_text)}</div>` : ""}
    <div class="btn btn-green" id="bSend" style="margin-top:18px">${icon('send')} Отправить клиенту</div>
    <div class="btn-row" style="margin-top:10px;flex-wrap:nowrap">
      ${l.url ? `<button class="btn btn-soft" id="bOpen" style="white-space:nowrap">${icon('ext-link')} Пост</button>` : ""}
      <button class="btn btn-soft" id="bBroad" style="white-space:nowrap;flex:1">${icon('megaphone')} Рассылка</button>
      <button class="btn btn-soft fav-toggle ${FAVS.has(l.id) ? "on" : ""}" id="bFav" title="В избранное">${icon('heart')}</button>
    </div>
    <div class="section-title">${icon('comment')} Комментарии</div>
    <div id="cmts" class="cmts"><div class="loader" style="height:50px"><div class="spin"></div></div></div>
    <div class="cmt-form">
      <textarea class="input" id="cmtInput" rows="2" placeholder="Комментарий для команды…" style="resize:none"></textarea>
      <button class="btn btn-green sm" id="cmtSend" title="Отправить">${icon('send-h')}</button>
    </div>`;
  view.appendChild(wrap);
  // обложка (через fetch+blob, чтобы обойти заглушку ngrok) — сначала мелкое, потом резкое
  const ph = wrap.querySelector("[data-photo]");
  const phWrap = wrap.querySelector("[data-photowrap]");
  let hiDone = false;
  const cov = l.cover_idx || 0;  // кэш-бастер обложки
  fetchImg(`/listings/${id}/photo?q=hi&c=${cov}`).then(url => {
    hiDone = true; ph.src = url; phWrap.style.display = "block"; ph.classList.remove("lq");
  }).catch(() => {});
  fetchImg(`/listings/${id}/photo?c=${cov}`).then(url => {
    if (hiDone) return; ph.src = url; phWrap.style.display = "block"; ph.classList.add("lq");
  }).catch(() => {});
  // галерея: сколько всего фото; если >1 — показываем кнопку «Все фото» и счётчик на обложке
  const galBtn = $("#bGallery");
  api(`/listings/${id}/gallery`).then(g => {
    const n = g.count || 0;
    if (n > 1) {
      galBtn.innerHTML = `${icon('image')} Все фото (${n})`;
      galBtn.style.display = "block";
      galBtn.onclick = () => { haptic(); openGallery(id, n, 0, g.cover_idx || 0); };
      const gc = $("#galCount");
      if (gc) { gc.innerHTML = `${icon('image')} ${n}`; gc.style.display = "block"; }
      phWrap.style.cursor = "pointer";
      phWrap.onclick = () => { haptic(); openGallery(id, n, 0, g.cover_idx || 0); };
      // полоска миниатюр под обложкой — сразу видно все кадры, тап открывает галерею
      const strip = $("#detThumbs");
      if (strip) {
        strip.style.display = "flex";
        for (let i = 0; i < n; i++) {
          const t = el(`<div class="dthumb"></div>`);
          strip.appendChild(t);
          fetchImg(`/listings/${id}/photo/${i}`).then(u => { t.style.backgroundImage = `url(${u})`; t.classList.add("loaded"); }).catch(() => {});
          t.onclick = () => { haptic(); openGallery(id, n, i, g.cover_idx || 0); };
        }
      }
    }
  }).catch(() => {});
  $("#bSend").onclick = () => { haptic(); sheetClientPicker((cid, cname) => sendListing(l, cid, cname)); };
  $("#bBroad").onclick = () => { haptic(); sheetBroadcast(l); };
  const ob = $("#bOpen"); if (ob) ob.onclick = () => { haptic(); openPost(l.url); };
  const eb = $("#bEdit"); if (eb) eb.onclick = () => { haptic(); sheetEditListing(l); };
  const fb = $("#bFav"); if (fb) fb.onclick = () => toggleFav(l.id, fb);
  loadComments(id);
  $("#cmtSend").onclick = async () => {
    const ta = $("#cmtInput"); const text = (ta.value || "").trim();
    if (!text) return toast("Пустой комментарий");
    haptic(); $("#cmtSend").disabled = true;
    try { await api(`/listings/${id}/comments`, { method: "POST", body: { text } }); ta.value = ""; await loadComments(id); }
    catch (e) { toast("Не отправить", "err"); }
    finally { $("#cmtSend").disabled = false; }
  };
}

// Комментарии объекта (общие для всех агентов, с именем автора)
async function loadComments(id) {
  const box = $("#cmts"); if (!box) return;
  let data; try { data = await api(`/listings/${id}/comments`); } catch (e) { box.innerHTML = `<div class="muted" style="padding:6px 2px">Не загрузить комментарии</div>`; return; }
  const me = data.me; const list = data.comments || [];
  if (!list.length) { box.innerHTML = `<div class="muted" style="padding:6px 2px">Пока нет комментариев. Будь первым.</div>`; return; }
  box.innerHTML = "";
  for (const c of list) {
    const mine = c.owner_id === me;
    const row = el(`<div class="cmt">
      <div class="cmt-head"><span class="cmt-author">${esc(c.author_name || "Агент")}</span><span class="cmt-date">${fmtDate(c.created_at)}</span>${mine ? `<button class="cmt-del" data-del title="Удалить">${icon('trash')}</button>` : ""}</div>
      <div class="cmt-text">${esc(c.text || "")}</div>
    </div>`);
    const db = row.querySelector("[data-del]");
    if (db) db.onclick = async () => { haptic(); try { await api(`/comments/${c.id}`, { method: "DELETE" }); await loadComments(id); } catch (e) { toast("Не удалить", "err"); } };
    box.appendChild(row);
  }
}

// Короткая дата для комментов/уведомлений: «15.06 14:57» (или «вчера», «сегодня»)
function fmtDate(iso) {
  try {
    const d = new Date(iso); const now = new Date();
    const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return `сегодня ${hh}:${mm}`;
    const dd = String(d.getDate()).padStart(2, "0"), mo = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mo} ${hh}:${mm}`;
  } catch (e) { return ""; }
}
// Дата заливки объекта (когда появился в канале) — полная дата без времени.
function fmtAdded(iso) {
  try { return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }); }
  catch (e) { return ""; }
}
const kv = (k, v) => `<div class="kv"><span class="k">${esc(k)}</span><span class="v">${esc(String(v))}</span></div>`;

// Подсказка «отредактировано вручную» в карточке (видна всем, но правка — только владельцу)
function ownerEditedHint(l) {
  let mf = []; try { mf = JSON.parse(l.manual_fields || "[]"); } catch (e) {}
  if (!mf || !mf.length) return "";
  return `<div class="muted" style="margin:8px 2px 0;font-size:12.5px">${icon('pencil')} Отредактировано вручную — парсер эти поля не трогает</div>`;
}

// Шторка ручной правки объявления (только владелец). Шлёт только ИЗМЕНЁННЫЕ поля,
// чтобы не лочить от парсера то, что владелец не трогал.
function sheetEditListing(l) {
  const FIELDS = [
    ["jk_name", "ЖК", "text"], ["metro", "Метро", "text"], ["address", "Адрес", "text"],
    ["district", "Район", "text"], ["agent_contact", "Контакт агента", "text"],
    ["price", "Цена, ₽/мес", "number"], ["rooms", "Комнат (число)", "text"],
    ["area", "Площадь, м²", "number"], ["floor", "Этаж", "number"],
    ["total_floors", "Этажей в доме", "number"], ["commission", "Комиссия, %", "number"],
  ];
  let locked = []; try { locked = JSON.parse(l.manual_fields || "[]"); } catch (e) {}
  const rows = FIELDS.map(([k, label, type]) => {
    const v = (l[k] === null || l[k] === undefined) ? "" : l[k];
    const lk = locked.includes(k) ? ` <span class="chip accent" style="font-size:10px">правка</span>` : "";
    const step = type === "number" ? ' step="any"' : "";
    return `<div class="ed-label" style="margin-top:10px">${esc(label)}${lk}</div>
      <input class="input" data-f="${k}" type="${type}"${step} value="${esc(String(v))}">`;
  }).join("");
  const b = openSheet(`<div class="sheet-title">${icon('pencil')} Править объявление <span class="muted">#${l.id}</span></div>
    <div class="muted" style="margin-bottom:6px;font-size:12.5px">Меняешь только ты. Изменённые поля защищаются от перезаписи парсером.</div>
    <div style="max-height:54vh;overflow:auto">${rows}</div>
    <button class="btn btn-green" id="edSave" style="width:100%;margin-top:14px">${icon('check')} Сохранить</button>`);
  b.querySelector("#edSave").onclick = async () => {
    const payload = {};
    b.querySelectorAll("[data-f]").forEach(inp => {
      const k = inp.dataset.f, nv = inp.value.trim();
      const ov = (l[k] === null || l[k] === undefined) ? "" : String(l[k]);
      if (nv !== ov) payload[k] = nv;  // только изменённые
    });
    if (!Object.keys(payload).length) { closeSheet(); return toast("Ничего не изменено"); }
    haptic();
    const btn = b.querySelector("#edSave");
    btn.disabled = true; btn.innerHTML = `<span class="sq-spin"></span> Сохраняю…`;
    try {
      await api("/listings/" + l.id, { method: "PATCH", body: payload });
      closeSheet(); notify("success"); toast("Сохранено ✓", "ok");
      renderListingDetail(l.id);
    } catch (e) {
      btn.disabled = false; btn.innerHTML = `${icon('check')} Сохранить`;
      toast("Ошибка: " + (e.message || e), "err");
    }
  };
}

/* ── Полноэкранная галерея фото объекта (свайп + смена обложки) ── */
function openGallery(id, count, startIdx, coverIdx) {
  let idx = startIdx || 0;
  let cover = coverIdx || 0;
  const ov = el(`<div class="gallery-ov">
    <div class="gal-top">
      <span class="gal-pos"></span>
      <button class="gal-close" aria-label="Закрыть">✕</button>
    </div>
    <div class="gal-stage">
      <div class="gal-blur-bg"></div>
      <button class="gal-nav prev" aria-label="Назад">‹</button>
      <img class="gal-img" alt="">
      <div class="gal-spin"><div class="spin"></div></div>
      <button class="gal-nav next" aria-label="Вперёд">›</button>
    </div>
    <div class="gal-bottom">
      <button class="btn btn-primary sm gal-cover">${icon('star')} Сделать обложкой</button>
    </div>
  </div>`);
  document.body.appendChild(ov);
  const img = ov.querySelector(".gal-img");
  const blurBg = ov.querySelector(".gal-blur-bg");
  const spin = ov.querySelector(".gal-spin");
  const pos = ov.querySelector(".gal-pos");
  const coverBtn = ov.querySelector(".gal-cover");
  const cacheHi = {};  // idx -> blob url (крупное 1000px)
  const cacheSm = {};  // idx -> blob url (мелкое 480px, для мгновенного показа)
  const setGalImg = (url) => { img.src = url; blurBg.style.backgroundImage = `url(${url})`; };

  async function show(i) {
    idx = (i + count) % count;
    const cur = idx;
    pos.textContent = `${idx + 1} / ${count}`;
    coverBtn.classList.toggle("is-cover", idx === cover);
    coverBtn.innerHTML = idx === cover ? icon('check')+" Это обложка" : icon('star')+" Сделать обложкой";
    coverBtn.disabled = idx === cover;
    // крупное уже в кэше — показываем сразу
    if (cacheHi[cur]) { setGalImg(cacheHi[cur]); img.classList.remove("lq"); spin.style.display = "none"; img.style.opacity = "1"; preload(cur); return; }
    // мгновенно показываем мелкое (из кэша или докачиваем), пока тянется крупное
    if (cacheSm[cur]) {
      setGalImg(cacheSm[cur]); img.classList.add("lq"); img.style.opacity = "1"; spin.style.display = "none";
    } else {
      img.style.opacity = "0"; spin.style.display = "flex";
      fetchImg(`/listings/${id}/photo/${cur}`).then(u => {
        cacheSm[cur] = u;
        if (idx === cur && !cacheHi[cur]) { setGalImg(u); img.classList.add("lq"); img.style.opacity = "1"; spin.style.display = "none"; }
      }).catch(() => {});
    }
    // докачиваем крупное и плавно заменяем мелкое
    try {
      const url = await fetchImg(`/listings/${id}/photo/${cur}?q=hi`);
      cacheHi[cur] = url;
      if (idx === cur) { setGalImg(url); img.classList.remove("lq"); img.style.opacity = "1"; }
    } catch (e) { if (idx === cur && !cacheSm[cur]) img.removeAttribute("src"); }
    spin.style.display = "none";
    preload(cur);
  }
  function preload(i) {
    for (const j of [i + 1, i - 1]) {
      const k = (j + count) % count;
      if (!cacheSm[k]) fetchImg(`/listings/${id}/photo/${k}`).then(u => cacheSm[k] = u).catch(() => {});
      if (!cacheHi[k]) fetchImg(`/listings/${id}/photo/${k}?q=hi`).then(u => cacheHi[k] = u).catch(() => {});
    }
  }
  // пока галерея открыта — гасим системный свайп-вниз Telegram (иначе он сворачивает
  // весь мини-апп вместо закрытия фото). Возвращаем при закрытии. Bot API 7.7+.
  try { tg?.disableVerticalSwipes?.(); } catch (e) {}
  const close = () => { try { tg?.enableVerticalSwipes?.(); } catch (e) {} ov.classList.add("closing"); setTimeout(() => ov.remove(), 180); };
  ov.querySelector(".gal-close").onclick = () => { haptic(); close(); };
  ov.querySelector(".prev").onclick = () => { haptic(); show(idx - 1); };
  ov.querySelector(".next").onclick = () => { haptic(); show(idx + 1); };
  coverBtn.onclick = async () => {
    haptic();
    try {
      await api(`/listings/${id}/cover`, { method: "POST", body: { idx } });
      cover = idx; notify("success"); toast("Обложка обновлена ✓", "ok");
      coverBtn.classList.add("is-cover"); coverBtn.innerHTML = icon('check')+" Это обложка"; coverBtn.disabled = true;
      // обновить обложку на карточке детали (она под галереей) — свежий URL с новым c=
      const dp = document.querySelector(".detail-photo");
      if (dp) fetchImg(`/listings/${id}/photo?q=hi&c=${idx}`).then(u => dp.src = u).catch(() => {});
    } catch (e) { toast("Не удалось сменить обложку", "err"); }
  };
  // свайпы: влево/вправо — листать; вниз — фото едет за пальцем и закрывается (как iOS).
  const stage = ov.querySelector(".gal-stage");
  let sx = 0, sy = 0, dragging = false, axis = null;
  const resetDrag = (animate) => {
    stage.style.transition = animate ? "transform .2s ease" : "";
    stage.style.transform = "";
    ov.style.background = "#000";
    if (animate) setTimeout(() => { stage.style.transition = ""; }, 220);
  };
  ov.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) { dragging = false; return; }
    const t = e.touches[0]; sx = t.clientX; sy = t.clientY; dragging = true; axis = null;
    stage.style.transition = "";
  }, { passive: true });
  ov.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    const t = e.touches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
    if (axis === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10))
      axis = Math.abs(dy) > Math.abs(dx) ? "v" : "h";
    if (axis === "v" && dy > 0) {
      // фото следует за пальцем + слегка уменьшается, фон тускнеет
      stage.style.transform = `translateY(${dy}px) scale(${Math.max(0.85, 1 - dy / 1100)})`;
      ov.style.background = `rgba(0,0,0,${Math.max(0, 1 - dy / (window.innerHeight * 0.6))})`;
    }
  }, { passive: true });
  ov.addEventListener("touchend", (e) => {
    if (!dragging) return;
    dragging = false;
    const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
    if (axis === "h" && Math.abs(dx) > 45) { resetDrag(false); haptic(); show(idx + (dx < 0 ? 1 : -1)); return; }
    if (axis === "v" && dy > 110) { haptic(); close(); return; }  // оттянул достаточно — закрыть
    resetDrag(true);  // мало — плавно вернуть на место
  }, { passive: true });
  show(idx);
}

/* ════════════════════════ ИСТОРИЯ ОТПРАВОК ════════════════════════ */
function fmtSent(s) {
  if (!s) return "";
  const d = new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
  if (isNaN(d)) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return "сегодня " + time;
  if (d.toDateString() === yest.toDateString()) return "вчера " + time;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + " " + time;
}

async function renderHistory() {
  setTitle("История", "что уже ушло клиентам");
  removeFab();
  loading();
  let items = []; try { items = await api("/history"); } catch (e) {}
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  if (!items.length) {
    wrap.appendChild(el(`<div class="empty"><span class="em-ic">${icon('refresh')}</span>Пока ничего не отправляли</div>`));
    view.appendChild(wrap); return;
  }
  wrap.appendChild(el(`<div class="muted" style="margin:2px 4px 12px">Последние ${items.length} отправок</div>`));
  for (const it of items) {
    const row = el(`
      <div class="card tap hist-row">
        <div class="client-row">
          <div class="hist-ic">${icon('send')}</div>
          <div class="client-main">
            <div class="client-name" style="font-size:15px">${fmtMoney(it.price)} ₽ · ${esc(roomsLabel(it.rooms) || "")}</div>
            <div class="client-crit">${listingTitle(it)}</div>
            <div class="hist-meta">→ <b>${esc(it.client_name || "клиент")}</b> · ${esc(fmtSent(it.sent_at))} · #${it.id}</div>
          </div>
          <div class="chev">›</div>
        </div>
      </div>`);
    row.onclick = () => { haptic(); go(() => renderListingDetail(it.id)); };
    wrap.appendChild(row);
  }
  view.appendChild(wrap);
}

/* ── ФДГ: публикация объявления на Arendok из ссылки Циан/Авито ── */
const AP_MAX = 3;
// активные poll-циклы по posting_id. При повторном заходе во вкладку ФДГ глушим
// старые (alive=false), иначе их опросы висят фоном и могут рисовать дубли.
const apStates = new Map();
function apTrack(state) {
  const prev = apStates.get(state.id);
  if (prev && prev !== state) prev.alive = false;
  apStates.set(state.id, state);
}
async function renderAutopost() {
  setTitle("ФДГ");
  removeFab();
  // глушим poll-циклы прошлого рендера (карточки пересоздаются с нуля ниже)
  apStates.forEach(s => { s.alive = false; });
  apStates.clear();
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);

  // ── Предупреждение: Arendok не подключён ──────────────────────────────────
  let ark = {}; try { ark = await api("/arendok/status"); } catch (e) {}
  if (!ark.connected && !ark.owner) {
    const warn = el(`<div style="background:rgba(255,107,107,.12);border:2px solid var(--red);border-radius:var(--radius);padding:14px 16px;margin-bottom:14px">
      <div style="font-weight:700;color:var(--red);font-size:15px;margin-bottom:4px">${icon('ban')} Arendok не подключён</div>
      <div style="font-size:13px;color:var(--txt-2);margin-bottom:12px">Без аккаунта Arendok объявление <b>не выложится</b> — парсинг запустится, но публикация упадёт с ошибкой. Сначала подключи профиль.</div>
      <button class="btn btn-danger" id="apGoProfile" style="width:100%">${icon('settings')} Подключить Arendok → Профиль</button>
    </div>`);
    wrap.appendChild(warn);
    // обработчик вешаем после appendChild
    setTimeout(() => {
      const b = document.getElementById("apGoProfile");
      if (b) b.onclick = () => { haptic(); switchTab("profile"); };
    }, 0);
  }

  wrap.appendChild(el(`<div class="card">
    <div class="ed-label">Ссылки Циан/Авито — до ${AP_MAX} штук</div>
    <textarea class="input" id="apUrls" rows="4" placeholder="https://www.cian.ru/rent/flat/...&#10;https://www.avito.ru/..." autocomplete="off" inputmode="url" style="min-height:88px;font-family:inherit"></textarea>
    <button class="btn btn-primary" id="apGo" style="margin-top:10px;width:100%">Обработать</button>
    <div class="muted" style="margin-top:8px">Обработаю все по очереди (парсинг + чистка фото). Перед публикацией каждого покажу превью — подтверждаешь сам.</div>
  </div>`));
  const bar = el(`<div style="margin-top:10px">
    <button class="btn btn-soft sm" id="apPubAll" style="width:100%">${icon('check')} Опубликовать все готовые</button>
  </div>`);
  wrap.appendChild(bar);
  const q = el(`<div id="apQueue" style="margin-top:12px"></div>`);
  wrap.appendChild(q);
  view.appendChild(wrap);

  // восстановить активные обработки (в очереди/парсятся/готовы) — чтобы при выходе
  // и возврате в ФДГ не терять состояние ссылок, что ещё крутятся.
  try {
    const r = await api("/autopost/list");
    for (const rec of (r.items || [])) apRestoreItem(rec, q);
  } catch (e) {}

  // B2: опубликовать все готовые превью — последовательно (бэкенд сериализует по owner-локу),
  // ждём завершения каждого для честного прогресса.
  $("#apPubAll").onclick = async () => {
    if (!ark.connected && !ark.owner) { notify("error"); return toast("Сначала подключи Arendok в «Профиле»", "err"); }
    let list; try { list = await api("/autopost/list"); } catch (e) { return toast("Не загрузить очередь", "err"); }
    const ready = (list.items || []).filter(r => r.status === "preview");
    if (!ready.length) return toast("Нет готовых превью", "err");
    if (!await confirmA(`Опубликовать все готовые превью (${ready.length})?`)) return;
    haptic();
    const btn = $("#apPubAll"); btn.disabled = true;
    let ok = 0, fail = 0, i = 0;
    for (const rec of ready) {
      i++; btn.innerHTML = `${icon('send-h')} Публикую ${i}/${ready.length}…`;
      try {
        await api(`/autopost/${rec.id}/publish`, { method: "POST" });
        let done = false;
        for (let k = 0; k < 40 && !done; k++) {
          await sleep(3000);
          let st; try { st = await api(`/autopost/${rec.id}`); } catch (e) { continue; }
          if (st.status === "done") { ok++; done = true; }
          else if (st.status === "error") { fail++; done = true; }
        }
        if (!done) fail++;
      } catch (e) { fail++; }
    }
    btn.disabled = false; btn.innerHTML = `${icon('check')} Опубликовать все готовые`;
    toast(`Готово: опубликовано ${ok}${fail ? ", ошибок " + fail : ""}`, fail ? "err" : "ok");
    renderAutopost();
  };

  $("#apGo").onclick = async () => {
    // гейт: без Arendok публикация всё равно упадёт — не запускаем впустую, ведём в Профиль
    if (!ark.connected && !ark.owner) {
      notify("error");
      toast("Сначала подключи Arendok в «Профиле»", "err");
      haptic(); setTimeout(() => switchTab("profile"), 1000);
      return;
    }
    const raw = ($("#apUrls").value || "").trim();
    if (!raw) return toast("Вставь хотя бы одну ссылку", "err");
    let urls = [...new Set(raw.split(/\s+/).map(s => s.trim()).filter(Boolean))];
    if (!urls.length) return toast("Не нашёл ссылок", "err");
    // Лимит 3 одновременно: спросим сервер сколько уже в работе и возьмём только свободные слоты
    // (так не плодим кривые карточки-ошибки, когда сервер отбивает лишнее).
    let activeNow = 0;
    try { activeNow = ((await api("/autopost/list")).items || []).length; } catch (e) {}
    const free = Math.max(0, AP_MAX - activeNow);
    if (free <= 0) { notify("error"); return toast(`Сейчас ${AP_MAX} ФДГ уже в работе — дождись, потом кидай новые`, "err"); }
    if (urls.length > free) { toast(`Можно ещё ${free} — беру первые ${free}`, "err"); urls = urls.slice(0, free); }
    haptic();
    const btn = $("#apGo"); btn.disabled = true;
    $("#apUrls").value = "";
    for (const url of urls) await apEnqueueOne(url, q);
    btn.disabled = false;
  };
}

// Статус карточки ФДГ: SVG-иконка + текст (без эмодзи). cls: '' | 'ok' | 'err'
function apSt(stEl, name, txt, cls) {
  if (!stEl) return;
  const col = cls === "ok" ? "var(--green)" : cls === "err" ? "var(--red)" : "var(--txt-2)";
  stEl.innerHTML = `<span style="color:${col};display:inline-flex;align-items:center;gap:4px">${icon(name)} ${esc(txt)}</span>`;
}

function apBuildItem(url, q) {
  const state = { alive: true, id: null, published: false };
  const item = el(`<div class="card ap-item fade-in">
    <div class="row-between" style="gap:8px;align-items:flex-start">
      <div class="muted ap-url" style="word-break:break-all;flex:1;font-size:12px">${esc(url || "")}</div>
      <div style="display:flex;align-items:center;gap:6px;white-space:nowrap">
        <span class="ap-st" style="font-size:12px"><span style="color:var(--txt-2);display:inline-flex;align-items:center;gap:4px">${icon('clock')} в очереди</span></span>
        <button class="ap-rm" title="Убрать из очереди" style="background:none;border:none;color:var(--txt-2);font-size:17px;line-height:1;cursor:pointer;padding:0 2px">${icon('x')}</button>
      </div>
    </div>
    <div class="ap-body"></div>
  </div>`);
  q.appendChild(item);
  const stEl = item.querySelector(".ap-st");
  const body = item.querySelector(".ap-body");
  item.querySelector(".ap-rm").onclick = async () => {
    if (state.published) return toast("Уже опубликовано — из очереди не убрать", "err");
    haptic();
    state.alive = false;
    if (state.id != null) { try { await api(`/autopost/${state.id}/cancel`, { method: "POST" }); } catch (e) {} }
    item.remove();
    toast("Убрано из очереди", "ok");
  };
  return { state, item, stEl, body };
}

async function apEnqueueOne(url, q) {
  const { state, item, stEl, body } = apBuildItem(url, q);
  try {
    const r = await api("/autopost/prepare", { method: "POST", body: { url } });
    state.id = r.id;
    apTrack(state);
  } catch (e) {
    apSt(stEl, 'alert', (e.message || e), "err");
    item.style.borderColor = "var(--red)";
    return;
  }
  if (!state.alive) { try { await api(`/autopost/${state.id}/cancel`, { method: "POST" }); } catch (e) {} return; }
  apSt(stEl, 'loader', "обрабатываю…");
  apPollItem(state, stEl, body);  // fire-and-forget: каждый элемент опрашивается параллельно
}

// Восстановить карточку уже идущей обработки (при повторном заходе в ФДГ).
async function apRestoreItem(rec, q) {
  const { state, stEl, body } = apBuildItem(rec.url, q);
  state.id = rec.id;
  apTrack(state);
  // превью готово и данные пришли прямо в списке → рисуем сразу, без второго запроса
  if (rec.status === "preview" && rec.data) {
    apSt(stEl, 'check', "готово", "ok");
    return apRenderPreview(state, rec, body, stEl);
  }
  // processing Stage B (публикация) — запускаем apPollDone вместо apPollItem
  if (rec.status === "processing" && rec.publishing) {
    apSt(stEl, 'send-h', "публикую…");
    state.published = true;
    body.innerHTML = `<div class="muted" style="margin-top:8px"><span class="sq-spin"></span> Публикую на arendok.ru… ~минуту.</div>`;
    apPollDone(state, stEl, body);
    return;
  }
  apSt(stEl, 'loader', "обрабатываю…");
  apPollItem(state, stEl, body);  // ещё в работе → опрашиваем, превью нарисуется само
}

async function apPollItem(state, stEl, body) {
  for (let i = 0; i < 80; i++) {
    await sleep(3000);
    if (!state.alive) return;
    let st;
    try { st = await api(`/autopost/${state.id}`); } catch (e) { continue; }
    if (!state.alive) return;
    if (st.status === "processing") {
      if (st.publishing) {
        // перешли в Stage B (публикация) — переключаемся на apPollDone
        apSt(stEl, 'send-h', "публикую…");
        state.published = true;
        body.innerHTML = `<div class="muted" style="margin-top:8px"><span class="sq-spin"></span> Публикую на arendok.ru… ~минуту.</div>`;
        return apPollDone(state, stEl, body);
      }
      apSt(stEl, 'loader', "парсинг + фото…"); continue;
    }
    if (st.status === "preview") { apSt(stEl, 'check', "готово", "ok"); return apRenderPreview(state, st, body, stEl); }
    if (st.status === "error") {
      apSt(stEl, 'alert', "ошибка", "err");
      body.innerHTML = `<div class="muted" style="color:var(--red);margin-top:6px">${esc(st.error || "ошибка")}</div>`;
      return;
    }
    if (st.status === "done") { apSt(stEl, 'check', "опубликовано", "ok"); return; }
  }
  apSt(stEl, 'clock', "долго…");
}

function apRenderPreview(state, st, body, stEl) {
  const id = state.id;
  const d = st.data || {};
  const rooms = d.rooms === 0 ? "Студия" : (d.rooms ? d.rooms + "к" : "?к");
  const L = [];
  const addr = [d.street, d.house_number].filter(Boolean).join(" ");
  if (addr) L.push(`${icon('map-pin')} ${esc(addr)}`);
  if (d.metro) L.push(`${icon('train')} ${esc(d.metro)}`);
  if (d.district) L.push(`${icon('building')} ${esc(d.district)}`);
  if (d.jk_name) L.push(`${icon('building2')} ЖК ${esc(d.jk_name)}`);
  if (d.floor) L.push(`${icon('layers')} Этаж ${d.floor}/${d.total_floors || "?"}`);
  if (d.bath_count) L.push(`${icon('shower')} Санузлов: ${d.bath_count}`);
  if (d.deposit) L.push(`${icon('briefcase')} Залог: ${esc(d.deposit)}`);
  if (d.owner_phone) L.push(`${icon('phone')} ${esc(d.owner_phone)}${d.owner_name ? " (" + esc(d.owner_name) + ")" : ""}`);
  body.innerHTML = `
    <div style="font-weight:680;font-size:15px;margin-top:8px">${esc(d.title || "Объявление")}</div>
    <div class="muted" style="margin:3px 0 8px">${rooms} • ${d.area || "?"} м² • ${fmtMoney(d.price)} ₽/мес</div>
    <div style="font-size:13px;line-height:1.75">${L.join("<br>")}</div>
    <div class="ap-photos" id="apPhotos-${id}"></div>
    <div class="muted" style="margin-top:6px">${icon('image')} Чистых фото: ${st.photos || 0}</div>
    <div style="margin-top:12px">
      <div class="muted" style="margin-bottom:4px;font-size:12px">${icon('pencil')} Внутреннее описание для агентов <span style="opacity:.5">(опционально)</span></div>
      <textarea id="apNotes-${id}" rows="3" style="width:100%;box-sizing:border-box;background:var(--card);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:8px;font-size:13px;resize:vertical" placeholder="Ванна раздельная, бонус агенту 50%, хозяева готовы торговаться…">${esc(st.agent_notes || "")}</textarea>
      <button class="btn btn-soft sm" id="apSaveNotes-${id}" style="margin-top:4px;width:100%">Сохранить описание</button>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-primary" id="apPub-${id}" style="flex:1">${icon('check')} Опубликовать</button>
      <button class="btn btn-soft" id="apCancel-${id}">Отмена</button>
    </div>`;
  const ph = body.querySelector(`#apPhotos-${id}`);
  const n = Math.min(st.photos || 0, 6);
  for (let i = 0; i < n; i++) {
    const im = el(`<div class="ap-thumb"></div>`);
    ph.appendChild(im);
    fetchImg(`/autopost/${id}/photo/${i}`).then(u => { im.style.backgroundImage = `url(${u})`; }).catch(() => {});
  }
  body.querySelector(`#apSaveNotes-${id}`).onclick = async () => {
    haptic();
    const notes = body.querySelector(`#apNotes-${id}`)?.value || "";
    const btn = body.querySelector(`#apSaveNotes-${id}`);
    try {
      await api(`/autopost/${id}/notes`, { method: "POST", body: { agent_notes: notes } });
      btn.innerHTML = `${icon('check')} Сохранено`;
      setTimeout(() => { if (btn) btn.textContent = "Сохранить описание"; }, 1800);
    } catch (e) { notify("error"); btn.innerHTML = `${icon('alert')} Ошибка`; setTimeout(() => { if (btn) btn.textContent = "Сохранить описание"; }, 1800); }
  };
  body.querySelector(`#apPub-${id}`).onclick = async () => {
    haptic();
    // автосохранение заметки агента перед публикацией
    const notes = body.querySelector(`#apNotes-${id}`)?.value || "";
    if (notes.trim()) {
      try { await api(`/autopost/${id}/notes`, { method: "POST", body: { agent_notes: notes } }); } catch (e) {}
    }
    state.published = true;
    apSt(stEl, 'send-h', "публикую…");
    body.innerHTML = `<div class="muted" style="margin-top:8px"><span class="sq-spin"></span> Публикую на arendok.ru… ~минуту.</div>`;
    try { await api(`/autopost/${id}/publish`, { method: "POST" }); }
    catch (e) { state.published = false; apSt(stEl, 'alert', "ошибка", "err"); body.innerHTML = `<div class="muted" style="color:var(--red);margin-top:6px">${esc(e.message || e)}</div>`; return; }
    apPollDone(state, stEl, body);
  };
  body.querySelector(`#apCancel-${id}`).onclick = async () => {
    haptic();
    state.alive = false;
    try { await api(`/autopost/${id}/cancel`, { method: "POST" }); } catch (e) {}
    apSt(stEl, 'x', "отменено");
    body.innerHTML = "";
  };
}

async function apPollDone(state, stEl, body) {
  for (let i = 0; i < 80; i++) {
    await sleep(3000);
    if (!state.alive) return;  // вкладку пересоздали — этот цикл больше не нужен
    let st;
    try { st = await api(`/autopost/${state.id}`); } catch (e) { continue; }
    if (st.status === "done") {
      apSt(stEl, 'check', "опубликовано", "ok");
      body.innerHTML = `<div style="margin-top:8px;color:var(--green);display:flex;align-items:center;gap:6px">${icon('check')} <b>Опубликовано!</b>${st.arendok_url ? `<br><a href="${esc(st.arendok_url)}" target="_blank" style="color:var(--accent);word-break:break-all">${esc(st.arendok_url)}</a>` : ""}</div>`;
      if (typeof notify === "function") notify("success");
      return;
    }
    if (st.status === "error") {
      apSt(stEl, 'alert', "ошибка", "err");
      body.innerHTML = `<div class="muted" style="color:var(--red);margin-top:6px">${esc(st.error || "ошибка")}</div>`;
      return;
    }
  }
  apSt(stEl, 'clock', "долго…");
}

/* ════════════════════════ SEARCH ════════════════════════ */
let searchState = { text: "", results: [], page: 0, hasMore: false, sel: new Set(), filters: null, applied: null };
let searchSource = "all";       // all | exclusives | arendok
let searchOnlyJk = false;       // показывать только объекты с заполненным ЖК
let searchCommMax = null;       // null=любая | 0=без комиссии | 50=до 50%

// ── История поиска (последние текстовые запросы, локально в браузере) ──────────
const SHIST_KEY = "arendbot_search_hist";
function getSearchHist() { try { return JSON.parse(localStorage.getItem(SHIST_KEY) || "[]"); } catch (e) { return []; } }
function pushSearchHist(text) {
  text = (text || "").trim(); if (!text) return;
  let h = getSearchHist().filter(x => x !== text);
  h.unshift(text); h = h.slice(0, 8);
  try { localStorage.setItem(SHIST_KEY, JSON.stringify(h)); } catch (e) {}
}
function clearSearchHist() { try { localStorage.removeItem(SHIST_KEY); } catch (e) {} }
// Перерисовать чипы недавних запросов в контейнер #sHist (клик — повторить поиск).
function paintSearchHist() {
  const box = $("#sHist"); if (!box) return;
  const h = getSearchHist();
  if (!h.length) { box.innerHTML = ""; return; }
  box.innerHTML = `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
    <span class="muted" style="font-size:12px">Недавние:</span>
    ${h.map(t => `<span class="shist-chip" data-q="${esc(t)}" style="display:inline-block;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:5px 10px;border:1px solid var(--line);border-radius:14px;font-size:13px;cursor:pointer;background:var(--card)">${esc(t)}</span>`).join("")}
    <span class="shist-clear" style="font-size:12px;color:var(--muted);cursor:pointer;padding:5px 4px">Очистить</span>
  </div>`;
  box.querySelectorAll(".shist-chip").forEach(c => c.onclick = () => {
    haptic(); const ta = $("#sInput"); if (ta) ta.value = c.dataset.q; runSearch();
  });
  const clr = box.querySelector(".shist-clear");
  if (clr) clr.onclick = () => { haptic(); clearSearchHist(); paintSearchHist(); };
}
let searchSort = "";            // ""=по релевантности | price_asc/desc | area_asc/desc | new | jk
const SRC_LABEL = { all: "Все папки", exclusives: "Эксклюзивы", arendok: "Arendok" };
const COMM_LABEL = (v) => v === null ? "Комиссия: любая" : v === 0 ? "Без комиссии" : "Комиссия до " + v + "%";
const SORT_OPTS = [
  ["", "По релевантности"],
  ["price_asc", "Сначала дешёвые"],
  ["price_desc", "Сначала дорогие"],
  ["area_asc", "Площадь: меньше"],
  ["area_desc", "Площадь: больше"],
  ["new", "Сначала новые"],
  ["jk", "По ЖК (А-Я)"],
];
const SORT_LABEL = (v) => "Сорт: " + ((SORT_OPTS.find(o => o[0] === v) || SORT_OPTS[0])[1]);
function searchChipBody() {
  const b = {};
  if (searchSource && searchSource !== "all") b.source = searchSource;
  if (searchCommMax !== null) b.commission_max = searchCommMax;
  if (searchSort) b.sort = searchSort;
  if (searchOnlyJk) b.only_jk = 1;
  return b;
}
/* ── Единая панель фильтров: ОДИНАКОВАЯ в «Объектах» и «Поиске» ──
   ctx: getSource/setSource, getComm/setComm, getSort/setSort,
        advActive(), advSummary(), onAdv(), onAdvClear(), onChange() */
function filterControlsEl(ctx) {
  const box = el(`<div></div>`);
  function paint() {
    box.innerHTML = "";
    const advOn = ctx.advActive();
    const src = ctx.getSource(), comm = ctx.getComm(), sort = ctx.getSort();
    const onlyJk = ctx.getOnlyJk ? ctx.getOnlyJk() : false;
    const dot = `<span class="mc-dot"></span>`;
    const row = el(`<div class="mini-row">
      <button class="mini-chip ${advOn ? "act" : ""}" data-adv title="Расширенные фильтры">${icon('sliders')}${advOn ? dot : ""}</button>
      <button class="mini-chip ${src !== "all" ? "act" : ""}" data-msrc title="Источник">${icon('folder')}${src !== "all" ? dot : ""}</button>
      <button class="mini-chip ${comm !== null ? "act" : ""}" data-mcomm title="Комиссия">${icon('percent')}${comm !== null ? dot : ""}</button>
      <button class="mini-chip ${sort ? "act" : ""}" data-msort title="Сортировка">${icon('sort')}${sort ? dot : ""}</button>
      <button class="mini-chip ${onlyJk ? "act" : ""}" data-mjk title="Только с ЖК">${icon('building')}${onlyJk ? dot : ""}</button>
      ${advOn ? `<button class="mini-chip" data-advc title="Сбросить фильтры">${icon('x')}</button>` : ""}
    </div>`);
    box.appendChild(row);
    row.querySelector("[data-adv]").onclick = () => { haptic(); ctx.onAdv(); };
    const ac = row.querySelector("[data-advc]"); if (ac) ac.onclick = () => { haptic(); ctx.onAdvClear(); };
    row.querySelector("[data-msrc]").onclick = () => { haptic(); sheetPick("Источник объявлений",
      [["all", "Все папки"], ["exclusives", "Эксклюзивы"], ["arendok", "Arendok"]],
      src, (v) => { ctx.setSource(v); paint(); ctx.onChange(); }); };
    row.querySelector("[data-mcomm]").onclick = () => { haptic(); sheetPick("Комиссия",
      [["", "Любая"], ["0", "Без комиссии"], ["50", "До 50%"]],
      comm === null ? "" : String(comm), (v) => { ctx.setComm(v); paint(); ctx.onChange(); }); };
    row.querySelector("[data-msort]").onclick = () => { haptic(); sheetPick("Сортировка", SORT_OPTS,
      sort, (v) => { ctx.setSort(v); paint(); ctx.onChange(); }); };
    const jb = row.querySelector("[data-mjk]");
    if (jb) jb.onclick = () => { haptic(); ctx.setOnlyJk(!onlyJk); paint(); ctx.onChange(); };
  }
  paint();
  return box;
}
async function renderSearch() {
  setTitle("Поиск", "по всей базе объявлений");
  removeFab();
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in search-wrap"></div>`);
  wrap.innerHTML = `
    <div class="field">
      <textarea class="input" id="sInput" placeholder="Напишите или надиктуйте: «2к юго-запад до 150», «студия у метро Фили 60 метров»…">${esc(searchState.text)}</textarea>
    </div>
    <div class="btn-row">
      <span id="sVoice" style="flex:1;display:flex"></span>
      <button class="btn btn-primary" id="sGo" style="flex:1.4">${icon('search')} Найти</button>
      <button class="btn btn-soft" id="sReset" title="Очистить и начать новый запрос" style="flex:0 0 52px;width:52px;padding:14px 0">✕</button>
    </div>
    <div id="sHist" style="margin-top:10px"></div>
    <div id="sFilterBar" style="margin-top:10px"></div>
    <div class="idsearch" style="margin-top:10px">
      <input class="input" id="lidInput" inputmode="numeric" placeholder="Открыть объект по номеру: #776">
      <button class="btn btn-soft sm" id="lidGo">Открыть</button>
    </div>
    <div id="sResults" style="margin-top:18px"></div>`;
  view.appendChild(wrap);
  $("#sVoice").replaceWith(voiceButton((text) => {
    const ta = $("#sInput"); ta.value = ta.value ? (ta.value + " " + text) : text; runSearch();
  }, icon('mic')+" Голосом"));
  $("#sGo").onclick = runSearch;
  function reSearch() {
    if (searchState.text) runSearch();
    else if (searchState.filters) applySearchFilters(searchState.filters);
  }
  $("#sFilterBar").appendChild(filterControlsEl({
    getSource: () => searchSource, setSource: (v) => { searchSource = v; },
    getComm: () => searchCommMax, setComm: (v) => { searchCommMax = v === "" ? null : parseInt(v); },
    getSort: () => searchSort, setSort: (v) => { searchSort = v; },
    getOnlyJk: () => searchOnlyJk, setOnlyJk: (v) => { searchOnlyJk = v; },
    advActive: () => filtersActive(searchState.filters || critToFilters(searchState.applied)),
    advSummary: () => { const f = searchState.filters || critToFilters(searchState.applied); return filtersActive(f) ? filtersSummary(f) : ""; },
    onAdv: () => sheetFilters(searchState.filters || critToFilters(searchState.applied), applySearchFilters),
    onAdvClear: () => { searchState.filters = null; searchState.applied = null; renderSearch(); },
    onChange: () => reSearch(),
  }));
  $("#sReset").onclick = () => {
    haptic();
    searchState = { text: "", results: [], page: 0, hasMore: false, sel: new Set(), filters: null, applied: null };
    searchSource = "all"; searchCommMax = null; searchSort = ""; searchOnlyJk = false;
    renderSearch();
    const ta = $("#sInput"); if (ta) ta.focus();
  };
  const openById = () => {
    const raw = ($("#lidInput").value || "").replace(/\D/g, "");
    if (!raw) return toast("Введите номер объявления");
    haptic(); go(() => renderListingDetail(parseInt(raw)));
  };
  $("#lidGo").onclick = openById;
  $("#lidInput").addEventListener("keydown", (e) => { if (e.key === "Enter") openById(); });
  setRevealMenu($("#sFilterBar"));  // панель фильтров всплывает при скролле вверх (как в Объектах)
  paintSearchHist();
  if (searchState.results.length) paintSearch();
}
async function runSearch() {
  const text = $("#sInput").value.trim();
  if (!text) return toast("Напишите критерии");
  pushSearchHist(text); paintSearchHist();
  haptic(); searchState = { text, results: [], page: 0, hasMore: false, sel: new Set(), filters: null, applied: null };
  $("#sResults").innerHTML = `<div class="loader"><div class="spin"></div></div>`;
  let data; try { data = await api("/search", { method: "POST", body: { text, page: 0, ...searchChipBody() } }); }
  catch (e) { return toast("Ошибка поиска", "err"); }
  searchState.results = data.listings; searchState.hasMore = data.has_more;
  searchState.crit = data.criteria; searchState.total = data.total; searchState.applied = data.applied;
  paintSearch();
}
// Применить структурные фильтры (раздельные район/метро) как поиск
async function applySearchFilters(f) {
  haptic(); searchState = { text: "", results: [], page: 0, hasMore: false, sel: new Set(), filters: f, applied: null };
  $("#sResults").innerHTML = `<div class="loader"><div class="spin"></div></div>`;
  let data; try { data = await api("/search", { method: "POST", body: { filters: f, page: 0, ...searchChipBody() } }); }
  catch (e) { return toast("Ошибка поиска", "err"); }
  searchState.results = data.listings; searchState.hasMore = data.has_more;
  searchState.crit = data.criteria; searchState.total = data.total; searchState.applied = data.applied;
  paintSearch();
}
function paintSearch() {
  const box = $("#sResults"); box.innerHTML = "";
  box.appendChild(el(`<div class="muted" style="margin:0 4px 10px">${esc(searchState.crit || "")} — найдено ${searchState.total}</div>`));
  if (!searchState.results.length) { box.appendChild(el(`<div class="empty"><span class="em-ic">${icon('search')}</span>Ничего не нашлось</div>`)); return; }

  // sticky-бар: появляется, как только отметил галочкой ≥1 объявление
  const selBar = el(`<div class="sel-bar hidden"></div>`);
  box.appendChild(selBar);
  const rows = el(`<div></div>`); box.appendChild(rows);

  function refreshBar() {
    if (!searchState.sel.size) { selBar.classList.add("hidden"); return; }
    selBar.classList.remove("hidden");
    selBar.innerHTML = `
      <button class="btn btn-green sm" style="flex:1" data-multisend>${icon('send-h')} Отправить выбранные (${searchState.sel.size}) одному</button>
      <button class="btn btn-soft sm" data-multiclear>Сброс</button>`;
    selBar.querySelector("[data-multisend]").onclick = () => {
      const chosen = searchState.results.filter(l => searchState.sel.has(l.id));
      haptic(); sheetClientPicker((cid, cname) => { searchState.sel.clear(); sendSelected(chosen, cid, cname); });
    };
    selBar.querySelector("[data-multiclear]").onclick = () => { haptic(); searchState.sel.clear(); renderRows(); };
  }
  function toggle(id) {
    searchState.sel.has(id) ? searchState.sel.delete(id) : searchState.sel.add(id);
    renderRows();
  }
  function renderRows() {
    rows.innerHTML = "";
    for (const l of searchState.results) {
      rows.appendChild(listingCard(
        l,
        () => sheetClientPicker((cid, cname) => sendListing(l, cid, cname)),
        true, true,
        { checked: searchState.sel.has(l.id), onToggle: () => toggle(l.id) },
      ));
    }
    refreshBar();
  }
  renderRows();
  if (searchState.hasMore) {
    const more = el(`<button class="btn btn-soft more-btn" style="margin-top:6px">Ещё варианты</button>`);
    more.onclick = async () => {
      haptic(); const p = searchState.page + 1;
      const body = searchState.filters ? { filters: searchState.filters, page: p, ...searchChipBody() } : { text: searchState.text, page: p, ...searchChipBody() };
      const d = await api("/search", { method: "POST", body });
      searchState.page = p; searchState.results.push(...d.listings); searchState.hasMore = d.has_more; paintSearch();
    };
    box.appendChild(more);
  }
}

/* ════════════════════════ Отправка ════════════════════════ */
function notConnectedPrompt() {
  notify("error");
  toast("Сначала подключите свой Telegram в «Профиле»", "err");
  setTimeout(() => switchTab("profile"), 1000);
}

/* ── Очередь отправки: видно, что грузятся и уходят, + окно ОТМЕНЫ перед отправкой ── */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SEND_GRACE = 3000;  // короткое окно отмены (не ETA отправки — отправка идёт уже после)
let sendQ = [], sendQSeq = 0, sendQWorking = false;

function enqueueSend(l, clientId, clientName) {
  sendQ.push({
    id: ++sendQSeq, lid: l.id, clientId, client: clientName || "клиенту",
    title: `${fmtMoney(l.price)} ₽ · ${listingTitle(l)}`,
    status: "pending", sendAt: Date.now() + SEND_GRACE,
  });
  // греем тяжёлые ассеты прямо сейчас (в окно отмены 5с) → отправка будет мгновенной
  api(`/listings/${l.id}/prewarm`, { method: "POST", body: {} }).catch(() => {});
  renderSendQ(); pumpSendQ();
}
function enqueueMany(listings, clientId, clientName) {
  for (const l of listings) enqueueSend(l, clientId, clientName);
}

function cancelSend(id) {
  const i = sendQ.findIndex(x => x.id === id && x.status === "pending");
  if (i < 0) return;
  sendQ.splice(i, 1);
  haptic(); toast("Отправка отменена", "ok"); renderSendQ();
}
function cancelAllPending() {
  sendQ = sendQ.filter(x => x.status !== "pending");
  haptic(); toast("Отправка отменена", "ok"); renderSendQ();
}

async function pumpSendQ() {
  if (sendQWorking) return;
  sendQWorking = true;
  for (;;) {
    const item = sendQ.find(x => x.status === "pending");
    if (!item) break;
    // окно отмены: ждём истечения таймера (или пока вариант отменят/уберут)
    while (sendQ.includes(item) && item.status === "pending" && Date.now() < item.sendAt) {
      renderSendQ();
      await sleep(300);
    }
    if (!sendQ.includes(item) || item.status !== "pending") continue;  // отменили
    item.status = "send"; renderSendQ();
    try {
      const r = await api("/send", { method: "POST", body: { client_id: item.clientId, listing_id: item.lid } });
      item.status = r.sent ? "ok" : "err";
      if (r.sent) notify("success");
    } catch (e) {
      item.status = "err";
      if (e.message === "not_connected") {
        item.note = "нет аккаунта";
        sendQ.forEach(x => { if (x.status === "pending") { x.status = "err"; x.note = "нет аккаунта"; } });
        renderSendQ(); sendQWorking = false; notConnectedPrompt(); return;
      }
    }
    renderSendQ();
    // небольшая пауза между реальными отправками — бережём лимит Telegram
    if (sendQ.some(x => x.status === "pending" && Date.now() >= x.sendAt)) await sleep(900);
  }
  sendQWorking = false;
  renderSendQ();
}

function sendQClearDone() {
  sendQ = sendQ.filter(x => x.status === "pending" || x.status === "send");
  renderSendQ();
}

function renderSendQ() {
  let panel = $("#sendq");
  if (!sendQ.length) {
    if (panel) { panel.classList.add("leaving"); const p = panel; setTimeout(() => { if (p.classList.contains("leaving")) p.remove(); }, 220); }
    view.style.paddingBottom = ""; return;
  }
  if (panel) panel.classList.remove("leaving");  // снова появились задачи — отменяем уход
  if (!panel) {
    panel = el(`<div id="sendq"></div>`);
    $("#app").appendChild(panel);
  }
  const pending = sendQ.filter(x => x.status === "pending");
  const sending = sendQ.filter(x => x.status === "send").length;
  const ok = sendQ.filter(x => x.status === "ok").length;
  const err = sendQ.filter(x => x.status === "err").length;
  const ic = { pending: icon('clock'), send: icon('send'), ok: icon('check'), err: icon('x') };
  let head, headBtn = "";
  if (pending.length) {
    const secs = Math.max(0, Math.ceil((Math.min(...pending.map(p => p.sendAt)) - Date.now()) / 1000));
    head = `Можно отменить · ${secs} с`;
    headBtn = `<button class="sq-x danger" id="sqCancelAll">Отменить${pending.length > 1 ? " все" : ""}</button>`;
  } else if (sending) {
    head = `Отправляю…${sending > 1 ? " (" + sending + ")" : ""}`;
  } else {
    head = `Готово · отправлено ${ok}${err ? ", ошибок " + err : ""}`;
    headBtn = `<button class="sq-x" id="sqClose">Скрыть</button>`;
  }
  const spin = (pending.length || sending) ? '<span class="sq-spin"></span>' : icon('send-h');
  panel.innerHTML = `
    <div class="sq-head">
      <span class="sq-title">${spin} ${esc(head)}</span>
      ${headBtn}
    </div>
    <div class="sq-list">
      ${sendQ.slice(-6).map(x => `
        <div class="sq-row ${x.status}">
          <span class="sq-ic">${ic[x.status]}</span>
          <span class="sq-info"><span class="sq-name">${esc(x.title)}</span>
          <span class="sq-sub">→ ${esc(x.client)}${x.note ? " · " + esc(x.note) : ""}</span></span>
          ${x.status === "pending" ? `<button class="sq-cancel" data-cancel="${x.id}">Отменить</button>` : ""}
        </div>`).join("")}
    </div>`;
  const ca = panel.querySelector("#sqCancelAll");
  if (ca) ca.onclick = () => cancelAllPending();
  const cl = panel.querySelector("#sqClose");
  if (cl) cl.onclick = () => { haptic(); sendQClearDone(); };
  panel.querySelectorAll("[data-cancel]").forEach(b =>
    b.onclick = () => cancelSend(parseInt(b.dataset.cancel)));
  // панель фиксирована снизу и перекрывала бы низ списка (в т.ч. кнопку «Ещё») —
  // добавляем прокрутке отступ на высоту панели, чтобы до всего можно было долистать
  view.style.paddingBottom = (panel.offsetHeight + 26) + "px";
}

function sendListing(l, clientId, clientName) {
  enqueueSend(l, clientId, clientName);
}
// Отправить выбранные объекты одному клиенту (объекты передаём напрямую)
function sendSelected(listings, clientId, clientName) {
  closeSheet();
  enqueueMany(listings, clientId, clientName);
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
    row.onclick = () => { haptic(); closeSheet(); onPick(c.id, c.name); };
    list.appendChild(row); lazyAvatar(row.querySelector("[data-av]"), c);
  }
}

function sheetAddClient() {
  const b = openSheet(`<div class="sheet-title">Новый клиент</div>
    <div class="field"><label>Имя</label><input class="input" id="nName" placeholder="Например, Вероника"></div>
    <div class="field"><label>Telegram</label><input class="input" id="nUser" placeholder="@username или id"></div>
    <div class="field"><label>Критерии (необязательно)</label>
    <textarea class="input" id="nCrit" placeholder="2к юго-запад до 150, с животными"></textarea>
    <div class="btn-row" style="margin-top:8px"><span id="nVoice" style="flex:1;display:flex"></span></div></div>
    <button class="btn btn-primary" id="nSave">Создать клиента</button>`);
  b.querySelector("#nVoice").replaceWith(voiceButton((text) => {
    const ta = b.querySelector("#nCrit"); ta.value = ta.value ? (ta.value + " " + text) : text;
  }, icon('mic')+" Надиктовать критерии"));
  const saveBtn = b.querySelector("#nSave");
  saveBtn.onclick = async () => {
    if (saveBtn.disabled) return;            // защита от двойного тапа → дублей клиентов
    const name = b.querySelector("#nName").value.trim();
    if (!name) return toast("Введите имя");
    haptic();
    saveBtn.disabled = true; saveBtn.textContent = "Создаю…";
    const body = { name };
    const u = b.querySelector("#nUser").value.trim();
    if (u) { if (/^-?\d+$/.test(u.replace("@", ""))) body.telegram_id = parseInt(u.replace("@", "")); else body.telegram_username = u; }
    try {
      const r = await api("/clients", { method: "POST", body });
      const crit = b.querySelector("#nCrit").value.trim();
      if (crit) await api(`/clients/${r.id}/criteria`, { method: "POST", body: { text: crit } });
      closeSheet(); notify("success"); toast("Клиент создан ✓", "ok");
      switchTab("clients");
    } catch (e) { saveBtn.disabled = false; saveBtn.textContent = "Создать клиента"; toast("Ошибка: " + e.message, "err"); }
  };
}

const ROOM_OPTS = [["студия", "Студия"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5+"]];
const ZONE_CHIPS = [["центр", "Центр"], ["север", "Север"], ["юг", "Юг"], ["запад", "Запад"],
  ["восток", "Восток"], ["северо-запад", "С-З"], ["северо-восток", "С-В"],
  ["юго-запад", "Ю-З"], ["юго-восток", "Ю-В"]];

async function applyCritText(cid, text) {
  await api(`/clients/${cid}/criteria`, { method: "POST", body: { text } });
}

/* ── Редактор фильтров (раздельные район/метро — без путаницы) ── */
function critToFilters(c) {
  c = c || {};
  return {
    rooms: c.rooms || "",
    budget_min: c.budget_min || "", budget_max: c.budget_max || "",
    area_min: c.area_min || "", area_max: c.area_max || "",
    district: c.districts || "", metro: c.metro_stations || "", jk: c.jk_name || "",
    geo: (c.geo_points && c.geo_points.length) ? c.geo_points : null,
  };
}
// нормализованный список обведённых контуров: новый ключ polygons[] или legacy polygon
function getPolys(f) {
  if (!f) return [];
  if (Array.isArray(f.polygons)) return f.polygons.filter(p => Array.isArray(p) && p.length >= 3);
  if (Array.isArray(f.polygon) && f.polygon.length >= 3) return [f.polygon];  // обратная совместимость
  return [];
}
function hasArea(f) { return getPolys(f).length > 0; }
function hasGeo(f) { return !!(f && Array.isArray(f.geo) && f.geo.length); }
function filtersActive(f) {
  return !!(f && (f.rooms || f.budget_min || f.budget_max || f.area_min || f.area_max || f.district || f.metro || f.jk || hasArea(f) || hasGeo(f) || f.commission_max != null));
}
function filtersSummary(f) {
  if (!f) return "";
  const p = [];
  if (f.rooms) p.push(roomsLabel(f.rooms));
  if (f.budget_min || f.budget_max) p.push((f.budget_min ? Math.round(f.budget_min / 1000) + "" : "до ") + (f.budget_max ? "–" + Math.round(f.budget_max / 1000) + "к" : "к+"));
  if (f.area_min || f.area_max) p.push((f.area_min || 0) + "–" + (f.area_max || "∞") + " м²");
  if (f.jk) p.push(icon('building')+" " + esc(f.jk));
  if (f.district) p.push(icon('map-pin')+" " + esc(f.district));
  if (f.metro) p.push(icon('train')+" " + esc(f.metro));
  if (hasGeo(f)) { const g = f.geo[0]; p.push(icon('compass')+" " + esc(g.address || g.label || "точка") + (g.max_minutes ? " ≤" + g.max_minutes + "м" : "")); }
  if (hasArea(f)) { const n = getPolys(f).length; p.push(icon('map')+" " + (n > 1 ? n + " области" : "область")); }
  if (f.commission_max === 0) p.push(icon('percent')+" без комиссии");
  else if (f.commission_max != null) p.push(icon('percent')+" до " + f.commission_max + "%");
  return p.join(" · ");
}
function sheetFilters(init, onApply) {
  init = init || {};
  let polys = getPolys(init);
  const curRooms = new Set(String(init.rooms || "").split(",").map(s => s.trim()).filter(Boolean));
  const b = openSheet(`
    <div class="sheet-title">Фильтры</div>
    <div class="ed-label">Комнаты</div>
    <div class="chipsel" id="fRooms">
      ${ROOM_OPTS.map(([v, t]) => `<button class="chsel sm2 ${curRooms.has(v) ? "on" : ""}" data-v="${v}">${t}</button>`).join("")}
    </div>
    <div class="ed-label">Бюджет, ₽/мес</div>
    <div class="two">
      <input class="input" id="fBmin" inputmode="numeric" placeholder="от" value="${init.budget_min || ""}">
      <input class="input" id="fBmax" inputmode="numeric" placeholder="до" value="${init.budget_max || ""}">
    </div>
    <div class="ed-label">Площадь, м²</div>
    <div class="two">
      <input class="input" id="fAmin" inputmode="numeric" placeholder="от" value="${init.area_min || ""}">
      <input class="input" id="fAmax" inputmode="numeric" placeholder="до" value="${init.area_max || ""}">
    </div>
    <div class="ed-label">ЖК</div>
    <div class="tags" id="fJkTags"></div>
    <input class="input" id="fJk" placeholder="введите ЖК и нажмите Enter">
    <div class="ed-label">Местоположение</div>
    <button class="btn ${polys.length ? "btn-primary" : "btn-soft"} sm" id="fArea" style="width:100%;margin-bottom:8px">
      ${icon('map')} ${polys.length ? (polys.length > 1 ? polys.length + " области заданы ✓ — изменить" : "Область задана ✓ — изменить") : "Обвести область на карте"}
    </button>
    ${polys.length ? `<button class="btn btn-soft sm" id="fAreaClear" style="width:100%;margin-bottom:8px">Убрать ${polys.length > 1 ? "области" : "область"}</button>` : ""}
    <div class="tags" id="fDistTags"></div>
    <input class="input" id="fDistrict" placeholder="район/зона + Enter (Раменки, юго-запад…)">
    <div class="chipsel" id="fZones" style="margin-top:8px">
      ${ZONE_CHIPS.map(([v, t]) => `<button class="chsel sm2" data-z="${v}">${t}</button>`).join("")}
    </div>
    <div class="ed-label">Метро</div>
    <div class="tags" id="fMetroTags"></div>
    <input class="input" id="fMetro" placeholder="станция + Enter (Фили, Университет…)">
    <div class="ed-label">Гео-точка</div>
    <input class="input" id="fGeoAddr" placeholder="метро Савёловская / улица, дом" value="${esc((init.geo && init.geo[0] && (init.geo[0].address || init.geo[0].label)) || "")}">
    <div class="chipsel" id="fGeoMin" style="margin-top:6px">
      ${[10,15,20,30,45,60].map(m=>`<button class="chsel sm2 ${((init.geo&&init.geo[0]&&init.geo[0].max_minutes)===m)?"on":""}" data-min="${m}">${m} мин</button>`).join("")}
    </div>
    <div class="chipsel" id="fGeoTr" style="margin-top:8px">
      ${[["transit",icon('train')+" транспорт"],["foot",icon('footprints')+" пешком"],["car",icon('car')+" машина"]].map(([v,t])=>`<button class="chsel sm2 ${((init.geo&&init.geo[0]&&init.geo[0].transport)||"transit")===v?"on":""}" data-tr="${v}">${t}</button>`).join("")}
    </div>
    <div class="ed-label">Комиссия</div>
    <div class="chipsel" id="fComm">
      <button class="chsel ${init.commission_max == null ? "on" : ""}" data-cm="">Любая</button>
      <button class="chsel ${init.commission_max === 0 ? "on" : ""}" data-cm="0">Без комиссии</button>
      <button class="chsel ${init.commission_max === 50 ? "on" : ""}" data-cm="50">До 50%</button>
    </div>
    <div class="btn-row" style="margin-top:24px">
      <button class="btn btn-soft sm filter-apply-row btn-reset-icon" id="fReset" title="Сбросить фильтры">${icon('eraser')}</button>
      <button class="btn btn-primary" id="fApply" style="flex:1">Применить</button>
    </div>`);
  // поле-теги: Enter/запятая добавляют значение чипом, можно несколько
  function tagify(inputId, tagsId, initialCSV) {
    const input = b.querySelector(inputId), box = b.querySelector(tagsId);
    let tags = String(initialCSV || "").split(",").map(s => s.trim()).filter(Boolean);
    function render() {
      box.innerHTML = "";
      tags.forEach((t, i) => {
        const chip = el(`<span class="tag">${esc(t)}<span class="tag-x">×</span></span>`);
        chip.querySelector(".tag-x").onclick = () => { haptic(); tags.splice(i, 1); render(); };
        box.appendChild(chip);
      });
    }
    function commit() {
      const parts = input.value.split(",").map(s => s.trim()).filter(Boolean);
      for (const p of parts) if (!tags.some(t => t.toLowerCase() === p.toLowerCase())) tags.push(p);
      if (parts.length) { input.value = ""; render(); }
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); haptic(); commit(); }
    });
    input.addEventListener("blur", commit);
    render();
    return {
      get: () => { commit(); return tags.join(", "); },
      add: (v) => { if (v && !tags.some(t => t.toLowerCase() === v.toLowerCase())) { tags.push(v); render(); } },
    };
  }
  const jkTags = tagify("#fJk", "#fJkTags", init.jk);
  const distTags = tagify("#fDistrict", "#fDistTags", init.district);
  const metroTags = tagify("#fMetro", "#fMetroTags", init.metro);

  b.querySelectorAll("#fRooms .chsel").forEach(x => x.onclick = () => { haptic(); x.classList.toggle("on"); });
  b.querySelectorAll("#fZones .chsel").forEach(x => x.onclick = () => { haptic(); distTags.add(x.dataset.z); });
  b.querySelectorAll("#fComm .chsel").forEach(x => x.onclick = () => {
    haptic();
    b.querySelectorAll("#fComm .chsel").forEach(c => c.classList.remove("on"));
    x.classList.add("on");
  });
  b.querySelectorAll("#fGeoTr .chsel").forEach(x => x.onclick = () => {
    haptic();
    b.querySelectorAll("#fGeoTr .chsel").forEach(c => c.classList.remove("on"));
    x.classList.add("on");
  });
  b.querySelectorAll("#fGeoMin .chsel").forEach(x => x.onclick = () => {
    haptic();
    b.querySelectorAll("#fGeoMin .chsel").forEach(c => c.classList.remove("on"));
    x.classList.toggle("on");
  });
  const num = (id) => { const v = parseInt((b.querySelector(id).value || "").replace(/\D/g, "")); return isNaN(v) ? "" : v; };
  const readForm = () => {
    const rooms = [...b.querySelectorAll("#fRooms .chsel.on")].map(x => x.dataset.v);
    const commEl = b.querySelector("#fComm .chsel.on");
    const commRaw = commEl ? commEl.dataset.cm : "";
    const commMax = commRaw === "" ? null : parseInt(commRaw);
    return {
      rooms: rooms.length ? rooms.join(",") : "",
      budget_min: num("#fBmin"), budget_max: num("#fBmax"),
      area_min: num("#fAmin"), area_max: num("#fAmax"),
      jk: jkTags.get(),
      district: distTags.get(),
      metro: metroTags.get(),
      polygons: polys, source: init.source || "",
      commission_max: isNaN(commMax) ? null : commMax,
      geo: geoFilter(),
    };
  };
  // одна гео-точка: адрес/метро + лимит минут + транспорт. Активна, только если задан и адрес, и минуты.
  function geoFilter() {
    const addr = (b.querySelector("#fGeoAddr").value || "").trim();
    const minEl = b.querySelector("#fGeoMin .chsel.on");
    const min = minEl ? parseInt(minEl.dataset.min) : 0;
    if (!addr || !min) return null;
    const trEl = b.querySelector("#fGeoTr .chsel.on");
    const tr = trEl ? trEl.dataset.tr : "transit";
    return [{ address: addr, label: addr, max_minutes: min, transport: tr, is_strict: true }];
  }
  // обвести область на карте — сохраняем текущие поля, уходим на карту, возвращаемся
  b.querySelector("#fArea").onclick = () => {
    haptic(); const cur = readForm(); closeSheet();
    go(() => renderMap(cur.source || "all", (ps) => {
      cur.polygons = (ps && ps.length) ? ps : null;
      sheetFilters(cur, onApply);
    }, polys));
  };
  const ac = b.querySelector("#fAreaClear");
  if (ac) ac.onclick = () => { haptic(); polys = []; const cur = readForm(); cur.polygons = null; closeSheet(); sheetFilters(cur, onApply); };
  b.querySelector("#fReset").onclick = () => { haptic(); closeSheet(); onApply({}); };
  b.querySelector("#fApply").onclick = () => { haptic(); closeSheet(); onApply(readForm()); };
}

function sheetEditCriteria(c) {
  const curRooms = new Set(String(c.rooms || "").split(",").map(s => s.trim()).filter(Boolean));
  const b = openSheet(`
    <div class="sheet-title">Критерии · ${esc(c.name)}</div>
    <div class="btn-row" style="margin-bottom:6px">
      <span id="vSlot" style="flex:1;display:flex"></span>
      <button class="btn btn-soft sm" id="eTextToggle" style="flex:1">${icon('type')} Текстом</button>
      <button class="btn btn-soft sm" id="eReset" title="Очистить все параметры">${icon('eraser')} Сброс</button>
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
    <div class="chipsel"><button class="chsel ${c.has_pets ? "on" : ""}" id="edPets">${icon('paw')} С животными</button></div>

    <button class="btn btn-primary" id="edSave" style="margin-top:20px">Сохранить критерии</button>
  `);

  const reopen = () => { closeSheet(); go(() => renderClientDetail(c.id), false); };
  b.querySelector("#vSlot").replaceWith(voiceButton(async (text) => {
    await applyCritText(c.id, text); notify("success"); toast("Применил голос ✓", "ok"); reopen();
  }, icon('mic')+" Надиктовать"));
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
  b.querySelector("#eReset").onclick = () => {
    haptic();
    b.querySelectorAll("#edRooms .chsel.on, #edPets.on").forEach(x => x.classList.remove("on"));
    ["#edBmin", "#edBmax", "#edAmin", "#edAmax", "#edLoc", "#eCrit"].forEach(id => { const e = b.querySelector(id); if (e) e.value = ""; });
    toast("Параметры очищены — впиши новый спрос", "ok");
  };
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
      ${opt("active", icon('pin')+" Активный (в подборе)", "btn-soft")}
      ${opt("paused", icon('moon')+" На паузе", "btn-soft")}
      ${opt("done", icon('party')+" Нашёл квартиру (архив)", "btn-soft")}
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
    <div class="card" style="margin-bottom:14px"><b>${fmtMoney(l.price)} ₽</b> · ${listingTitle(l)}</div>
    <div class="muted" style="margin-bottom:12px">${icon('alert')} Уйдёт РЕАЛЬНЫМ клиентам выбранной группы. Подтвердите.</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn btn-soft" data-g="active">${icon('pin')} Активным</button>
      <button class="btn btn-soft" data-g="paused">${icon('moon')} На паузе</button>
      <button class="btn btn-danger" data-g="all">${icon('users')} Всем</button>
    </div>`);
  b.querySelectorAll("[data-g]").forEach(x => x.onclick = async () => {
    haptic();
    const g = x.dataset.g, names = { active: "активным", paused: "на паузе", all: "ВСЕМ" };
    if (!await confirmA(`Точно отправить ${names[g]} клиентам?`)) return;
    api("/broadcast", { method: "POST", body: { listing_id: l.id, group: g } })
      .then(r => { closeSheet(); notify("success"); toast(`Рассылка запущена (${r.queued} клиентов)`, "ok"); })
      .catch(e => toast("Ошибка: " + e.message, "err"));
  });
}

function sheetScan() {
  const today = new Date().toISOString().slice(0, 10);
  const b = openSheet(`<div class="sheet-title">Собрать объявления</div>
    <div class="muted" style="margin-bottom:14px">Пройдусь по истории каналов и подберу пропущенные посты (в т.ч. отредактированные/упущенные).</div>
    <div class="chipsel" id="scanPresets">
      <button class="chsel" data-d="1">Сегодня</button>
      <button class="chsel" data-d="3">3 дня</button>
      <button class="chsel" data-d="7">Неделя</button>
      <button class="chsel" data-d="30">Месяц</button>
      <button class="chsel" data-d="0">Всё время</button>
    </div>
    <div class="ed-label" style="margin-top:12px">Или с конкретной даты</div>
    <div class="idsearch">
      <input class="input" type="date" id="scanDate" max="${today}">
      <button class="btn btn-soft sm" id="scanDateGo">Собрать</button>
    </div>
    <div id="scanRes" class="muted" style="margin-top:14px"></div>`);

  let busy = false;
  async function runScan(body, label) {
    if (busy) return; busy = true;
    haptic();
    const res = b.querySelector("#scanRes");
    res.innerHTML = `<span class="sq-spin"></span> Собираю${label ? " (" + label + ")" : ""}… может занять до пары минут.`;
    b.querySelectorAll("button").forEach(y => y.disabled = true);
    try {
      const r = await api("/scan", { method: "POST", body });
      res.innerHTML = `Готово ✓ Добавлено <b>${r.added}</b>, пропущено ${r.skipped}, просмотрено ${r.seen}.`;
      notify("success");
    } catch (e) { res.textContent = "Ошибка: " + (e.message || e); }
    b.querySelectorAll("button").forEach(y => y.disabled = false);
    busy = false;
  }
  b.querySelectorAll("#scanPresets .chsel").forEach(x => x.onclick = () =>
    runScan({ days: parseInt(x.dataset.d) }, x.textContent));
  b.querySelector("#scanDateGo").onclick = () => {
    const d = b.querySelector("#scanDate").value;
    if (!d) return toast("Выберите дату");
    runScan({ since: d }, "с " + d);
  };
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

/* ════════════════════════ PROFILE / ACCOUNT ════════════════════════ */
const TG_USER = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};

async function renderProfile() {
  setTitle("Профиль", "ваш аккаунт");
  removeFab();
  loading();
  let acc = {}; try { acc = await api("/account"); } catch (e) {}
  let ark = {}; try { ark = await api("/arendok/status"); } catch (e) {}
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  const uname = TG_USER.username ? "@" + TG_USER.username : (TG_USER.id ? "id " + TG_USER.id : "");
  const fullName = [TG_USER.first_name, TG_USER.last_name].filter(Boolean).join(" ") || "Вы";

  let connHtml;
  if (acc.owner) {
    connHtml = `<div class="card"><div class="row-between">
      <div><div style="font-weight:640;display:flex;align-items:center;gap:6px"><span style="color:var(--green);display:inline-flex">${icon('check')}</span> Аккаунт владельца</div>
      <div class="muted">отправка вариантов работает</div></div></div>
      <button class="btn btn-primary sm" id="admBtn" style="margin-top:12px">${icon('settings')} Админ-панель</button></div>`;
  } else if (acc.connected) {
    connHtml = `<div class="card">
      <div class="row-between"><div>
        <div style="font-weight:640;display:flex;align-items:center;gap:6px"><span style="color:var(--green);display:inline-flex">${icon('check')}</span> Telegram подключён</div>
        <div class="muted">${esc(acc.name || "")}${acc.username ? " · @" + esc(acc.username) : ""}${acc.phone ? " · " + esc(acc.phone) : ""}</div>
      </div></div>
      <button class="btn btn-danger sm" id="accDisc" style="margin-top:12px">Отключить аккаунт</button>
    </div>`;
  } else {
    connHtml = `<div class="card" style="border-color:var(--amber);border-width:2px">
      <div style="font-weight:700;color:var(--amber);font-size:15px;margin-bottom:5px">${icon('alert')} Telegram не подключён</div>
      <div class="muted" style="margin-bottom:12px">Чтобы отправлять варианты клиентам <b>от вашего имени</b>. Без этого кнопка «Отправить» будет недоступна.</div>
      <button class="btn btn-primary" style="width:100%" id="accConn">${icon('smartphone')} Подключить Telegram</button>
    </div>`;
  }

  let arkHtml;
  if (ark.owner) {
    arkHtml = `<div class="card"><div class="row-between">
      <div><div style="font-weight:640">${icon('building2')} Arendok · профиль владельца</div>
      <div class="muted">${ark.personal ? "ФДГ публикуется через ваш <b>личный</b> профиль (вход по капче)" : "ФДГ публикуется через файловую сессию кабинета"}</div></div></div>
      ${ark.personal
        ? `<button class="btn btn-danger sm" id="arkDisc" style="margin-top:12px">Отключить личный профиль</button>`
        : `<button class="btn btn-primary sm" id="arkConn" style="margin-top:12px">${icon('login')} Войти по капче (как риелтор)</button>`}
      </div>`;
  } else if (ark.connected) {
    arkHtml = `<div class="card"><div class="row-between"><div>
      <div style="font-weight:640">${icon('building2')} Arendok подключён</div>
      <div class="muted">ФДГ публикуется через ваш профиль arendok.ru</div>
      </div></div>
      <button class="btn btn-danger sm" id="arkDisc" style="margin-top:12px">Отключить Arendok</button></div>`;
  } else {
    arkHtml = `<div class="card" style="border-color:var(--red);border-width:2px">
      <div style="font-weight:700;color:var(--red);font-size:15px;margin-bottom:5px">${icon('ban')} Arendok не подключён</div>
      <div style="margin-bottom:4px;font-size:13.5px">Без этого <b>ФДГ не выложится</b> — публикация упадёт с ошибкой.</div>
      <div class="muted" style="margin-bottom:12px;font-size:13px">Вход через логин, пароль и капчу arendok.ru.</div>
      <button class="btn btn-primary" style="width:100%" id="arkConn">${icon('building2')} Подключить Arendok</button></div>`;
  }

  wrap.innerHTML = `
    <div class="detail-hero">
      <div class="avatar" style="font-size:22px">${esc(initials(fullName))}</div>
      <div><h2>${esc(fullName)}</h2><div class="sub">${esc(uname)}</div></div>
    </div>
    ${connHtml}
    ${(acc.admin && !acc.owner) ? `<button class="btn btn-primary sm" id="admBtn" style="width:100%;margin:-4px 0 12px">${icon('settings')} Админ-панель</button>` : ""}
    ${arkHtml}
    <button class="btn btn-soft" id="favBtn" style="width:100%;margin-top:6px">${icon('heart')} Избранное</button>
    <div class="section-title">Оформление</div>
    <div class="seg" id="themeSeg">
      <button data-th="auto">${icon('contrast')} Авто</button>
      <button data-th="light">${icon('sun')} Светлая</button>
      <button data-th="dark">${icon('moon')} Тёмная</button>
    </div>
    <button class="btn btn-ghost" id="onbReplay" style="width:100%;margin-top:6px">${icon('help')} Пройти обучение заново</button>
    <div class="muted" style="margin:18px 4px;font-size:12.5px">${icon('lock')} Данные ваших клиентов видите только вы. Подключение хранится в зашифрованном виде.</div>
    <div class="app-ver">Риелти · ${APP_VERSION}</div>`;
  view.appendChild(wrap);
  // переключатель темы: подсветить текущий выбор и навесить смену
  const themeSeg = $("#themeSeg");
  if (themeSeg) {
    const mark = () => { const p = getThemePref(); themeSeg.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.th === p)); };
    mark();
    themeSeg.querySelectorAll("button").forEach(b => b.onclick = () => { haptic(); setThemePref(b.dataset.th); mark(); });
  }
  const favBtn = $("#favBtn"); if (favBtn) favBtn.onclick = () => { haptic(); go(renderFavorites); };
  const onbR = $("#onbReplay"); if (onbR) onbR.onclick = () => { haptic(); startOnboarding(true); };
  const arkC = $("#arkConn"); if (arkC) arkC.onclick = () => { haptic(); sheetConnectArendok(); };
  const arkD = $("#arkDisc"); if (arkD) arkD.onclick = async () => {
    if (!await confirmA("Отключить ваш профиль Arendok?")) return;
    haptic(); try { await api("/arendok/disconnect", { method: "POST", body: {} }); toast("Arendok отключён", "ok"); renderProfile(); }
    catch (e) { toast("Ошибка", "err"); }
  };
  const ab = $("#admBtn"); if (ab) ab.onclick = () => { haptic(); location.href = (API_BASE || "") + "/admin?tgauth=" + AUTHQ; };
  const cc = $("#accConn"); if (cc) cc.onclick = () => { haptic(); sheetConnectAccount(); };
  const cd = $("#accDisc"); if (cd) cd.onclick = async () => {
    if (!await confirmA("Отключить ваш Telegram-аккаунт от бота?")) return;
    haptic(); try { await api("/account/disconnect", { method: "POST", body: {} }); toast("Аккаунт отключён", "ok"); renderProfile(); }
    catch (e) { toast("Ошибка", "err"); }
  };
}

async function renderFavorites() {
  setTitle("Избранное", "сохранённые объекты");
  removeFab();
  loading();
  await loadFavs();
  const ids = [...FAVS];
  view.innerHTML = "";
  const wrap = el(`<div class="fade-in"></div>`);
  view.appendChild(wrap);
  if (!ids.length) {
    wrap.appendChild(el(`<div class="empty"><span class="em-ic">${icon('heart')}</span>Пока ничего не в избранном.<br>Жми сердечко на карточке объекта.</div>`));
    return;
  }
  // тянем карточки по id (избранных обычно немного)
  const items = (await Promise.all(ids.map(id => api("/listings/" + id).catch(() => null)))).filter(Boolean);
  if (!items.length) { wrap.appendChild(el(`<div class="empty"><span class="em-ic">${icon('heart')}</span>Объекты больше недоступны</div>`)); return; }
  for (const l of items) {
    wrap.appendChild(listingCard(l, () => sheetClientPicker((cid, cname) => sendListing(l, cid, cname)), true, true));
  }
}

function sheetConnectAccount() {
  stepPhone();
  function stepPhone() {
    const b = openSheet(`<div class="sheet-title">Подключение Telegram</div>
      <div class="muted" style="margin-bottom:12px">Введите номер телефона вашего Telegram (в формате +7…). Придёт код в Telegram.</div>
      <div class="field"><input class="input" id="cPhone" inputmode="tel" placeholder="+79991234567"></div>
      <button class="btn btn-primary" id="cNext">Получить код</button>
      <div class="muted" style="margin-top:12px;font-size:12px">${icon('lock')} Код и пароль не сохраняются. Хранится только зашифрованная сессия для отправки от вашего имени.</div>`);
    b.querySelector("#cNext").onclick = async () => {
      const phone = b.querySelector("#cPhone").value.trim();
      if (!phone) return toast("Введите номер");
      haptic(); b.querySelector("#cNext").textContent = "Отправляю код…"; b.querySelector("#cNext").disabled = true;
      try { await api("/account/start", { method: "POST", body: { phone } }); stepCode(); }
      catch (e) { toast("Ошибка: " + e.message, "err"); b.querySelector("#cNext").textContent = "Получить код"; b.querySelector("#cNext").disabled = false; }
    };
  }
  function stepCode() {
    const b = openSheet(`<div class="sheet-title">Код из Telegram</div>
      <div class="muted" style="margin-bottom:12px">Введите код, который пришёл в Telegram (в чат от Telegram).</div>
      <div class="field"><input class="input" id="cCode" inputmode="numeric" placeholder="12345"></div>
      <button class="btn btn-primary" id="cNext">Подтвердить</button>`);
    b.querySelector("#cNext").onclick = async () => {
      const code = b.querySelector("#cCode").value.trim();
      if (!code) return toast("Введите код");
      haptic(); b.querySelector("#cNext").disabled = true;
      try {
        const r = await api("/account/code", { method: "POST", body: { code } });
        if (r.status === "password_needed") return stepPassword();
        if (r.status === "connected") return done(r);
        toast("Не удалось войти", "err"); b.querySelector("#cNext").disabled = false;
      } catch (e) { toast("Ошибка: " + e.message, "err"); b.querySelector("#cNext").disabled = false; }
    };
  }
  function stepPassword() {
    const b = openSheet(`<div class="sheet-title">Облачный пароль (2FA)</div>
      <div class="muted" style="margin-bottom:12px">У аккаунта включён облачный пароль. Введите его.</div>
      <div class="field"><input class="input" id="cPwd" type="password" placeholder="пароль"></div>
      <button class="btn btn-primary" id="cNext">Войти</button>`);
    b.querySelector("#cNext").onclick = async () => {
      const password = b.querySelector("#cPwd").value;
      if (!password) return toast("Введите пароль");
      haptic(); b.querySelector("#cNext").disabled = true;
      try {
        const r = await api("/account/password", { method: "POST", body: { password } });
        if (r.status === "connected") return done(r);
        toast("Неверный пароль", "err"); b.querySelector("#cNext").disabled = false;
      } catch (e) { toast("Ошибка: " + e.message, "err"); b.querySelector("#cNext").disabled = false; }
    };
  }
  function done(r) {
    closeSheet(); notify("success");
    toast("Telegram подключён ✓ " + (r.name || ""), "ok");
    renderProfile();
  }
}

function sheetConnectArendok() {
  stepCreds();
  function stepCreds() {
    const b = openSheet(`<div class="sheet-title">Подключение Arendok</div>
      <div class="muted" style="margin-bottom:12px">Логин (телефон или email) и пароль от вашего кабинета arendok.ru.</div>
      <div class="field"><input class="input" id="aLogin" placeholder="Телефон или Email"></div>
      <div class="field"><input class="input" id="aPwd" type="password" placeholder="Пароль"></div>
      <button class="btn btn-primary" id="aNext">Далее</button>
      <div class="muted" style="margin-top:12px;font-size:12px">${icon('lock')} Хранится в зашифрованном виде. Дальше нужно будет ввести капчу с картинки.</div>`);
    b.querySelector("#aNext").onclick = async () => {
      const login = b.querySelector("#aLogin").value.trim();
      const password = b.querySelector("#aPwd").value;
      if (!login || !password) return toast("Введите логин и пароль");
      haptic(); const btn = b.querySelector("#aNext"); btn.textContent = "Открываю вход…"; btn.disabled = true;
      try {
        const r = await api("/arendok/connect", { method: "POST", body: { login, password } });
        if (r.step === "captcha") return stepCaptcha(r);
        toast(r.message || "Не удалось открыть вход", "err"); btn.textContent = "Далее"; btn.disabled = false;
      } catch (e) { toast("Ошибка: " + e.message, "err"); btn.textContent = "Далее"; btn.disabled = false; }
    };
  }
  function stepCaptcha(r) {
    const b = openSheet(`<div class="sheet-title">Введите капчу</div>
      ${r.error ? `<div class="muted" style="color:var(--red);margin-bottom:8px">${esc(r.error)}</div>` : ""}
      <div style="text-align:center;margin-bottom:10px">
        ${r.img_b64 ? `<img id="aCapImg" src="data:image/png;base64,${r.img_b64}" alt="капча" style="height:62px;border-radius:8px;border:1px solid var(--line)">` : `<div class="muted">картинка не загрузилась</div>`}
      </div>
      <button class="btn btn-ghost sm" id="aRefresh" style="margin-bottom:10px">${icon('refresh')} Обновить картинку</button>
      <div class="field"><input class="input" id="aCap" inputmode="text" placeholder="символы с картинки"></div>
      <button class="btn btn-primary" id="aLogin2">Войти</button>`);
    b.querySelector("#aRefresh").onclick = async () => {
      haptic();
      try {
        const rr = await api("/arendok/refresh", { method: "POST", body: {} });
        const img = b.querySelector("#aCapImg");
        if (rr.img_b64 && img) img.src = "data:image/png;base64," + rr.img_b64;
      } catch (e) { toast("Ошибка обновления", "err"); }
    };
    b.querySelector("#aLogin2").onclick = async () => {
      const solution = b.querySelector("#aCap").value.trim();
      if (!solution) return toast("Введите капчу");
      haptic(); const btn = b.querySelector("#aLogin2"); btn.textContent = "Вхожу…"; btn.disabled = true;
      try {
        const rr = await api("/arendok/captcha", { method: "POST", body: { solution } });
        if (rr.step === "connected") return done();
        if (rr.step === "captcha") return stepCaptcha(rr);  // неверно — новая капча
        if (rr.step === "confirm") return stepConfirm(rr);  // промежуточная верификация
        toast(rr.message || "Не удалось войти", "err"); btn.textContent = "Войти"; btn.disabled = false;
      } catch (e) { toast("Ошибка: " + e.message, "err"); btn.textContent = "Войти"; btn.disabled = false; }
    };
  }
  function stepConfirm(r) {
    const b = openSheet(`<div class="sheet-title">Подтверждение входа</div>
      <div class="muted" style="margin-bottom:12px">${esc(r.message || "Введи код из SMS или письма")}</div>
      ${r.img_b64 ? `<div style="text-align:center;margin-bottom:12px">
        <img src="data:image/png;base64,${r.img_b64}" alt="экран" style="max-width:100%;max-height:200px;border-radius:8px;border:1px solid var(--line)">
      </div>` : ""}
      ${r.error ? `<div class="muted" style="color:var(--red);margin-bottom:8px">${esc(r.error)}</div>` : ""}
      <div class="field"><input class="input" id="aCode" inputmode="numeric" placeholder="Код из SMS или письма" autocomplete="one-time-code"></div>
      <button class="btn btn-primary" id="aConfirmBtn">Подтвердить</button>`);
    b.querySelector("#aConfirmBtn").onclick = async () => {
      const code = b.querySelector("#aCode").value.trim();
      if (!code) return toast("Введи код");
      haptic(); const btn = b.querySelector("#aConfirmBtn"); btn.textContent = "Проверяю…"; btn.disabled = true;
      try {
        const rr = await api("/arendok/confirm", { method: "POST", body: { code } });
        if (rr.step === "connected") return done();
        if (rr.step === "confirm") return stepConfirm(rr);
        toast(rr.message || "Не удалось подтвердить", "err"); btn.textContent = "Подтвердить"; btn.disabled = false;
      } catch (e) { toast("Ошибка: " + e.message, "err"); btn.textContent = "Подтвердить"; btn.disabled = false; }
    };
  }
  function done() {
    closeSheet(); notify("success");
    toast("Arendok подключён ✓", "ok");
    renderProfile();
  }
}

/* ════════════════════════ Онбординг (spotlight-тур) ════════════════════════ */
const ONB_KEY = "onboarding_done_v1";
const CONN = { tg: false, arendok: false, loaded: false };
async function refreshConn() {
  try { const a = await api("/account"); CONN.tg = !!(a.connected || a.owner); } catch (e) {}
  try { const k = await api("/arendok/status"); CONN.arendok = !!(k.connected || k.owner); } catch (e) {}
  CONN.loaded = true;
  return CONN;
}

const ONB_STEPS = [
  { target: null, ic: "👋", title: "Привет! Это твой помощник риелтора",
    text: "За минуту покажу, что где. Листай «Далее», а если спешишь — жми «Пропустить». Вернуться к обучению всегда можно из вкладки «Профиль»." },
  { target: '.tab[data-tab="home"]', ic: "◎", title: "Главная",
    text: "Сводка по работе: последние объекты, активные клиенты, отправки и ФДГ за сегодня. Тут же быстрые действия — поиск вариантов, история и сбор объявлений." },
  { target: '.tab[data-tab="fdg"]', ic: "⇪", title: "ФДГ — выкладка на Arendok",
    text: "Вставляешь ссылку с Циан или Авито — бот сам парсит, чистит фото и готовит объявление. Перед публикацией показывает превью, выкладываешь в один клик." },
  { target: '.tab[data-tab="clients"]', ic: "☺", title: "Клиенты",
    text: "База твоих клиентов и их критерии: бюджет, районы, метро, комнаты. Бот сам подбирает подходящие объекты, а ты отправляешь варианты в пару касаний." },
  { target: '.tab[data-tab="listings"]', ic: "⌂", title: "Объекты",
    text: "Вся собранная база объявлений из чатов и площадок. Здесь смотришь карточки, фото и отправляешь объекты клиентам." },
  { target: '.tab[data-tab="profile"]', ic: "⚙", title: "Профиль — начни отсюда",
    text: "Самое важное: подключи свой Telegram и аккаунт Arendok. Без них не получится отправлять клиентам и выкладывать ФДГ. Сейчас откроем профиль." },
];

let onbIdx = 0;
function startOnboarding() {
  onbIdx = 0;
  document.getElementById("onb").classList.remove("hidden");
  onbRender();
}
function endOnboarding(goConnect) {
  const root = document.getElementById("onb");
  root.classList.add("hidden"); root.innerHTML = "";
  try { localStorage.setItem(ONB_KEY, "1"); } catch (e) {}
  if (goConnect) onbAfterFinish();
}
async function onbAfterFinish() {
  await refreshConn();
  if (!CONN.tg || !CONN.arendok) {
    switchTab("profile");
    toast("Подключи Telegram и Arendok, чтобы начать", "");
  }
}
function onbRender() {
  const step = ONB_STEPS[onbIdx];
  const root = document.getElementById("onb");
  const isLast = onbIdx === ONB_STEPS.length - 1;
  const dots = ONB_STEPS.map((_, i) => `<i class="${i === onbIdx ? "on" : ""}"></i>`).join("");
  root.innerHTML = "";
  root.appendChild(el(`<div id="onbCatch"></div>`));
  const hole = el(`<div id="onbHole"></div>`);
  root.appendChild(hole);
  const card = el(`<div class="onb-card">
    <div class="onb-ic">${step.ic}</div>
    <h3>${esc(step.title)}</h3>
    <p>${esc(step.text)}</p>
    <div class="onb-foot">
      <div class="onb-dots">${dots}</div>
      <div class="onb-btns">
        ${onbIdx > 0 ? `<button class="btn btn-ghost sm" id="onbPrev">Назад</button>` : ``}
        <button class="btn btn-primary sm" id="onbNext">${isLast ? "Понятно" : "Далее"}</button>
      </div>
    </div>
    ${!isLast ? `<div style="text-align:center;margin-top:10px"><button class="onb-skip" id="onbSkip">Пропустить обучение</button></div>` : ``}
  </div>`);
  root.appendChild(card);
  onbPosition(step, hole, card);
  document.getElementById("onbNext").onclick = () => {
    haptic();
    if (isLast) endOnboarding(true);
    else { onbIdx++; onbRender(); }
  };
  const pv = document.getElementById("onbPrev"); if (pv) pv.onclick = () => { haptic(); onbIdx--; onbRender(); };
  const sk = document.getElementById("onbSkip"); if (sk) sk.onclick = () => { haptic(); endOnboarding(true); };
}
function onbPosition(step, hole, card) {
  const vh = window.innerHeight, vw = window.innerWidth;
  const t = step.target ? document.querySelector(step.target) : null;
  card.style.transform = "none";
  if (!t) {
    // приветствие/нет цели — затемняем всё, карточку по центру
    hole.classList.add("center");
    hole.style.cssText += ";width:0;height:0;left:" + (vw / 2) + "px;top:" + (vh / 2) + "px";
    card.style.top = "50%"; card.style.bottom = "auto";
    card.style.transform = "translateY(-50%)";
    return;
  }
  const r = t.getBoundingClientRect(), pad = 6;
  hole.classList.remove("center");
  hole.style.left = (r.left - pad) + "px";
  hole.style.top = (r.top - pad) + "px";
  hole.style.width = (r.width + pad * 2) + "px";
  hole.style.height = (r.height + pad * 2) + "px";
  // цель в нижней половине (таббар) → карточка над ней; иначе под ней
  if (r.top > vh * 0.5) { card.style.bottom = (vh - r.top + 14) + "px"; card.style.top = "auto"; }
  else { card.style.top = (r.bottom + 14) + "px"; card.style.bottom = "auto"; }
}

/* ── баннер техработ (управляется сервером: GET /api/notice) ── */
async function refreshNotice() {
  try {
    const n = await api("/notice");
    let el = document.getElementById("maintBanner");
    if (n && n.active && n.text) {
      if (!el) {
        el = document.createElement("div");
        el.id = "maintBanner";
        // В ПОТОКЕ, первым в #app — толкает шапку/контент вниз, а не ложится поверх.
        // Раньше был fixed top:0 z:99999 и перекрывал кнопку «назад» в шапке и крестик
        // галереи. Теперь оверлеи (галерея z1100, шторки z100) спокойно лежат сверху.
        el.style.cssText = "position:relative;z-index:5;background:#7c5e10;" +
          "color:#ffe9a8;font-size:12px;line-height:1.35;padding:7px 12px;text-align:center;";
        const app = document.getElementById("app");
        app.insertBefore(el, app.firstChild);
      }
      el.textContent = "🛠 " + n.text;
    } else if (el) {
      el.remove();
    }
  } catch (e) {}
}
refreshNotice();
setInterval(refreshNotice, 60000);

/* ── Колокольчик: счётчик непрочитанных + лента уведомлений в шторке ── */
async function refreshBell() {
  try {
    const r = await api("/notifications");
    const badge = document.getElementById("bellBadge");
    if (!badge) return;
    const n = r.unread || 0;
    if (n > 0) { badge.textContent = n > 99 ? "99+" : String(n); badge.classList.remove("hidden"); }
    else badge.classList.add("hidden");
  } catch (e) {}
}
async function openNotifications() {
  haptic();
  const b = openSheet(`<div class="sheet-title">${icon('bell')} Уведомления</div>
    <div id="notifList" class="notif-list"><div class="loader" style="height:50px"><div class="spin"></div></div></div>`);
  let r; try { r = await api("/notifications"); } catch (e) { b.querySelector("#notifList").innerHTML = `<div class="muted" style="padding:8px">Не загрузить</div>`; return; }
  const list = r.items || [];
  const box = b.querySelector("#notifList");
  if (!list.length) { box.innerHTML = `<div class="muted" style="padding:14px 8px;text-align:center">Пока нет уведомлений</div>`; }
  else {
    box.innerHTML = "";
    for (const it of list) {
      box.appendChild(el(`<div class="notif ${it.read ? "" : "unread"}">
        <div class="notif-text">${esc(it.text || "")}</div>
        <div class="notif-date">${fmtDate(it.created_at)}</div>
      </div>`));
    }
  }
  // открыл ленту → всё прочитано
  try { await api("/notifications/read", { method: "POST", body: {} }); } catch (e) {}
  refreshBell();
}
document.getElementById("bellBtn")?.addEventListener("click", openNotifications);
refreshBell();
setInterval(refreshBell, 60000);

/* ── start ── */
switchTab("home");
loadFavs();
(async () => {
  let done = false;
  try { done = localStorage.getItem(ONB_KEY) === "1"; } catch (e) {}
  await refreshConn();
  if (!done) setTimeout(() => startOnboarding(), 600);
  else if (!CONN.tg || !CONN.arendok) {
    // обучение уже пройдено, но профиль не подключён — мягко напомним
    setTimeout(() => { switchTab("profile"); toast("Подключи Telegram и Arendok, чтобы начать", ""); }, 400);
  }
})();
