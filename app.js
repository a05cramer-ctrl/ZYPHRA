/* ZYPHRA site script. ASCII-only source. */
(function () {
  "use strict";

  var CFG = window.ZYPHRA_CFG || {};
  var TICKER = CFG.TICKER || "ZYPHRA";
  var NAME = CFG.NAME || "ZYPHRA";
  var CA = String(CFG.CA || "").trim();
  var SUPPLY = Number(CFG.SUPPLY) || 1e9;
  var MIN_HOLD = Number(CFG.MIN_HOLD) || 0;
  var MIN_PAYOUT = Number(CFG.MIN_PAYOUT_ZEC) || 0;
  var FEE_PCT = Number(CFG.CREATOR_FEE_PCT);
  if (!isFinite(FEE_PCT)) FEE_PCT = 0.3;

  var DOT = " \u00b7 ", ELL = "\u2026", APPROX = "\u2248";
  var SAMPLE_UA = "u1qz4lj8rpd9myw630ga504cpr8l8vnd29zgwfuuwquyut8lhn07l8z9xqjpttf0tn3g5l7cqgzdkutfr7xn3faltpks7kg6tfdvn43x9f";
  var SAMPLE_UA_SHORT = "u1qz" + ELL + "x9f";
  var reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function fmtInt(n) { return Math.round(n).toLocaleString("en-US"); }
  function fmtUsd(n) {
    if (!isFinite(n)) return "--";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (n >= 1e4) return "$" + fmtInt(n);
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtZec(n) {
    if (!isFinite(n) || n <= 0) return "0.0000";
    if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
    if (n >= 10) return n.toFixed(3);
    return n.toFixed(4);
  }
  function short(s, a, b) { return s.length > a + b + 1 ? s.slice(0, a) + ELL + s.slice(-b) : s; }

  /* ---------- toast ---------- */
  var toastEl = $("#toast"), toastT = 0;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.style.animation = "none"; void toastEl.offsetWidth; toastEl.style.animation = "";
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  /* ---------- config binding ---------- */
  $$("[data-ticker]").forEach(function (el) { el.textContent = TICKER; });
  $$("[data-name]").forEach(function (el) { el.textContent = NAME; });
  $$("[data-cfg]").forEach(function (el) {
    var k = el.getAttribute("data-cfg"), v = CFG[k];
    if (v === undefined || v === "") return;
    el.textContent = (k === "MIN_PAYOUT_ZEC") ? String(v) : fmtInt(Number(v));
  });
  var LOGO = CFG.LOGO || "logo.svg";
  $$("[data-logo]").forEach(function (el) { el.src = LOGO; });
  var fav = $("#favicon"); if (fav) fav.href = LOGO;

  var LINKS = {
    BUY: CFG.BUY || (CA ? "https://pump.fun/coin/" + CA : ""),
    CHART: CFG.CHART || (CA ? "https://gmgn.ai/sol/token/" + CA : ""),
    X: CFG.X || ""
  };
  var OFF_MSG = {
    BUY: "Buy opens at launch, when the CA posts.",
    CHART: "The chart goes live at launch, with the CA.",
    X: "The X account posts at launch."
  };
  $$("[data-link]").forEach(function (el) {
    var k = el.getAttribute("data-link"), url = LINKS[k];
    if (url) {
      el.href = url; el.target = "_blank"; el.rel = "noopener noreferrer";
    } else {
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("data-off", "");
      el.setAttribute("title", OFF_MSG[k] || "At launch");
      var fire = function (e) { e.preventDefault(); toast(OFF_MSG[k] || "At launch."); };
      el.addEventListener("click", fire);
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") fire(e); });
    }
  });

  /* CA chips */
  var narrowMQ = window.matchMedia ? window.matchMedia("(max-width: 560px)") : { matches: false };
  function renderCA() {
    $$("[data-ca-chip]").forEach(function (chip) {
      var t = $("[data-ca-text]", chip), b = $("[data-copy-ca]", chip);
      if (!CA) {
        chip.classList.add("empty");
        t.textContent = "CA posts at launch";
        b.hidden = true;
      } else {
        chip.classList.remove("empty");
        t.textContent = narrowMQ.matches ? short(CA, 8, 8) : CA;
        t.title = CA;
        b.hidden = false;
      }
    });
  }
  renderCA();
  if (narrowMQ.addEventListener) narrowMQ.addEventListener("change", renderCA);

  function copyText(txt) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt);
    return new Promise(function (res, rej) {
      var ta = document.createElement("textarea");
      ta.value = txt; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? res() : rej(); } catch (e) { rej(e); }
      document.body.removeChild(ta);
    });
  }
  $$("[data-copy-ca]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!CA) return;
      var lab = $("[data-copy-label]", b);
      copyText(CA).then(function () {
        lab.textContent = "Copied";
        setTimeout(function () { lab.textContent = "Copy"; }, 1600);
      }, function () { toast("Copy failed. Select the address manually."); });
    });
  });

  /* nav state */
  var nav = $("#nav");
  function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- prices ---------- */
  var PRICE = { zec: 1130, sol: 109, zecChg: null, live: false };
  var priceSubs = [];
  function onPrice(fn) { priceSubs.push(fn); fn(); }
  function renderPrices() {
    var est = PRICE.live ? "" : '<span class="est">est.</span>';
    var chg = (PRICE.live && PRICE.zecChg !== null && isFinite(PRICE.zecChg))
      ? '<span class="chg">' + (PRICE.zecChg >= 0 ? "+" : "") + PRICE.zecChg.toFixed(1) + "%</span>" : "";
    $("#zecPrice").innerHTML = fmtUsd(PRICE.zec) + chg + est;
    $("#solPrice").innerHTML = fmtUsd(PRICE.sol) + est;
    priceSubs.forEach(function (fn) { fn(); });
  }
  function loadPrices() {
    if (!window.fetch) { renderPrices(); return; }
    var ctl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=zcash,solana&vs_currencies=usd&include_24hr_change=true", ctl ? { signal: ctl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (j) {
        clearTimeout(to);
        var z = j && j.zcash && Number(j.zcash.usd), s = j && j.solana && Number(j.solana.usd);
        if (z > 0 && s > 0) {
          PRICE.zec = z; PRICE.sol = s; PRICE.live = true;
          PRICE.zecChg = j.zcash.usd_24h_change !== undefined ? Number(j.zcash.usd_24h_change) : null;
        }
        renderPrices();
      })
      .catch(function () { clearTimeout(to); renderPrices(); });
  }
  renderPrices();
  loadPrices();
  setInterval(function () { if (!document.hidden) loadPrices(); }, 60000);

  /* ---------- next round countdown (top of next UTC hour) ---------- */
  var nextEl = $("#nextRound"), lastHour = Math.floor(Date.now() / 3600000);
  var hourSubs = [];
  function tickClock() {
    var now = Date.now(), left = 3600000 - (now % 3600000);
    var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    nextEl.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
    var h = Math.floor(now / 3600000);
    if (h !== lastHour) { lastHour = h; hourSubs.forEach(function (fn) { fn(); }); }
    setTimeout(tickClock, 1000 - (now % 1000) + 5);
  }
  tickClock();

  /* ---------- seeded rng ---------- */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(r, n) { var o = "", h = "0123456789abcdef"; for (var i = 0; i < n; i++) o += h[Math.floor(r() * 16)]; return o; }

  /* ---------- sample ledger ---------- */
  var ledgerBody = $("#ledgerBody");
  function renderLedger(flash) {
    var hourNow = Math.floor(Date.now() / 3600000), rows = "";
    for (var i = 0; i < 5; i++) {
      var hr = hourNow - i, r = rng(hr * 7919);
      var solIn = 9 + r() * 14;
      var zecOut = solIn * PRICE.sol / PRICE.zec * (0.993 - r() * 0.004);
      var d = new Date(hr * 3600000);
      var hh = ("0" + d.getUTCHours()).slice(-2);
      var day = d.toISOString().slice(5, 10);
      var tx = hex(r, 64);
      rows += '<tr class="' + (i === 0 ? "cur" + (flash ? " new" : "") : "") + '">' +
        '<td class="mono">' + fmtInt(1204 - i) + "</td>" +
        '<td class="mono t-time">' + day + " " + hh + ":00</td>" +
        '<td class="mono tx">' + tx.slice(0, 8) + ELL + tx.slice(-6) + "</td>" +
        '<td class="mono num">' + solIn.toFixed(2) + " SOL</td>" +
        '<td class="mono num">' + zecOut.toFixed(3) + " ZEC</td></tr>";
    }
    ledgerBody.innerHTML = rows;
    if (flash) setTimeout(function () { var n = $(".new", ledgerBody); if (n) n.classList.remove("new"); }, 1600);
  }
  // header label for the time column
  var thTime = $(".ledger-table thead th:nth-child(2)"); if (thTime) thTime.classList.add("t-time");
  onPrice(function () { renderLedger(false); });
  hourSubs.push(function () { renderLedger(true); });

  /* ---------- register (demo) ---------- */
  var BECH = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  function bechBody(s) { for (var i = 0; i < s.length; i++) if (BECH.indexOf(s[i]) < 0) return false; return true; }
  function validateZ(raw) {
    var s = String(raw || "").replace(/\s+/g, "");
    if (!s) return { kind: "idle" };
    if (/^t[13]/.test(s) || /^tex1/i.test(s)) return { kind: "bad", type: "transparent", msg: "Transparent addresses can't receive shielded payouts. Use a u1\u2026 or zs1\u2026 address." };
    if (s !== s.toLowerCase() && s !== s.toUpperCase()) return { kind: "bad", msg: "Mixed case. Shielded addresses are all lowercase." };
    var a = s.toLowerCase();
    if (a.indexOf("u1") === 0) {
      if (!bechBody(a.slice(2))) return { kind: "bad", msg: "Not a valid unified address: contains characters outside the bech32m set." };
      if (a.length < 100) return { kind: "bad", msg: "Too short for a unified address (" + a.length + " characters). Check you copied all of it." };
      return { kind: "ok", type: "unified", addr: a, msg: "Valid unified address." };
    }
    if (a.indexOf("zs1") === 0) {
      if (!bechBody(a.slice(3))) return { kind: "bad", msg: "Not a valid Sapling address: contains characters outside the bech32 set." };
      if (a.length !== 78) return { kind: "bad", msg: "A Sapling address is 78 characters; this one is " + a.length + "." };
      return { kind: "warn", type: "sapling", addr: a, msg: "Valid Sapling address.", sub: "Unified (u1\u2026) preferred." };
    }
    return { kind: "bad", msg: "Not a shielded Zcash address. Use a unified (u1\u2026) or Sapling (zs1\u2026) address." };
  }
  window.__zyValidate = validateZ;

  var zIn = $("#zaddr"), zMsg = $("#zaddrMsg"), signMsg = $("#signMsg");
  var stWallet = $("#stepWallet"), stAddr = $("#stepAddr"), stSign = $("#stepSign");
  var btnConnect = $("#btnConnect"), btnSign = $("#btnSign"), regDone = $("#regDone");
  var IDLE_MSG = zMsg.innerHTML;
  var reg = { wallet: "", addr: "", signed: false };
  var nonce = hex(rng(Date.now() & 0xffff), 8);
  function demoWallet() {
    var A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", r = rng(42), o = "";
    for (var i = 0; i < 44; i++) o += A[Math.floor(r() * A.length)];
    return o;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function renderReg() {
    var v = validateZ(zIn.value);
    zMsg.setAttribute("data-kind", v.kind);
    zIn.setAttribute("data-kind", v.kind);
    if (v.kind === "idle") zMsg.innerHTML = IDLE_MSG;
    else zMsg.innerHTML = "<span>" + esc(v.msg) + (v.sub ? ' <span class="sub">' + esc(v.sub) + "</span>" : "") + "</span>";
    zIn.setAttribute("aria-invalid", v.kind === "bad" ? "true" : "false");
    var newAddr = (v.kind === "ok" || v.kind === "warn") ? v.addr : "";
    if (newAddr !== reg.addr) { reg.addr = newAddr; reg.signed = false; }
    stWallet.setAttribute("data-state", reg.wallet ? "done" : "todo");
    stAddr.setAttribute("data-state", reg.addr ? "done" : "todo");
    var ready = !!(reg.wallet && reg.addr);
    stSign.setAttribute("data-state", reg.signed ? "done" : (ready ? "todo" : "locked"));
    btnSign.disabled = !ready || reg.signed;
    btnSign.innerHTML = reg.signed ? "Signed" : 'Sign <span class="dim">demo</span>';
    regDone.hidden = !reg.signed;
    var iso = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString().slice(0, 16) + "Z";
    signMsg.innerHTML =
      NAME + " payout registration\n" +
      "solana: <b>" + (reg.wallet ? short(reg.wallet, 6, 6) : "\u2014") + "</b>\n" +
      "zcash:  <b>" + (reg.addr ? esc(short(reg.addr, 10, 8)) : "\u2014") + "</b>\n" +
      "nonce:  " + nonce + "    issued: " + iso;
  }
  btnConnect.addEventListener("click", function () {
    if (reg.wallet) { reg.wallet = ""; reg.signed = false; $("#walletStatus").textContent = "Phantom, Solflare or Backpack."; btnConnect.innerHTML = 'Connect <span class="dim">demo</span>'; }
    else {
      reg.wallet = demoWallet();
      $("#walletStatus").innerHTML = '<span class="mono">' + short(reg.wallet, 4, 4) + "</span> connected (demo)";
      btnConnect.textContent = "Disconnect";
    }
    renderReg();
  });
  zIn.addEventListener("input", renderReg);
  $("#useSample").addEventListener("click", function () { zIn.value = SAMPLE_UA; renderReg(); zIn.focus(); });
  btnSign.addEventListener("click", function () {
    if (btnSign.disabled) return;
    btnSign.disabled = true; btnSign.textContent = "Signing" + ELL;
    setTimeout(function () { reg.signed = true; renderReg(); }, 650);
  });
  renderReg();

  /* ---------- earnings calculator ---------- */
  var inBag = $("#inBag"), rgBag = $("#rgBag"), inVol = $("#inVol"), rgVol = $("#rgVol"), inFee = $("#inFee");
  inFee.value = String(FEE_PCT);
  $("#bagNote").textContent = "of " + fmtInt(SUPPLY) + DOT + "min. hold " + fmtInt(MIN_HOLD);
  var BAG_LO = Math.log10(Math.max(1000, SUPPLY / 1e4)), BAG_HI = Math.log10(SUPPLY / 10);
  var VOL_LO = 2, VOL_HI = 5;
  function parseNum(s) { var n = parseFloat(String(s).replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; }
  function toSlider(v, lo, hi) { if (v <= 0) return 0; return Math.max(0, Math.min(1000, Math.round((Math.log10(v) - lo) / (hi - lo) * 1000))); }
  function fromSlider(t, lo, hi) { return Math.pow(10, lo + (hi - lo) * t / 1000); }
  function nice(v) { var p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1)); return Math.round(v / p) * p; }
  function paint(rg) { rg.style.setProperty("--p", (rg.value / 10) + "%"); }
  function calc() {
    var bag = Math.min(parseNum(inBag.value), SUPPLY), vol = parseNum(inVol.value), fee = parseNum(inFee.value);
    var feesSol = vol * fee / 100;
    var share = bag / SUPPLY;
    var eligible = bag >= MIN_HOLD;
    var zecDay = eligible ? feesSol * share * PRICE.sol / PRICE.zec : 0;
    var perRound = zecDay / 24;
    $("#bagPct").textContent = (share * 100).toFixed(share * 100 < 0.1 ? 3 : 2);
    $("#volUsd").textContent = APPROX + " " + fmtUsd(vol * PRICE.sol) + " / day";
    $("#outDay").textContent = fmtZec(zecDay);
    $("#outMonth").textContent = fmtZec(zecDay * 30);
    $("#outDayUsd").textContent = APPROX + " " + fmtUsd(zecDay * PRICE.zec);
    $("#outMonthUsd").textContent = APPROX + " " + fmtUsd(zecDay * 30 * PRICE.zec);
    $("#outFees").textContent = feesSol.toLocaleString("en-US", { maximumFractionDigits: 2 }) + " SOL";
    $("#outRound").textContent = eligible ? perRound.toFixed(5) + " ZEC" : "--";
    $("#outPrices").textContent = "ZEC " + fmtUsd(PRICE.zec) + DOT + "SOL " + fmtUsd(PRICE.sol) + (PRICE.live ? DOT + "live" : DOT + "est.");
    var note = $("#outNote");
    if (!eligible) note.innerHTML = "<b>Below the " + fmtInt(MIN_HOLD) + " $" + TICKER + " minimum hold.</b> Bags under it don't qualify for payouts.";
    else if (perRound > 0 && perRound < MIN_PAYOUT) note.innerHTML = "<b>Under " + MIN_PAYOUT + " ZEC per round,</b> so it rolls over and pays out about every " + Math.ceil(MIN_PAYOUT / perRound) + " hours.";
    else note.innerHTML = "Excludes swap fees and slippage. Fewer registered holders means a bigger share for you.";
  }
  function fromBagInput() { var v = parseNum(inBag.value); rgBag.value = toSlider(v, BAG_LO, BAG_HI); paint(rgBag); calc(); }
  function fromVolInput() { var v = parseNum(inVol.value); rgVol.value = toSlider(v, VOL_LO, VOL_HI); paint(rgVol); calc(); }
  inBag.addEventListener("input", fromBagInput);
  inVol.addEventListener("input", fromVolInput);
  inFee.addEventListener("input", calc);
  inBag.addEventListener("blur", function () { var v = Math.min(parseNum(inBag.value), SUPPLY); inBag.value = fmtInt(v); fromBagInput(); });
  inVol.addEventListener("blur", function () { inVol.value = parseNum(inVol.value).toLocaleString("en-US", { maximumFractionDigits: 2 }); });
  rgBag.addEventListener("input", function () { inBag.value = fmtInt(nice(fromSlider(+rgBag.value, BAG_LO, BAG_HI))); paint(rgBag); calc(); });
  rgVol.addEventListener("input", function () { inVol.value = fmtInt(nice(fromSlider(+rgVol.value, VOL_LO, VOL_HI))); paint(rgVol); calc(); });
  fromBagInput(); fromVolInput();
  onPrice(calc);

  /* ---------- pipeline comet ---------- */
  (function pipeline() {
    var pipe = $("#pipe"); if (!pipe) return;
    var steps = $$(".pipe-step", pipe), nodes = steps.map(function (s) { return $(".node", s); });
    var track = document.createElement("span"); track.className = "track"; track.setAttribute("aria-hidden", "true");
    var comet = document.createElement("span"); comet.className = "comet"; comet.setAttribute("aria-hidden", "true");
    pipe.appendChild(track); pipe.appendChild(comet);
    var pts = [], vertical = false;
    function measure() {
      var pr = pipe.getBoundingClientRect();
      pts = nodes.map(function (n) { var r = n.getBoundingClientRect(); return { x: r.left - pr.left + r.width / 2, y: r.top - pr.top + r.height / 2 }; });
      vertical = Math.abs(pts[3].x - pts[0].x) < 4;
      var a = pts[0], b = pts[pts.length - 1];
      track.style.cssText = vertical
        ? "position:absolute;left:" + (a.x - 0.5) + "px;top:" + a.y + "px;width:1px;height:" + (b.y - a.y) + "px;background:var(--line-2)"
        : "position:absolute;left:" + a.x + "px;top:" + (a.y - 0.5) + "px;height:1px;width:" + (b.x - a.x) + "px;background:var(--line-2)";
    }
    measure();
    if (window.ResizeObserver) new ResizeObserver(measure).observe(pipe); else window.addEventListener("resize", measure);
    if (reduceMQ.matches) { comet.style.display = "none"; return; }
    var SEG = 1300, HOLD = 450, CYCLE = 3 * (SEG + HOLD) + 1400, t0 = performance.now(), visible = true, raf = 0;
    function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      var t = (now - t0) % CYCLE, pos = 0, lit = -1, op = 1;
      if (t < 3 * (SEG + HOLD)) {
        var seg = Math.floor(t / (SEG + HOLD)), within = t - seg * (SEG + HOLD);
        pos = seg + (within < SEG ? ease(within / SEG) : 1);
        if (within >= SEG - 60) lit = seg + 1;
        if (pos < 0.08) op = pos / 0.08;
      } else { pos = 3; lit = 3; op = Math.max(0, 1 - (t - 3 * (SEG + HOLD)) / 500); }
      if (t < 260) lit = 0;
      var i = Math.min(2, Math.floor(pos)), f = pos - i, a = pts[i], b = pts[i + 1];
      var x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
      comet.style.opacity = op;
      comet.style.transform = vertical ? "translate(0," + (y - 110) + "px)" : "translate(" + (x - 140) + "px,0)";
      steps.forEach(function (s, k) { s.classList.toggle("lit", k === lit || (k < lit && false)); });
      raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
    if (window.IntersectionObserver) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; start(); }).observe(pipe);
    document.addEventListener("visibilitychange", start);
    start();
  })();

  /* ---------- THE VIEWING LENS ---------- */
  (function lens() {
    var stage = $("#lensStage"), cv = $("#lens");
    if (!stage || !cv || !cv.getContext) return;
    var ctx = cv.getContext("2d");
    var roundEl = $("#lensRound"), hintEl = $("#lensHint");
    var GLYPHS = "qpzry9x8gf2tvdw0s3jn54khce6mua7l0123456789abcdef";
    var MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
    var W = 0, H = 0, DPR = 1, cw = 7.2, LH = 18, cols = 0, rows = 0, fieldH = 0;
    var off = null, octx = null, grid = [];
    var notes = [], specks = [], lines = [], rings = [];
    var round = 1204, reduce = reduceMQ.matches;
    var L = { x: 0, y: 0, tx: 0, ty: 0, r: 90, manual: false, lastInput: -1e9, auto: { i: 0, until: 0, mode: "mine" } };
    var running = false, raf = 0, last = 0, drift = 0, nextPulse = 0, pulse = null, visible = true, interacted = false;
    var R = Math.random;
    function rg(n) { var o = ""; for (var i = 0; i < n; i++) o += GLYPHS[(R() * GLYPHS.length) | 0]; return o; }
    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

    /* -- field -- */
    function drawCell(c, r) {
      var g = grid[r * cols + c];
      octx.fillStyle = "#07070B";
      octx.fillRect(c * cw, r * LH, cw + 0.5, LH);
      if (!g.ch) return;
      octx.fillStyle = "rgba(150,144,166," + g.a + ")";
      octx.fillText(g.ch, c * cw, r * LH + LH / 2 + 0.5);
    }
    function buildField() {
      ctx.font = "400 11px " + MONO;
      cw = Math.max(6, ctx.measureText("0").width + 1.6);
      LH = 17;
      cols = Math.ceil(W / cw) + 1;
      rows = Math.ceil(H / LH) + 2;
      fieldH = rows * LH;
      off = document.createElement("canvas");
      off.width = Math.ceil(cols * cw * DPR); off.height = Math.ceil(fieldH * DPR);
      octx = off.getContext("2d");
      octx.setTransform(DPR, 0, 0, DPR, 0, 0);
      octx.font = "400 11px " + MONO;
      octx.textBaseline = "middle";
      octx.fillStyle = "#07070B"; octx.fillRect(0, 0, cols * cw, fieldH);
      grid = [];
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        grid.push({ ch: R() < 0.62 ? GLYPHS[(R() * GLYPHS.length) | 0] : "", a: (0.05 + R() * 0.11).toFixed(3) });
        drawCell(c, r);
      }
    }
    function mutateField(n) {
      for (var i = 0; i < n; i++) {
        var c = (R() * cols) | 0, r = (R() * rows) | 0, g = grid[r * cols + c];
        g.ch = R() < 0.62 ? GLYPHS[(R() * GLYPHS.length) | 0] : "";
        g.a = (0.05 + R() * 0.11).toFixed(3);
        drawCell(c, r);
      }
    }

    /* -- notes -- */
    var NOTE_W = 154, NOTE_H = 34;
    function amount() { return (0.0068 + R() * 0.0124); }
    function makeNote(x, y, mine, rnd) {
      return {
        x: x, y: y, mine: mine, round: rnd, amt: amount(),
        s1: rg(7) + " " + rg(3) + " " + rg(6), s2: rg(5) + " " + rg(4) + " " + rg(11),
        born: 0, life: 1, dying: false, reveal: 0, flash: 0
      };
    }
    function overlaps(x, y, pad) {
      for (var i = 0; i < notes.length; i++) {
        var n = notes[i]; if (n.dying) continue;
        if (x < n.x + NOTE_W + pad && x + NOTE_W + pad > n.x && y < n.y + NOTE_H + pad && y + NOTE_H + pad > n.y) return true;
      }
      return false;
    }
    function freeSpot() {
      for (var t = 0; t < 80; t++) {
        var x = 18 + R() * Math.max(1, W - NOTE_W - 30), y = 28 + R() * Math.max(1, H - NOTE_H - 56);
        if (!overlaps(x, y, 20)) return { x: x, y: y };
      }
      return null;
    }
    function buildNotes() {
      notes = [];
      var count = clamp(Math.floor(W * H / 27000), 6, 13);
      for (var i = 0; i < count; i++) {
        var p = freeSpot(); if (!p) break;
        var mine = (i === 1 || i === Math.floor(count * 0.6));
        notes.push(makeNote(p.x, p.y, mine, round - 1 - (i % 4)));
      }
      if (notes.length && !notes.some(function (n) { return n.mine; })) notes[0].mine = true;
      notes.forEach(function (n) { n.born = -1e6; });
    }
    function buildSpecks() {
      specks = [];
      var n = clamp(Math.floor(W * H / 14000), 14, 34);
      for (var i = 0; i < n; i++) specks.push({ x: R() * W, y: R() * H, vx: (R() - 0.5) * 4, vy: -2 - R() * 5, s: 0.5 + R() * 1.1, ph: R() * 6.28, sp: 0.6 + R() * 1.4 });
    }

    /* -- size -- */
    function resize() {
      var w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      var d = Math.min(window.devicePixelRatio || 1, 2);
      var changed = (w !== W || h !== H || d !== DPR);
      W = w; H = h; DPR = d;
      if (!changed && off) return;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      L.r = clamp(Math.min(W, H) * 0.23, 88, 112);
      NOTE_W = W < 480 ? 140 : 154;
      buildField(); buildNotes(); buildSpecks();
      var m = mineNotes()[0];
      if (m) { L.x = L.tx = m.x + NOTE_W / 2; L.y = L.ty = m.y + NOTE_H / 2; }
      else { L.x = L.tx = W * 0.6; L.y = L.ty = H * 0.5; }
      if (reduce) { notes.forEach(function (n) { n.reveal = inLens(n) ? 1 : 0; }); render(0, performance.now()); }
    }
    function mineNotes() { return notes.filter(function (n) { return n.mine && !n.dying; }); }
    function inLens(n) {
      var cx = n.x + NOTE_W / 2, cy = n.y + NOTE_H / 2;
      var dx = Math.abs(cx - L.x), dy = Math.abs(cy - L.y);
      return dx < L.r * 0.62 && dy < L.r * 0.62;
    }

    /* -- round pulse: fees converge into one shielded tx, outputs land as notes -- */
    function startPulse(now) {
      var hub = { x: W * (0.38 + R() * 0.24), y: H * (0.38 + R() * 0.24) };
      var srcs = [], k = 6;
      for (var i = 0; i < k; i++) {
        var side = i % 4, p;
        if (side === 0) p = { x: R() * W, y: -10 };
        else if (side === 1) p = { x: W + 10, y: R() * H };
        else if (side === 2) p = { x: R() * W, y: H + 10 };
        else p = { x: -10, y: R() * H };
        srcs.push(p);
      }
      // retire the 3 oldest non-mine notes + the oldest mine note if there are many
      var alive = notes.filter(function (n) { return !n.dying; }).sort(function (a, b) { return a.round - b.round; });
      var retire = 0;
      for (var j = 0; j < alive.length && retire < 3; j++) {
        var n = alive[j];
        if (n.mine && mineNotes().length <= 2) continue;
        if (Math.abs(n.x + NOTE_W / 2 - L.x) < L.r && Math.abs(n.y + NOTE_H / 2 - L.y) < L.r) continue; // never pull a note out from under the lens
        n.dying = true; n.dieAt = now; retire++;
      }
      var outs = [];
      for (var q = 0; q < 3; q++) { var sp = freeSpot(); if (sp) { outs.push(sp); notes.push({ x: sp.x, y: sp.y, dying: false, placeholder: true }); } }
      notes = notes.filter(function (n) { return !n.placeholder; });
      pulse = { t0: now, hub: hub, srcs: srcs, outs: outs, spawned: false, mineIdx: (R() * outs.length) | 0 };
      lines = [];
      srcs.forEach(function (s, i) { lines.push({ a: s, b: hub, t0: now + i * 60, dur: 950 }); });
    }
    function stepPulse(now) {
      if (!pulse) return;
      var t = now - pulse.t0;
      if (t > 1050 && !pulse.hubbed) {
        pulse.hubbed = true; round++;
        if (roundEl) roundEl.textContent = fmtInt(round);
        rings.push({ x: pulse.hub.x, y: pulse.hub.y, t0: now });
        pulse.outs.forEach(function (o, i) { lines.push({ a: pulse.hub, b: { x: o.x + NOTE_W / 2, y: o.y + NOTE_H / 2 }, t0: now + i * 40, dur: 520, out: true }); });
      }
      if (t > 1600 && !pulse.spawned) {
        pulse.spawned = true;
        pulse.outs.forEach(function (o, i) {
          var n = makeNote(o.x, o.y, i === pulse.mineIdx, round);
          n.born = now; n.flash = 1; notes.push(n);
        });
      }
      if (t > 2600) pulse = null;
    }

    /* -- autopilot: visit your notes, then show a stranger's note stays locked -- */
    function autopilot(now) {
      if (L.manual || now - L.lastInput < 2600) return;
      if (now < L.auto.until) return;
      var mine = mineNotes(), other = notes.filter(function (n) { return !n.mine && !n.dying && n.born < now - 1500; });
      var pick;
      if (L.auto.mode === "mine" && mine.length) { pick = mine[L.auto.i++ % mine.length]; L.auto.mode = "other"; L.auto.until = now + 3600; }
      else if (other.length) {
        other.sort(function (a, b) { return Math.hypot(a.x - L.x, a.y - L.y) - Math.hypot(b.x - L.x, b.y - L.y); });
        pick = other[Math.min(other.length - 1, 1)]; L.auto.mode = "mine"; L.auto.until = now + 2600;
      }
      if (pick) { L.tx = clamp(pick.x + NOTE_W / 2, L.r * 0.8, W - L.r * 0.8); L.ty = clamp(pick.y + NOTE_H / 2, L.r * 0.8, H - L.r * 0.8); }
    }

    /* -- drawing -- */
    function drawFieldLayer(alphaBoost) {
      var y = -(drift % fieldH);
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, y, cols * cw, fieldH);
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, y + fieldH, cols * cw, fieldH);
      if (alphaBoost) {
        ctx.globalAlpha = alphaBoost;
        ctx.drawImage(off, 0, 0, off.width, off.height, 0, y, cols * cw, fieldH);
        ctx.drawImage(off, 0, 0, off.width, off.height, 0, y + fieldH, cols * cw, fieldH);
        ctx.globalAlpha = 1;
      }
    }
    function noteAlpha(n, now) {
      var a = 1;
      if (n.born > 0) a = Math.min(1, (now - n.born) / 700);
      if (n.dying) a *= Math.max(0, 1 - (now - n.dieAt) / 900);
      return a;
    }
    function drawScrambled(n, now, inside) {
      var a = noteAlpha(n, now); if (a <= 0) return;
      var fl = n.flash || 0;
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = inside ? "#08080D" : "#07070B";
      ctx.fillRect(n.x - 6, n.y - 3, NOTE_W - 6, NOTE_H + 2);
      ctx.globalAlpha = 1;
      ctx.font = "500 12px " + MONO;
      var base = inside ? 0.42 : 0.26;
      if (fl > 0.01) {
        ctx.fillStyle = "rgba(242,164,23," + (a * (base + 0.5 * fl)).toFixed(3) + ")";
      } else ctx.fillStyle = "rgba(186,180,202," + (a * base).toFixed(3) + ")";
      ctx.fillText(n.s1, n.x, n.y + 9);
      ctx.font = "400 10px " + MONO;
      ctx.fillStyle = fl > 0.01 ? "rgba(242,164,23," + (a * (base * 0.7 + 0.35 * fl)).toFixed(3) + ")" : "rgba(160,154,176," + (a * base * 0.72).toFixed(3) + ")";
      ctx.fillText(n.s2, n.x, n.y + 26);
    }
    var goldGrad = null;
    function mixText(plain, scr, rev) {
      var k = Math.floor(plain.length * rev), out = plain.slice(0, k);
      for (var i = k; i < plain.length; i++) out += plain[i] === " " ? " " : scr[i % scr.length];
      return out;
    }
    var frameGold = [], frameLabels = [];
    function goldRect(n) { return { x: n.x - 9, y: n.y - 7, w: NOTE_W + 8, h: NOTE_H + 12 }; }
    function labelRect(n) { return { x: n.x + NOTE_W - 82, y: n.y - 17, w: 70, h: 12 }; }
    function gap(a, b) {
      var dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
      var dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
      return Math.sqrt(dx * dx + dy * dy);
    }
    function nearGold(rect) { for (var i = 0; i < frameGold.length; i++) if (gap(rect, frameGold[i]) < 40) return true; return false; }
    function drawResolved(n, now) {
      var a = noteAlpha(n, now); if (a <= 0) return;
      var rev = n.reveal > 0.96 ? 1 : n.reveal;
      if (n.mine) {
        var l1 = "+" + n.amt.toFixed(4) + " ZEC";
        var l2 = "round " + fmtInt(n.round) + DOT + SAMPLE_UA_SHORT;
        var t1 = mixText(l1, n.s1, rev), t2 = mixText(l2, n.s2 + n.s1, rev);
        ctx.globalAlpha = a * 0.9; ctx.fillStyle = "#08080D"; ctx.fillRect(n.x - 6, n.y - 3, NOTE_W - 6, NOTE_H + 2); ctx.globalAlpha = 1;
        if (rev > 0.05) {
          ctx.globalAlpha = a * Math.min(1, rev * 1.4);
          ctx.fillStyle = "#0B0A0E";
          rrect(n.x - 9, n.y - 7, NOTE_W + 8, NOTE_H + 12, 7); ctx.fill();
          ctx.fillStyle = "rgba(242,164,23,0.07)";
          rrect(n.x - 9, n.y - 7, NOTE_W + 8, NOTE_H + 12, 7); ctx.fill();
          ctx.strokeStyle = "rgba(242,164,23,0.38)"; ctx.lineWidth = 1;
          rrect(n.x - 8.5, n.y - 6.5, NOTE_W + 7, NOTE_H + 11, 7); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        goldGrad = ctx.createLinearGradient(n.x, n.y, n.x + NOTE_W, n.y + NOTE_H);
        goldGrad.addColorStop(0, "#FFE49A"); goldGrad.addColorStop(0.6, "#F2A417"); goldGrad.addColorStop(1, "#D98912");
        ctx.globalAlpha = a * (0.45 + 0.55 * rev);
        ctx.font = "600 14px " + MONO;
        ctx.fillStyle = rev > 0.02 ? goldGrad : "rgba(200,194,216,.5)";
        ctx.fillText(t1, n.x, n.y + 8);
        ctx.font = "400 10px " + MONO;
        ctx.fillStyle = rev > 0.02 ? "rgba(242,190,90,.85)" : "rgba(170,164,186,.45)";
        ctx.fillText(t2, n.x, n.y + 26);
        ctx.globalAlpha = 1;
      } else {
        // stays encrypted; shimmer + "not yours"
        if (R() < 0.35) { var i = (R() * n.s1.length) | 0; if (n.s1[i] !== " ") n.s1 = n.s1.slice(0, i) + GLYPHS[(R() * GLYPHS.length) | 0] + n.s1.slice(i + 1); }
        var lab = labelRect(n), showLab = rev > 0.05 && !nearGold(lab);
        if (showLab) {
          // one card: plate + label strip, so the label belongs to this scrambled note
          ctx.globalAlpha = a * Math.min(1, rev * 1.3);
          ctx.fillStyle = "#0A0A0F";
          rrect(n.x - 8, n.y - 21, NOTE_W - 2, NOTE_H + 26, 6); ctx.fill();
          ctx.strokeStyle = "rgba(140,135,152,.28)"; ctx.lineWidth = 1;
          rrect(n.x - 7.5, n.y - 20.5, NOTE_W - 3, NOTE_H + 25, 6); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        drawScrambled(n, now, true);
        if (showLab) {
          ctx.globalAlpha = a * Math.min(1, rev * 1.3);
          var lx = lab.x, ly = lab.y + lab.h / 2;
          ctx.strokeStyle = "rgba(140,135,152,.75)"; ctx.lineWidth = 1;
          ctx.strokeRect(lx + 0.5, ly - 1.5, 6, 5);
          ctx.beginPath(); ctx.arc(lx + 3.5, ly - 2, 2.2, Math.PI, 0); ctx.stroke();
          ctx.font = "500 9px " + MONO; ctx.fillStyle = "rgba(160,154,176,.95)";
          ctx.fillText("NOT YOURS", lx + 11, ly + 0.5);
          ctx.globalAlpha = 1;
          frameLabels.push(lab);
        }
      }
    }
    function rrect(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    function drawLine(ln, now) {
      var t = (now - ln.t0) / ln.dur; if (t <= 0) return;
      var head = Math.min(1, t < 1 ? (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) : 1);
      var len = Math.hypot(ln.b.x - ln.a.x, ln.b.y - ln.a.y) || 1;
      var tailLen = ln.out ? 70 : 120, tail = Math.max(0, head - tailLen / len);
      var fade = t > 1 ? Math.max(0, 1 - (t - 1) * 3.5) : 1;
      if (fade <= 0) return;
      if (t > 1) tail = Math.min(head, tail + (t - 1) * 2.2);
      var x0 = ln.a.x + (ln.b.x - ln.a.x) * tail, y0 = ln.a.y + (ln.b.y - ln.a.y) * tail;
      var x1 = ln.a.x + (ln.b.x - ln.a.x) * head, y1 = ln.a.y + (ln.b.y - ln.a.y) * head;
      var g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "rgba(242,164,23,0)"); g.addColorStop(1, "rgba(255,214,120," + (0.85 * fade).toFixed(3) + ")");
      ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      if (head < 1) { ctx.fillStyle = "rgba(255,228,154," + (0.9 * fade).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(x1, y1, 1.3, 0, 6.283); ctx.fill(); }
    }
    function drawRing(rn, now) {
      var t = (now - rn.t0) / 900; if (t > 1) return false;
      var e = 1 - Math.pow(1 - t, 3);
      ctx.strokeStyle = "rgba(255,214,120," + (0.7 * (1 - t)).toFixed(3) + ")"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(rn.x, rn.y, 3 + e * 26, 0, 6.283); ctx.stroke();
      ctx.fillStyle = "rgba(255,228,154," + (0.9 * (1 - t)).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(rn.x, rn.y, 2.2 * (1 - t) + 0.6, 0, 6.283); ctx.fill();
      return true;
    }

    function render(dt, now) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#07070B"; ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = "middle";
      drawFieldLayer(0);

      // specks
      for (var i = 0; i < specks.length; i++) {
        var s = specks[i];
        if (!reduce) { s.x += s.vx * dt; s.y += s.vy * dt; if (s.y < -4) { s.y = H + 4; s.x = R() * W; } if (s.x < -4) s.x = W + 4; if (s.x > W + 4) s.x = -4; }
        var tw = 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(now / 1000 * s.sp + s.ph));
        ctx.fillStyle = "rgba(242,164,23," + tw.toFixed(3) + ")";
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }

      // notes (encrypted)
      for (var j = 0; j < notes.length; j++) drawScrambled(notes[j], now, false);

      // round pulse
      for (var k = 0; k < lines.length; k++) drawLine(lines[k], now);
      rings = rings.filter(function (rn) { return drawRing(rn, now); });

      // vignette
      var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(5,5,8,0)"); vg.addColorStop(1, "rgba(5,5,8,.78)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      // lens
      var r = L.r, M = 1.08;
      ctx.save();
      ctx.beginPath(); ctx.arc(L.x, L.y, r, 0, 6.283); ctx.clip();
      ctx.fillStyle = "#08080D"; ctx.fillRect(L.x - r, L.y - r, r * 2, r * 2);
      ctx.translate(L.x, L.y); ctx.scale(M, M); ctx.translate(-L.x, -L.y);
      drawFieldLayer(0.35);
            var vis = notes.filter(function (n) {
        return Math.abs(n.x + NOTE_W / 2 - L.x) < r + NOTE_W && Math.abs(n.y + NOTE_H / 2 - L.y) < r + NOTE_H;
      });
      frameGold = []; frameLabels = [];
      vis.forEach(function (n) { if (n.mine && n.reveal > 0.05 && noteAlpha(n, now) > 0) frameGold.push(goldRect(n)); });
      vis.forEach(function (n) { if (!n.mine) drawResolved(n, now); });
      vis.forEach(function (n) { if (n.mine) drawResolved(n, now); });
      ctx.restore();
      // lens depth
      ctx.save();
      ctx.beginPath(); ctx.arc(L.x, L.y, r, 0, 6.283); ctx.clip();
      var ig = ctx.createRadialGradient(L.x, L.y, r * 0.7, L.x, L.y, r);
      ig.addColorStop(0, "rgba(0,0,0,0)"); ig.addColorStop(1, "rgba(0,0,0,.45)");
      ctx.fillStyle = ig; ctx.fillRect(L.x - r, L.y - r, r * 2, r * 2);
      var hl = ctx.createLinearGradient(L.x - r, L.y - r, L.x + r * 0.2, L.y + r * 0.2);
      hl.addColorStop(0, "rgba(255,240,200,.06)"); hl.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = hl; ctx.fillRect(L.x - r, L.y - r, r * 2, r * 2);
      ctx.restore();
      // rim
      var og = ctx.createRadialGradient(L.x, L.y, r - 1, L.x, L.y, r + 16);
      og.addColorStop(0, "rgba(242,164,23,.075)"); og.addColorStop(1, "rgba(242,164,23,0)");
      ctx.fillStyle = og; ctx.beginPath(); ctx.arc(L.x, L.y, r + 16, 0, 6.283); ctx.arc(L.x, L.y, r, 0, 6.283, true); ctx.fill();
      var rimG = ctx.createLinearGradient(L.x - r, L.y - r, L.x + r, L.y + r);
      rimG.addColorStop(0, "rgba(255,228,154,.95)"); rimG.addColorStop(0.55, "rgba(242,164,23,.75)"); rimG.addColorStop(1, "rgba(201,120,10,.55)");
      ctx.strokeStyle = rimG; ctx.lineWidth = 1.25; ctx.beginPath(); ctx.arc(L.x, L.y, r, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = "rgba(255,228,154,.12)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(L.x, L.y, r - 5, 0, 6.283); ctx.stroke();
      // key label under the lens
      ctx.font = "500 9.5px " + MONO; ctx.textBaseline = "middle";
      var lab = "VIEWING KEY" + DOT + SAMPLE_UA_SHORT, lw = ctx.measureText(lab).width;
      var ly = L.y + r + 16; if (ly > H - 8) ly = L.y - r - 16;
      var lx = clamp(L.x - lw / 2, 8, W - lw - 8);
      ctx.fillStyle = "rgba(242,190,90,.72)"; ctx.fillText(lab, lx, ly);
    }

    function tick(now) {
      raf = 0;
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
      drift += dt * 7;
      mutateField(Math.max(2, Math.round(cols * rows / 650)));
      // scramble notes slowly
      if (R() < 0.5) { var n0 = notes[(R() * notes.length) | 0]; if (n0) { var i = (R() * n0.s2.length) | 0; if (n0.s2[i] !== " ") n0.s2 = n0.s2.slice(0, i) + GLYPHS[(R() * GLYPHS.length) | 0] + n0.s2.slice(i + 1); } }
      if (now >= nextPulse) { startPulse(now); nextPulse = now + 8000; }
      stepPulse(now);
      autopilot(now);
      var k = 1 - Math.exp(-dt * ((L.manual || now - L.lastInput < 1500) ? 16 : 3.2));
      L.x += (L.tx - L.x) * k; L.y += (L.ty - L.y) * k;
      for (var j = 0; j < notes.length; j++) {
        var n = notes[j];
        var target = inLens(n) ? 1 : 0;
        n.reveal += (target - n.reveal) * (1 - Math.exp(-dt * (target ? 5 : 9)));
        if (n.flash) n.flash = Math.max(0, n.flash - dt * 0.8);
      }
      notes = notes.filter(function (n) { return !(n.dying && now - n.dieAt > 950); });
      lines = lines.filter(function (ln) { return now - ln.t0 < ln.dur + 400; });
      render(dt, now);
      raf = requestAnimationFrame(tick);
    }
    function start() {
      if (reduce) { render(0, performance.now()); return; }
      if (running || !visible || document.hidden) return;
      running = true; last = performance.now();
      if (!nextPulse) nextPulse = last + 2200;
      raf = requestAnimationFrame(tick);
    }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

    /* -- input -- */
    function pos(e) { var b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    function aim(e) {
      var p = pos(e);
      L.tx = clamp(p.x, 0, W); L.ty = clamp(p.y, 0, H);
      L.lastInput = performance.now();
      if (!interacted) { interacted = true; if (hintEl) hintEl.style.opacity = "0.55"; }
      if (reduce) { L.x = L.tx; L.y = L.ty; notes.forEach(function (n) { n.reveal = inLens(n) ? 1 : 0; }); render(0, performance.now()); }
    }
    stage.addEventListener("pointermove", function (e) {
      if (e.pointerType === "mouse") { L.manual = true; aim(e); }
      else if (L.manual) aim(e);
    });
    stage.addEventListener("pointerdown", function (e) { L.manual = true; aim(e); });
    stage.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { L.manual = false; L.lastInput = performance.now(); L.auto.until = 0; } });
    function release(e) { if (e.pointerType !== "mouse") { L.manual = false; L.lastInput = performance.now(); L.auto.until = 0; } }
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    if (window.IntersectionObserver) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.01 }).observe(stage);
    if (reduceMQ.addEventListener) reduceMQ.addEventListener("change", function (e) { reduce = e.matches; if (reduce) { stop(); notes.forEach(function (n) { n.reveal = inLens(n) ? 1 : 0; n.flash = 0; }); render(0, performance.now()); } else start(); });
    if (window.ResizeObserver) new ResizeObserver(function () { resize(); }).observe(stage); else window.addEventListener("resize", resize);

    window.__zyLens = { frame: function () { return { gold: frameGold.slice(), labels: frameLabels.slice() }; }, get: function () { return { x: L.x, y: L.y, tx: L.tx, ty: L.ty, r: L.r, W: W, H: H, running: running, round: round, mine: mineNotes().map(function (n) { return { x: n.x + NOTE_W / 2, y: n.y + NOTE_H / 2, reveal: n.reveal }; }), other: notes.filter(function (n) { return !n.mine; }).map(function (n) { return { x: n.x + NOTE_W / 2, y: n.y + NOTE_H / 2, reveal: n.reveal }; }) }; } };

    function boot() { resize(); start(); }
    if (document.fonts && document.fonts.load) {
      Promise.race([document.fonts.load('500 12px "JetBrains Mono"'), new Promise(function (r) { setTimeout(r, 1200); })]).then(function () { off = null; W = 0; boot(); }, boot);
      boot();
    } else boot();
  })();
})();
