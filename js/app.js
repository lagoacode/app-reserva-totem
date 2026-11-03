/* Fluxo do totem de check-in: navegação, teclados, validação, aviso de inatividade e telas. */
(function () {
  var cfg = window.KIOSK_CONFIG, I18N = window.KIOSK_I18N, API = window.KioskAPI;
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("kiosk");

  /* empreendimento ativo (?hotel=ecotowers) */
  var hotelId = new URLSearchParams(location.search).get("hotel") || cfg.PADRAO;
  if (!cfg.empreendimentos[hotelId]) hotelId = cfg.PADRAO;
  var hotel = cfg.empreendimentos[hotelId];
  $("hotelName").textContent = hotel.nome;
  $("hotelPlace").textContent = hotel.local;
  document.querySelector(".photo").style.backgroundImage = 'url("' + hotel.foto + '")';
  document.title = "Check-in " + hotel.nome;
  $("proto").hidden = !cfg.modoDemonstracao;

  /* palco fixo 1080x1920, escalado para caber na tela */
  function fit() {
    var w = innerWidth, h = innerHeight, s = Math.min(w / 1080, h / 1920);
    stage.style.transform = "translate(" + ((w - 1080 * s) / 2) + "px," + ((h - 1920 * s) / 2) + "px) scale(" + s + ")";
  }
  fit(); addEventListener("resize", fit);
  stage.style.setProperty("--rx", cfg.leitorPulseiraX != null ? cfg.leitorPulseiraX : 0.7);

  /* idioma */
  var lang = "pt";
  function t(k, vars) {
    var s = (I18N[lang] && I18N[lang][k]) || I18N.pt[k] || k;
    if (vars) Object.keys(vars).forEach(function (v) { s = s.split("{" + v + "}").join(vars[v]); });
    return s;
  }
  function applyLang() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll(".pad .ok").forEach(function (b) { b.textContent = t(b.dataset.label || "okk"); });
    document.querySelectorAll(".pad .del").forEach(function (b) { b.setAttribute("aria-label", t("del")); });
    document.documentElement.lang = t("locale");
    document.querySelectorAll(".lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    ["codeMsg", "cpfMsg", "phoneMsg", "finishMsg"].forEach(function (id) { var el = $(id); if (el.dataset.k) el.textContent = t(el.dataset.k); });
    renderSteps();
    if (reserva && mode === "in") { renderReserva(); renderChat(); }
    if (reserva && mode === "out" && lidas.length) { renderBill(); renderGroup(); renderPay(); if (cur === "payrun") renderPayTexts(); }
    if (cur === "rate") { setNota(nota); $("rLead").textContent = t("rl", { h: hotel.nome }); }
    if (cur === "xdone") renderXDone();
    if (cur === "done") renderDone();
    if (idleOpen) drawIdle();
    tick();
  }
  document.querySelectorAll(".lang button").forEach(function (b) {
    b.addEventListener("click", function (e) { e.stopPropagation(); lang = b.dataset.lang; applyLang(); poke(); });
  });
  function setMsg(id, k) { var el = $(id); el.dataset.k = k || ""; el.textContent = k ? t(k) : ""; }

  /* navegação */
  var cur = "welcome", reserva = null, pulseiras = 0, waPhone = "", mode = "in", lidas = [], agrupar = false, nota = null, metodo = "", pago = 0;
  var STEPS = { "in": ["st1", "st2", "st3", "st4", "st5"], out: ["sp1", "so2", "sp3", "so3", "st5"] };
  var steps = [];
  function renderSteps() {
    var nav = $("steps"); nav.innerHTML = ""; nav.style.setProperty("--n", STEPS[mode].length);
    steps = STEPS[mode].map(function (k) { var d = document.createElement("div"); d.textContent = t(k); nav.appendChild(d); return d; });
    markSteps();
  }
  function markSteps() { var st = +$(cur).dataset.step; steps.forEach(function (s, i) { s.className = i < st ? "past" : (i === st ? "on" : ""); }); }
  function go(id) {
    if (idleOpen) closeIdle(true);
    $(cur).classList.remove("on");
    $(id).classList.add("on");
    cur = id; stage.dataset.screen = id;
    markSteps();
    $("foot").classList.toggle("off", !$(id).dataset.back);
    if (id === "welcome") { reserva = null; waPhone = ""; lidas = []; agrupar = false; nota = null; }
    if (id === "ident") $("ident").dataset.back = mode === "out" ? "band" : "mode";
    if (id === "band") { setMsg("bandMsg"); $("bscan").classList.remove("read"); scanBuf = ""; reading = false; }
    if (id === "xsum") { agrupar = false; lidas = lidas.slice(0, 1); }
    if (id === "group") { setMsg("groupMsg"); groupReading = false; renderGroup(); }
    if (id === "pay") { $("pay").dataset.back = agrupar ? "group" : "xsum"; renderPay(); }
    if (id === "payrun") startPay();
    $("edgeMach").classList.toggle("on", id === "payrun" && metodo !== "pix");
    if (id === "rate") { gostou = {}; setNota(null); setMsg("rateMsg"); $("rFinish").disabled = false; $("rLead").textContent = t("rl", { h: hotel.nome }); }
    if (id === "code") { code = ""; drawCode(); setMsg("codeMsg"); var v = $("vdemo"); v.classList.remove("play"); void v.offsetWidth; v.classList.add("play"); }
    if (id === "cpf") { cpf = ""; drawCpf(); setMsg("cpfMsg"); $("cpfField").classList.remove("bad"); }
    if (id === "terms") { setAccept(false); }
    if (id === "phone") { phone = ""; drawPhone(); setMsg("phoneMsg"); $("phoneField").classList.remove("bad"); renderChat(); busy(false); }
    if (id === "done") startCount("count"); else if (id === "xdone") startCount("xcount"); else stopCount();
    poke();
  }
  $("welcome").addEventListener("click", function () { go("mode"); });
  document.querySelectorAll("[data-mode]").forEach(function (b) { b.addEventListener("click", function () { mode = b.dataset.mode; renderSteps(); go(mode === "out" ? "band" : "ident"); }); });
  $("xEnd").addEventListener("click", function () { go("welcome"); });
  document.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { go(b.dataset.go); }); });
  $("back").addEventListener("click", function () { var b = $(cur).dataset.back; if (b) go(b); });
  $("yes").addEventListener("click", function () { go("terms"); });
  $("no").addEventListener("click", function () { go("ident"); });
  $("end").addEventListener("click", function () { go("welcome"); });

  /* busca */
  function buscar(promessa, voltar, msgId, nfKey) {
    go("search");
    promessa.then(function (r) {
      if (cur !== "search") return;
      if (!r) { go(voltar); setMsg(msgId, nfKey); return; }
      if (mode === "in") { reserva = r; renderReserva(); go("confirm"); return; }
      reserva = r.reserva; lidas = [{ h: r.hospede, consumos: r.consumos || [] }]; renderBill(); go("xsum");
    }).catch(function () {
      if (cur !== "search") return;
      go(voltar); setMsg(msgId, "ferr");
    });
  }

  /* teclado numérico */
  function makePad(el, onDigit, onDel, onOk, label) {
    var ok;
    ["1","2","3","4","5","6","7","8","9","del","0","ok"].forEach(function (k) {
      var b = document.createElement("button"); b.type = "button";
      if (k === "del") { b.className = "del"; b.textContent = "⌫"; b.onclick = onDel; }
      else if (k === "ok") { b.className = "ok"; b.disabled = true; b.onclick = onOk; if (label) b.dataset.label = label; ok = b; }
      else { b.textContent = k; b.onclick = function () { onDigit(k); }; }
      el.appendChild(b);
    });
    return ok;
  }
  /* desenha um campo com máscara: parte digitada + parte que falta */
  function drawMasked(el, mask, digits, prefix) {
    var out = "", j = 0, filled = 0;
    for (var i = 0; i < mask.length; i++) {
      if (mask[i] === "_") { out += j < digits.length ? digits[j] : "_"; if (j < digits.length) filled = i + 1; j++; }
      else { out += mask[i]; if (j < digits.length && j > 0) filled = i + 1; }
    }
    el.innerHTML = "";
    if (prefix) { var p = document.createElement("span"); p.className = "cc"; p.textContent = prefix; el.appendChild(p); }
    var a = document.createElement("span"); a.textContent = out.slice(0, filled);
    var b = document.createElement("span"); b.className = "ph"; b.textContent = out.slice(filled);
    el.append(a, b);
  }
  function shake(el) { el.classList.remove("bad"); void el.offsetWidth; el.classList.add("bad"); }

  /* número da reserva */
  var code = "";
  var okCode = makePad($("padCode"),
    function (d) { if (code.length < 6) { code += d; setMsg("codeMsg"); drawCode(); } },
    function () { code = code.slice(0, -1); setMsg("codeMsg"); drawCode(); },
    function () {
      if (code.length !== 6) return;
      if (code === "000000") { setMsg("codeMsg", "kex"); code = ""; drawCode(); return; }
      buscar(API.buscarPorReserva(code, hotelId), "code", "codeMsg", "knf");
    });
  function drawCode() {
    var boxes = $("digits").children;
    for (var i = 0; i < 6; i++) { boxes[i].textContent = code[i] || ""; boxes[i].className = i < code.length ? "f" : (i === code.length ? "cur" : ""); }
    okCode.disabled = code.length !== 6;
  }

  /* CPF */
  var cpf = "";
  var okCpf = makePad($("padCpf"),
    function (d) { if (cpf.length < 11) { cpf += d; clearErr("cpfMsg", "cpfField"); drawCpf(); } },
    function () { cpf = cpf.slice(0, -1); clearErr("cpfMsg", "cpfField"); drawCpf(); },
    function () {
      if (!validCpf(cpf)) { shake($("cpfField")); setMsg("cpfMsg", "perr"); return; }
      buscar(API.buscarPorCPF(cpf, hotelId), "cpf", "cpfMsg", "pnf");
    });
  function clearErr(msg, field) { setMsg(msg); $(field).classList.remove("bad"); }
  function drawCpf() { drawMasked($("cpfField"), "___.___.___-__", cpf); okCpf.disabled = cpf.length !== 11; }
  function validCpf(c) {
    if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
    for (var n = 9; n < 11; n++) {
      var s = 0; for (var i = 0; i < n; i++) s += +c[i] * (n + 1 - i);
      if ((s * 10) % 11 % 10 !== +c[n]) return false;
    }
    return true;
  }

  /* confirmação */
  function fmtData(iso) { var p = iso.split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function noites(a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); }
  function titular() { return reserva.hospedes.filter(function (h) { return h.titular; })[0] || reserva.hospedes[0]; }
  var cores = ["var(--blue)", "var(--orange)", "var(--coral)", "var(--green)"];
  function renderReserva() {
    var r = reserva;
    $("rNum").textContent = r.numero;
    $("rIn").textContent = fmtData(r.entrada);
    $("rInH").textContent = t("inH", { h: hotel.horarioEntrada });
    $("rOut").textContent = fmtData(r.saida);
    $("rOutH").textContent = t("outH", { h: hotel.horarioSaida, n: noites(r.entrada, r.saida) });
    $("rAcc").textContent = r.acomodacao;
    $("rHotel").textContent = hotel.nome;
    var partes = [r.adultos === 1 ? t("ad1") : t("ad", { n: r.adultos })];
    if (r.criancas) partes.push(r.criancas === 1 ? t("ch1") : t("ch", { n: r.criancas }));
    $("rGuests").textContent = partes.join(", ");
    $("rCount").textContent = t("ppl", { n: r.adultos + (r.criancas || 0) });
    var ul = $("rList"); ul.innerHTML = "";
    r.hospedes.forEach(function (h, i) {
      var li = document.createElement("li");
      var av = document.createElement("span"); av.className = "av"; av.style.background = cores[i % cores.length];
      av.textContent = h.nome.split(" ").filter(Boolean).map(function (p, k, a) { return k === 0 || k === a.length - 1 ? p[0] : ""; }).join("").toUpperCase();
      li.appendChild(av); li.appendChild(document.createTextNode(h.nome));
      if (h.titular || h.crianca) { var tg = document.createElement("span"); tg.className = "tg"; tg.textContent = t(h.titular ? "tit" : "chd"); li.appendChild(tg); }
      ul.appendChild(li);
    });
  }

  /* condições */
  function setAccept(v) { $("accept").setAttribute("aria-checked", String(v)); $("finish").disabled = !v; }
  $("accept").addEventListener("click", function () { setAccept($("accept").getAttribute("aria-checked") !== "true"); });
  $("finish").addEventListener("click", function () { go("phone"); });

  /* celular para o regimento interno no WhatsApp */
  var phone = "";
  var okPhone = makePad($("padPhone"),
    function (d) { if (phone.length < 11) { phone += d; clearErr("phoneMsg", "phoneField"); drawPhone(); } },
    function () { phone = phone.slice(0, -1); clearErr("phoneMsg", "phoneField"); drawPhone(); },
    function () {
      if (!validPhone(phone)) { shake($("phoneField")); setMsg("phoneMsg", "werr"); return; }
      concluir(phone);
    }, "wok");
  $("skip").addEventListener("click", function () { concluir(""); });
  function drawPhone() { drawMasked($("phoneField"), "(__) _____-____", phone, "+55"); okPhone.disabled = phone.length !== 11 || isBusy; }
  function validPhone(p) { return /^[1-9][1-9]9\d{8}$/.test(p); }
  function fmtPhone(p) { return "(" + p.slice(0, 2) + ")\u00a0" + p.slice(2, 7) + "\u2011" + p.slice(7); }
  function renderChat() {
    if (!reserva) return;
    $("chatMsg").textContent = t("wchat", { n: titular().nome.split(" ")[0], h: hotel.nome });
    var d = new Date(); $("chatTime").textContent = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  var isBusy = false;
  function busy(v) { isBusy = v; $("skip").disabled = v; drawPhone(); }
  function concluir(tel) {
    if (isBusy) return;
    busy(true);
    Promise.all([
      API.confirmarCheckin(reserva.numero, hotelId),
      tel ? API.enviarRegimento(reserva.numero, "55" + tel, hotelId).catch(function () { return { ok: false }; }) : null
    ]).then(function (res) {
      if (cur !== "phone") return;
      pulseiras = (res[0] && res[0].pulseiras) || reserva.hospedes.length;
      waPhone = tel && res[1] && res[1].ok ? tel : "";
      renderDone(); go("done");
    }).catch(function () { setMsg("phoneMsg", "ferr"); busy(false); });
  }

  /* concluído */
  function renderDone() {
    $("dGreet").textContent = t("greet", { n: titular().nome.split(" ")[0] });
    $("dRoom").textContent = reserva.acomodacao + (reserva.apartamento ? " · " + reserva.apartamento : "");
    $("dCards").textContent = pulseiras === 1 ? t("card1") : t("cards", { n: pulseiras });
    $("waSent").hidden = !waPhone;
    if (waPhone) $("waSentT").textContent = t("wsent", { p: fmtPhone(waPhone) });
  }
  var cd, left, countEl = "count";
  function startCount(el) { countEl = el; left = cfg.telaFinalSegundos; drawCount(); clearInterval(cd); cd = setInterval(function () { left--; drawCount(); if (left <= 0) go("welcome"); }, 1000); }
  function stopCount() { clearInterval(cd); }
  function drawCount() { $(countEl).textContent = t("cnt", { n: left }); }

  /* ---------- check-out ---------- */
  function money(v) { try { return v.toLocaleString(t("locale"), { style: "currency", currency: "BRL" }); } catch (e) { return "R$ " + v.toFixed(2); } }
  function soma(lista) { return lista.reduce(function (s, c) { return s + (+c.valor || 0); }, 0); }
  function total() { return (agrupar ? lidas : lidas.slice(0, 1)).reduce(function (s, l) { return s + soma(l.consumos); }, 0); }
  function nPulseiras() { return agrupar ? lidas.length : 1; }
  function qtd(n) { return n === 0 ? t("it0") : n === 1 ? t("it1") : t("itn", { n: n }); }
  function renderBill() {
    var r = reserva, l = lidas[0], tot = soma(l.consumos);
    $("xGuest").textContent = r.hospedes[l.h].nome;
    $("xNum").textContent = t("fr") + " " + r.numero;
    $("xStay").textContent = fmtData(r.entrada).slice(0, 5) + " → " + fmtData(r.saida).slice(0, 5);
    $("xOut").textContent = t("xOut", { h: hotel.horarioSaida });
    $("xAcc").textContent = r.acomodacao + (r.apartamento ? " · " + r.apartamento : "");
    var chip = $("xChip"); chip.className = "chip " + (tot > 0 ? "warn" : "okc"); chip.textContent = tot > 0 ? t("xopen", { v: money(tot) }) : t("xclear");
    var ul = $("xList"); ul.innerHTML = "";
    if (!l.consumos.length) { var n = document.createElement("li"); n.className = "none"; n.textContent = t("xnone"); ul.appendChild(n); }
    l.consumos.forEach(function (c) {
      var li = document.createElement("li"), d = document.createElement("span"), em = document.createElement("em"), v = document.createElement("span");
      d.textContent = c.descricao; em.textContent = c.local || ""; d.appendChild(em);
      v.className = "v"; v.textContent = money(+c.valor);
      li.append(d, v); ul.appendChild(li);
    });
    $("xTotal").textContent = money(tot);
  }
  $("gYes").addEventListener("click", function () { go("group"); agrupar = true; renderGroup(); });
  $("gNo").addEventListener("click", function () { agrupar = false; seguirPagamento(); });
  function seguirPagamento() { if (total() > 0) go("pay"); else { pago = 0; go("rate"); } }

  /* agrupar contas: lê as outras pulseiras da reserva */
  var groupReading = false;
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function renderGroup() {
    var ul = $("gList"); ul.innerHTML = "";
    lidas.forEach(function (l) {
      var li = document.createElement("li"), bk = document.createElement("span"), d = document.createElement("span"), sm = document.createElement("small"), v = document.createElement("span");
      bk.className = "bk"; bk.innerHTML = CHECK;
      d.textContent = reserva.hospedes[l.h].nome; sm.textContent = qtd(l.consumos.length); d.appendChild(sm);
      v.className = "v"; v.textContent = money(soma(l.consumos));
      li.append(bk, d, v); ul.appendChild(li);
    });
    $("gTotal").textContent = money(total());
    $("gGo").textContent = t("grgo", { v: money(total()) });
  }
  function lerOutra(codigo) {
    if (groupReading) return;
    if (lidas.length >= reserva.hospedes.length) { setMsg("groupMsg", "grall"); return; }
    groupReading = true; setMsg("groupMsg"); poke();
    API.buscarPorPulseira(codigo, hotelId, lidas.map(function (l) { return l.h; })).then(function (r) {
      groupReading = false;
      if (cur !== "group" || !r) return;
      if (lidas.some(function (l) { return l.h === r.hospede; })) { setMsg("groupMsg", "grdup"); return; }
      lidas.push({ h: r.hospede, consumos: r.consumos || [] }); renderGroup();
    }).catch(function () { groupReading = false; setMsg("groupMsg", "bnf"); });
  }
  $("gGo").addEventListener("click", seguirPagamento);
  $("gSim").hidden = !cfg.modoDemonstracao;
  $("gSim").addEventListener("click", function () { lerOutra("DEMO"); });

  /* pagamento */
  stage.style.setProperty("--mx", cfg.maquininhaX != null ? cfg.maquininhaX : 0.5);
  function renderPay() {
    $("pTotal").textContent = money(total());
    var n = nPulseiras(); $("pBands").textContent = n === 1 ? t("card1") : t("cards", { n: n });
  }
  document.querySelectorAll("[data-pm]").forEach(function (b) { b.addEventListener("click", function () { metodo = b.dataset.pm; go("payrun"); }); });
  var payToken = 0;
  function renderPayTexts() {
    var pix = metodo === "pix";
    $("prH").textContent = t(pix ? "pxh" : "pch");
    $("prL").textContent = t(pix ? "pxl" : "pcl");
    $("prTotal").textContent = money(total());
  }
  function startPay() {
    var tok = ++payToken, box = $("prBox");
    box.dataset.m = metodo === "pix" ? "pix" : "card"; box.classList.remove("ok");
    renderPayTexts(); setMsg("payMsg");
    if (metodo === "pix") drawQr();
    var valor = Math.round(total() * 100) / 100;
    API.pagar(metodo, valor, reserva.numero, hotelId).then(function (res) {
      if (tok !== payToken || cur !== "payrun") return;
      if (!res || !res.aprovado) { setMsg("payMsg", "pferr"); return; }
      pago = valor; box.classList.add("ok");
      setTimeout(function () { if (tok === payToken && cur === "payrun") go("rate"); }, 1600);
    }).catch(function () { if (tok === payToken) setMsg("payMsg", "pferr"); });
  }
  $("pSim").hidden = !cfg.modoDemonstracao;
  $("pSim").addEventListener("click", function () { if (window.__aprovarPagamento) window.__aprovarPagamento(); });
  /* QR Code ilustrativo do Pix (desenho, não é um código válido) */
  function drawQr() {
    var cv = $("pixQr"), x = cv.getContext("2d"), n = 29, s = cv.width / n, seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    x.fillStyle = "#fff"; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = "#13233f";
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) if (rnd() > .52) x.fillRect(i * s, j * s, s, s);
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(function (p) {
      x.fillStyle = "#13233f"; x.fillRect(p[0] * s, p[1] * s, 7 * s, 7 * s);
      x.fillStyle = "#fff"; x.fillRect((p[0] + 1) * s, (p[1] + 1) * s, 5 * s, 5 * s);
      x.fillStyle = "#13233f"; x.fillRect((p[0] + 2) * s, (p[1] + 2) * s, 3 * s, 3 * s);
    });
  }
  var FACES = [
    ["#e85038", "M34 70 Q50 58 66 70"], ["#f0902c", "M35 67 Q50 62 65 67"], ["#e6b422", "M35 65 L65 65"],
    ["#8cc63f", "M34 62 Q50 72 66 62"], ["#2f8f5b", "M32 58 Q50 80 68 58"]
  ];
  FACES.forEach(function (f, k) {
    var b = document.createElement("button"); b.type = "button"; b.className = "face"; b.setAttribute("role", "radio"); b.dataset.n = k + 1;
    b.innerHTML = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="' + f[0] + '"/><circle cx="37" cy="42" r="5" fill="#13233f"/><circle cx="63" cy="42" r="5" fill="#13233f"/><path d="' + f[1] + '" fill="none" stroke="#13233f" stroke-width="5" stroke-linecap="round"/></svg>';
    b.onclick = function () { setNota(nota === k + 1 ? null : k + 1); };
    $("faces").appendChild(b);
  });
  var LIKES = ["comida", "atendimento", "organizacao", "ambiente", "limpeza", "piscinas", "recreacao", "apartamento"], gostou = {};
  LIKES.forEach(function (k, n) {
    var b = document.createElement("button"); b.type = "button"; b.className = "like"; b.dataset.k = k; b.dataset.i18 = "g" + (n + 1); b.setAttribute("aria-pressed", "false");
    b.innerHTML = '<span class="ck" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="lt"></span>';
    b.onclick = function () { gostou[k] = !gostou[k]; b.setAttribute("aria-pressed", String(!!gostou[k])); };
    $("likes").appendChild(b);
  });
  function drawLikes() {
    document.querySelectorAll(".like").forEach(function (b) { b.querySelector(".lt").textContent = t(b.dataset.i18); b.setAttribute("aria-pressed", String(!!gostou[b.dataset.k])); });
    $("likesQ").textContent = t(nota && nota <= 2 ? "lkw" : "lk");
  }
  function setNota(n) {
    nota = n;
    document.querySelectorAll(".face").forEach(function (b) { b.setAttribute("aria-checked", String(+b.dataset.n === n)); b.setAttribute("aria-label", t("f" + b.dataset.n)); });
    $("faceLabel").textContent = n ? t("f" + n) : "";
    drawLikes();
  }
  $("rFinish").addEventListener("click", function () {
    $("rFinish").disabled = true;
    var avaliacao = { nota: nota, tipo: nota && nota <= 2 ? "melhorar" : "gostou", itens: LIKES.filter(function (k) { return gostou[k]; }) };
    API.registrarCheckout(reserva.numero, avaliacao, hotelId).then(function () {
      if (cur !== "rate") return;
      renderXDone(); go("xdone");
    }).catch(function () { setMsg("rateMsg", "ferr"); $("rFinish").disabled = false; });
  });
  function renderXDone() {
    var l = reserva.hospedes[lidas[0].h];
    $("oGreet").textContent = t("ogreet", { n: l.nome.split(" ")[0] });
    $("oTotal").textContent = pago > 0 ? money(pago) : t("zero");
    var nb = nPulseiras(); $("oBands").textContent = nb === 1 ? t("card1") : t("cards", { n: nb });
    $("oPay").textContent = pago > 0 ? t("opay") : t("opay0");
  }
  /* reaproveita o desenho da pulseira na tela final do check-out e na tela do leitor */
  function cloneBand() {
    var band = document.querySelector("#done .band").cloneNode(true);
    band.querySelectorAll("defs").forEach(function (d) { d.remove(); });
    band.querySelectorAll("[id]").forEach(function (el) { el.removeAttribute("id"); });
    return band;
  }
  $("oPickup").insertBefore(cloneBand(), $("oPickup").firstChild);
  /* braço com pulseira aproximando do leitor (vetor) */
  function armSvg(id) {
    return '<svg class="arm" viewBox="0 0 260 520" aria-hidden="true"><defs>' +
      '<linearGradient id="sk' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#e4a982"/><stop offset=".45" stop-color="#f3c7a4"/><stop offset="1" stop-color="#d69a73"/></linearGradient>' +
      '<linearGradient id="bb' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#086da3"/><stop offset=".5" stop-color="#2fb0ea"/><stop offset="1" stop-color="#0a7fc0"/></linearGradient>' +
      '<linearGradient id="sl' + id + '" x1="0" x2="1"><stop offset="0" stop-color="#162745"/><stop offset=".5" stop-color="#26406d"/><stop offset="1" stop-color="#162745"/></linearGradient></defs>' +
      '<path d="M70 -900 H190 L194 0 L186 150 H74 L66 0 Z" fill="url(#sl' + id + ')"/>' +
      '<path d="M78 144 H182 L172 334 H88 Z" fill="url(#sk' + id + ')"/>' +
      '<rect x="70" y="128" width="120" height="28" rx="12" fill="#0f1d38"/>' +
      '<path d="M88 330 C80 362 78 402 86 432 C94 464 120 478 140 476 C166 474 182 454 184 422 C186 392 180 356 172 330 Z" fill="url(#sk' + id + ')"/>' +
      '<path d="M92 348 C68 366 68 412 92 430 C102 412 104 380 100 350 Z" fill="#dc9f78"/>' +
      '<path d="M114 404 H172 M116 430 H170 M124 454 H160" stroke="#c38461" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<rect x="82" y="298" width="98" height="40" rx="13" fill="url(#bb' + id + ')"/>' +
      '<rect x="90" y="302" width="82" height="8" rx="4" fill="#fff" opacity=".35"/>' +
      '<rect x="113" y="305" width="36" height="27" rx="7" fill="#fff"/><circle cx="131" cy="318.5" r="6.5" fill="#0a90d0"/>' +
      '</svg>';
  }
  $("bandMove").innerHTML = armSvg("a");
  $("mBand").innerHTML = armSvg("b");

  /* leitura da pulseira: leitores USB funcionam como teclado (digitam o código e Enter) */
  var scanBuf = "", scanAt = 0, reading = false;
  document.addEventListener("keydown", function (e) {
    if ((cur !== "band" || reading) && cur !== "group") return;
    var now = Date.now(); if (now - scanAt > 300) scanBuf = ""; scanAt = now;
    if (e.key === "Enter") { if (scanBuf.length >= 4) (cur === "group" ? lerOutra : lerPulseira)(scanBuf); scanBuf = ""; return; }
    if (e.key.length === 1) scanBuf += e.key;
  });
  function lerPulseira(codigo) {
    reading = true; poke(); setMsg("bandMsg");
    $("bscan").classList.add("read");
    setTimeout(function () {
      if (cur !== "band") return;
      buscar(API.buscarPorPulseira(codigo, hotelId), "band", "bandMsg", "bnf");
    }, 900);
  }
  $("bSim").hidden = !cfg.modoDemonstracao;
  $("bSim").addEventListener("click", function () { if (!reading) lerPulseira("DEMO0001"); });

  /* inatividade: pergunta se a pessoa ainda está aí e conta até voltar ao início */
  var idleTimer, warnTimer, warnLeft = 0, idleOpen = false;
  function interactive() { return ["welcome", "search", "done", "xdone", "payrun"].indexOf(cur) < 0; }
  function poke() {
    if (idleOpen) return;
    clearTimeout(idleTimer);
    if (interactive()) idleTimer = setTimeout(openIdle, cfg.inatividadeSegundos * 1000);
  }
  function openIdle() {
    if (!interactive()) return;
    idleOpen = true; warnLeft = cfg.avisoSegundos;
    var box = $("idle"); box.hidden = false;
    var ring = box.querySelector(".prg"); ring.style.animation = "none"; void ring.getBoundingClientRect();
    ring.style.animation = "drain " + cfg.avisoSegundos + "s linear forwards";
    drawIdle();
    clearInterval(warnTimer);
    warnTimer = setInterval(function () { warnLeft--; drawIdle(); if (warnLeft <= 0) { closeIdle(true); go("welcome"); } }, 1000);
    $("idleYes").focus({ preventScroll: true });
  }
  function drawIdle() { $("idleN").textContent = Math.max(warnLeft, 0); $("idleT").textContent = t("it", { n: Math.max(warnLeft, 0) }); }
  function closeIdle(silent) {
    idleOpen = false; clearInterval(warnTimer); $("idle").hidden = true;
    if (!silent) poke();
  }
  $("idleYes").addEventListener("click", function (e) { e.stopPropagation(); closeIdle(); });
  $("idleNo").addEventListener("click", function (e) { e.stopPropagation(); closeIdle(true); go("welcome"); });
  stage.addEventListener("pointerdown", poke);

  /* relógio */
  function tick() { try { $("clock").textContent = new Date().toLocaleTimeString(t("locale"), { hour: "2-digit", minute: "2-digit" }); } catch (e) {} }
  setInterval(tick, 15000);

  applyLang(); drawCode(); drawCpf(); drawPhone();
})();
