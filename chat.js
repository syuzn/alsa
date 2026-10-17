// ─── Онлайн-помощник «Алса»: сам здоровается и отвечает клиентам ───
// Ответы пишет Gemini через Apps Script «ALSA бот заявок» (action: "chat"), вся переписка дублируется в Telegram-бот.
// Если сервер не ответил, помощник отвечает по шаблонам ниже.
(() => {
  const RELAY = "https://script.google.com/macros/s/AKfycbwR30rF4ZflO4JmYhMIuD3ja7a5NVJo7p07OL3mCX2qRIWqlVrNikPxru8WmtuDrV3UaQ/exec";
  const lang = () => (document.documentElement.lang || "ru").slice(0, 2);
  const T = {
    ru: {hi: "Здравствуйте! 👋 Я Алса, помощник ALSA Studio. Помочь с карточкой товара? Спросите про цены, сроки или пришлите ссылку на товар.", name: "Алса · помощник ALSA", on: "онлайн, отвечаю сразу", ph: "Напишите вопрос…", chips: ["Сколько стоит?", "Хочу разбор карточки", "Сроки?"]},
    en: {hi: "Hi! 👋 I'm Alsa, the ALSA Studio assistant. Need help with a product card? Ask about prices, timing or send a link to your product.", name: "Alsa · ALSA assistant", on: "online, replies instantly", ph: "Type your question…", chips: ["How much?", "I want a card audit", "How long?"]},
    hy: {hi: "Բարև՛ 👋 Ես Ալսան եմ՝ ALSA Studio-ի օգնականը։ Օգնե՞մ ապրանքի քարտի հարցում։ Հարցրեք գների, ժամկետների մասին կամ ուղարկեք ապրանքի հղումը։", name: "Ալսա · ALSA օգնական", on: "առցանց է, պատասխանում է միանգամից", ph: "Գրեք հարցը…", chips: ["Ի՞նչ արժե", "Քարտի վերլուծություն", "Ժամկետներ"]},
    zh: {hi: "您好！👋 我是 ALSA Studio 的助手 Alsa。需要帮您做商品卡片吗？可以问价格、时间，或发送商品链接。", name: "Alsa · ALSA 助手", on: "在线，即时回复", ph: "请输入问题…", chips: ["多少钱？", "我要卡片诊断", "需要多久？"]},
    kk: {hi: "Сәлеметсіз бе! 👋 Мен Алса, ALSA Studio көмекшісімін. Тауар карточкасына көмектесейін бе? Баға, мерзім туралы сұраңыз немесе тауар сілтемесін жіберіңіз.", name: "Алса · ALSA көмекшісі", on: "онлайн, бірден жауап береді", ph: "Сұрағыңызды жазыңыз…", chips: ["Бағасы қанша?", "Карточка талдауы", "Мерзімі?"]}
  };
  const t = () => T[lang()] || T.ru;

  // запасные ответы, если ИИ недоступен
  const RULES = [
    [/цен|стои|сколько|прайс|price|cost|how much|գին|արժ|价格|多少|баға/i, "Разбор карточки от 1 500 ₽ (за 24 часа), «Стандарт» 3 500 ₽, «Глубокий» 7 500 ₽. Главное фото 1 500 ₽, пакет «Старт» 3 150 ₽, «Продажи» 7 900 ₽, всё под ключ от 9 900 ₽. Первым 5 клиентам −30%. Что у вас за товар и где продаёте?"],
    [/разбор|аудит|audit|վերլուծ|诊断|талда/i, "Разбор покажет, почему карточку не покупают, и что исправить. «Экспресс» 1 500 ₽ за 24 часа, «Стандарт» 3 500 ₽ с PDF за 48 часов. Пришлите ссылку на товар и свой Telegram или телефон, Сюзанна начнёт сегодня."],
    [/срок|когда|быстр|долго|how long|time|ժամկետ|多久|мерзім/i, "Разбор «Экспресс» готов за 24 часа, карточки обычно за 2–5 дней. Срочно можно за 1–2 дня (+30%). Какой у вас товар?"],
    [/логотип|logo|լոգո|标志/i, "Логотип 3 500 ₽, логотип вместе с карточками 7 200 ₽ (скидка 10%). Расскажите о бренде и оставьте контакт."],
    [/оплат|чек|ип|pay|վճար|付款|төле/i, "Работаем официально как ИП: пришлём ссылку на оплату, после оплаты придёт кассовый чек."],
    [/wildberries|wb|ozon|озон|вб|маркет|avito|авито/i, "Работаем со всеми площадками: Wildberries, Ozon, Яндекс Маркет, Avito и другими. Пришлите ссылку на товар, подскажу, что улучшить."],
    [/@|\+?\d[\d\s()-]{8,}/, "Спасибо! Передала Сюзанне, она напишет вам в течение часа. 🙌"]
  ];
  const fallback = q => (RULES.find(([re]) => re.test(q)) || [0, "Спасибо за вопрос! Сюзанна ответит лично в течение часа. Оставьте, пожалуйста, имя и Telegram или телефон, либо напишите сразу в Telegram @syuzli."])[1];

  const css = `
.ac-btn{position:fixed;z-index:60;right:max(18px,calc(env(safe-area-inset-right,0px) + 18px));bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:62px;height:62px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(135deg,#E0306F,#5B1A8E);color:#fff;font-size:28px;box-shadow:0 12px 34px -8px rgba(194,24,91,.8),0 0 0 4px rgba(255,255,255,.9)}
.ac-btn i{position:absolute;top:4px;right:4px;width:14px;height:14px;border-radius:50%;background:#1FA97A;border:2px solid #fff}
.ac-tip{position:fixed;z-index:60;right:max(18px,calc(env(safe-area-inset-right,0px) + 18px));bottom:calc(env(safe-area-inset-bottom,0px) + 166px);max-width:min(300px,calc(100vw - 32px));background:#fff;color:#140C1C;border:1px solid #EDE4D8;border-radius:18px 18px 4px 18px;padding:14px 34px 14px 16px;font:600 .95rem/1.45 var(--body,system-ui);box-shadow:0 18px 50px -14px rgba(20,12,28,.45);cursor:pointer;animation:acIn .35s ease-out}
.ac-tip button{position:absolute;top:6px;right:8px;border:0;background:none;font-size:18px;color:#5F5468;cursor:pointer}
.ac-box{position:fixed;z-index:70;right:max(16px,calc(env(safe-area-inset-right,0px) + 16px));bottom:calc(env(safe-area-inset-bottom,0px) + 16px);width:min(380px,calc(100vw - 32px));height:min(560px,calc(100dvh - 32px));display:flex;flex-direction:column;background:#FBF7F0;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px -20px rgba(20,12,28,.6);animation:acIn .25s ease-out;font-family:var(--body,system-ui)}
.ac-top{display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(135deg,#24123A,#120B1A);color:#fff}
.ac-top .av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#E0306F,#5B1A8E);display:grid;place-items:center;font-size:20px;flex:none}
.ac-top b{display:block;font-size:.98rem}.ac-top small{color:#9EE6C9;font-size:.78rem}
.ac-top button{margin-left:auto;border:0;background:rgba(255,255,255,.12);color:#fff;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer}
.ac-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.ac-m{max-width:85%;padding:10px 14px;border-radius:16px;font-size:.95rem;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}
.ac-m.b{background:#fff;border:1px solid #EDE4D8;align-self:flex-start;border-bottom-left-radius:4px;color:#140C1C}
.ac-m.u{background:#C2185B;color:#fff;align-self:flex-end;border-bottom-right-radius:4px;font-weight:700}
.ac-m.dots{color:#5F5468;letter-spacing:3px}
.ac-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px}
.ac-chips button{border:1px solid #C2185B;background:#fff;color:#C2185B;border-radius:999px;padding:7px 12px;font:700 .85rem var(--body,system-ui);cursor:pointer}
.ac-form{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #EDE4D8;background:#fff}
.ac-form input{flex:1;min-width:0;border:1px solid #EDE4D8;border-radius:14px;padding:12px 14px;font:500 16px var(--body,system-ui);background:#FBF7F0;color:#140C1C}
.ac-form button{border:0;border-radius:14px;padding:0 16px;background:#C2185B;color:#fff;font-size:18px;cursor:pointer}
@keyframes acIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`;
  document.head.insertAdjacentHTML("beforeend", "<style>" + css + "</style>");

  const sid = (() => { try { let s = sessionStorage.getItem("alsa-sid"); if (!s) { s = Math.random().toString(36).slice(2, 10); sessionStorage.setItem("alsa-sid", s); } return s; } catch { return Math.random().toString(36).slice(2, 10); } })();
  const history = [];
  let box, tip, busy = false;

  const btn = document.createElement("button");
  btn.className = "ac-btn"; btn.type = "button"; btn.setAttribute("aria-label", "Чат с помощником"); btn.innerHTML = "💬<i></i>";
  document.body.appendChild(btn);
  btn.onclick = () => box ? close() : open();

  // через 4 секунды помощник сам предлагает помощь
  setTimeout(() => {
    if (box) return;
    try { if (sessionStorage.getItem("alsa-tip")) return; sessionStorage.setItem("alsa-tip", "1"); } catch {}
    tip = document.createElement("div"); tip.className = "ac-tip"; tip.setAttribute("role", "status");
    tip.innerHTML = '<button type="button" aria-label="Закрыть">×</button>'; tip.prepend(t().hi);
    tip.onclick = e => { const x = e.target.closest("button"); tip.remove(); tip = null; if (!x) open(); };
    document.body.appendChild(tip);
  }, 4000);

  function open(){
    if (tip) { tip.remove(); tip = null; }
    box = document.createElement("div"); box.className = "ac-box"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", t().name);
    box.innerHTML = `<div class="ac-top"><div class="av">✨</div><div><b></b><small></small></div><button type="button" aria-label="Закрыть">×</button></div>
      <div class="ac-msgs" aria-live="polite"></div><div class="ac-chips"></div>
      <form class="ac-form"><input type="text" maxlength="800" autocomplete="off"><button type="submit" aria-label="Отправить">➤</button></form>`;
    box.querySelector("b").textContent = t().name; box.querySelector("small").textContent = "● " + t().on;
    const inp = box.querySelector("input"); inp.placeholder = t().ph;
    box.querySelector(".ac-top button").onclick = close;
    box.querySelector("form").onsubmit = e => { e.preventDefault(); send(inp.value); inp.value = ""; };
    document.body.appendChild(box); btn.hidden = true;
    if (!history.length) {
      add(t().hi, "b");
      const ch = box.querySelector(".ac-chips");
      t().chips.forEach(c => { const b = document.createElement("button"); b.type = "button"; b.textContent = c; b.onclick = () => send(c); ch.appendChild(b); });
    } else history.forEach(m => add(m.t, m.r, true));
    if (matchMedia("(min-width:700px)").matches) inp.focus();
  }
  function close(){ if (box) box.remove(); box = null; btn.hidden = false; }
  function add(text, who, replay){
    if (!replay) history.push({r: who, t: text});
    if (!box) return;
    const d = document.createElement("div"); d.className = "ac-m " + who; d.textContent = text;
    const list = box.querySelector(".ac-msgs"); list.appendChild(d); list.scrollTop = list.scrollHeight; return d;
  }
  async function send(q){
    q = String(q || "").trim(); if (!q || busy) return;
    busy = true; box.querySelector(".ac-chips").innerHTML = "";
    add(q, "u");
    const dots = document.createElement("div"); dots.className = "ac-m b dots"; dots.textContent = "•••";
    const list = box.querySelector(".ac-msgs"); list.appendChild(dots); list.scrollTop = list.scrollHeight;
    let reply = "";
    try {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 25000);
      // не-латинские буквы кодируем как \uXXXX, чтобы текст не превращался в «????»
      const body = JSON.stringify({action: "chat", sid, lang: lang(), history: history.slice(-12)}).replace(/[\u007f-￿]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));
      const r = await fetch(RELAY, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body, signal: ctl.signal});
      clearTimeout(timer);
      reply = ((await r.json()).reply || "").trim();
    } catch {}
    dots.remove();
    add(reply || fallback(q), "b");
    busy = false;
  }
})();
