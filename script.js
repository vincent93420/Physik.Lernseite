// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);

function round(n, digits = 2) {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return "–";
  return round(n, digits).toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// ---------- Mobile Nav ----------
(function initNav(){
  const btn = $("#navToggle");
  const nav = $("#nav");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(isOpen));
  });

  // close on click
  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  });
})();

// ---------- Temperature Conversion ----------
function toC(value, unit) {
  if (unit === "C") return value;
  if (unit === "K") return value - 273.15;
  if (unit === "F") return (value - 32) * (5/9);
  return NaN;
}

function fromC(c) {
  return {
    C: c,
    K: c + 273.15,
    F: c * (9/5) + 32
  };
}

function updateConversion() {
  const v = Number($("#tValue").value);
  const unit = $("#tUnit").value;
  const c = toC(v, unit);
  const all = fromC(c);

  $("#outC").textContent = `${fmt(all.C, 2)} °C`;
  $("#outK").textContent = `${fmt(all.K, 2)} K`;
  $("#outF").textContent = `${fmt(all.F, 2)} °F`;
}

(function initConverter(){
  const btn = $("#convertBtn");
  if (!btn) return;
  btn.addEventListener("click", updateConversion);
  $("#tValue").addEventListener("input", updateConversion);
  $("#tUnit").addEventListener("change", updateConversion);
  updateConversion();
})();

// ---------- Particle Motion Model ----------
function setDotAnimation(speed) {
  // speed: 0..1
  const dots = ["#dot1","#dot2","#dot3","#dot4","#dot5"].map($);
  const box = $(".motion-box");
  if (!box) return;

  const rect = box.getBoundingClientRect();
  const w = Math.max(220, rect.width);
  const h = Math.max(140, rect.height);

  dots.forEach((dot, i) => {
    const phase = (i + 1) * 0.9;
    const dx = (Math.sin(Date.now()/400 + phase) * 0.5 + 0.5) * (w - 22);
    const dy = (Math.cos(Date.now()/520 + phase) * 0.5 + 0.5) * (h - 22);
    // store base position in dataset (keeps it stable-ish)
    if (!dot.dataset.baseX) {
      dot.dataset.baseX = String(dx);
      dot.dataset.baseY = String(dy);
    }
  });

  // animation loop
  let last = performance.now();
  function tick(now){
    const dt = Math.min(40, now - last);
    last = now;

    dots.forEach((dot, i) => {
      const baseX = Number(dot.dataset.baseX || 0);
      const baseY = Number(dot.dataset.baseY || 0);

      // random walk intensity depends on speed
      const jitter = 6 + 24 * speed;
      const vx = (Math.random() - 0.5) * jitter * (dt/16);
      const vy = (Math.random() - 0.5) * jitter * (dt/16);

      let x = Number(dot.dataset.x || baseX) + vx;
      let y = Number(dot.dataset.y || baseY) + vy;

      x = Math.max(6, Math.min(w - 18, x));
      y = Math.max(6, Math.min(h - 18, y));

      dot.dataset.x = String(x);
      dot.dataset.y = String(y);

      dot.style.left = `${x}px`;
      dot.style.top  = `${y}px`;
    });

    requestAnimationFrame(tick);
  }

  // prevent multiple loops
  if (!window.__dotAnimStarted) {
    window.__dotAnimStarted = true;
    requestAnimationFrame(tick);
  }
}

function updateParticleUI(){
  const t = Number($("#tempSlider").value);
  $("#tempLabel").textContent = String(t);

  const k = t + 273.15;
  $("#kelvinLabel").textContent = fmt(k, 2);

  // map -20..120°C to 0..1
  const speed = (t + 20) / 140;
  setDotAnimation(Math.max(0, Math.min(1, speed)));
}

(function initParticles(){
  const s = $("#tempSlider");
  if (!s) return;
  s.addEventListener("input", updateParticleUI);
  updateParticleUI();
})();

// ---------- Expansion Calculator ----------
function getAlpha(){
  const sel = $("#alpha").value;
  if (sel === "custom") return Number($("#alphaCustom").value);
  return Number(sel);
}

function updateAlphaCustomVisibility(){
  const isCustom = $("#alpha").value === "custom";
  $("#alphaCustomRow").style.display = isCustom ? "grid" : "none";
}

function calcExpansion(){
  const L0 = Number($("#L0").value);
  const dT = Number($("#dT").value);
  const alpha = getAlpha();

  const dL = alpha * L0 * dT;
  const Lnew = L0 + dL;

  // show also in mm for feel
  const dLmm = dL * 1000;

  $("#outDL").textContent = `${fmt(dL, 6)} m  (≈ ${fmt(dLmm, 2)} mm)`;
  $("#outLNew").textContent = `${fmt(Lnew, 6)} m`;
}

(function initExpansion(){
  if (!$("#expandBtn")) return;
  $("#alpha").addEventListener("change", () => {
    updateAlphaCustomVisibility();
    calcExpansion();
  });
  $("#alphaCustom").addEventListener("input", calcExpansion);
  $("#L0").addEventListener("input", calcExpansion);
  $("#dT").addEventListener("input", calcExpansion);
  $("#expandBtn").addEventListener("click", calcExpansion);

  updateAlphaCustomVisibility();
  calcExpansion();
})();

// ---------- Water anomaly mini model ----------
function updateWater(){
  const t = Number($("#waterTemp").value);
  $("#waterTempLabel").textContent = String(t);

  const behavior = $("#waterBehavior");
  const layerCold = $("#layerCold");
  const layerWarm = $("#layerWarm");
  const fish = $(".lake-fish");

  // very simplified:
  // - from 30 down to 4: colder water becomes denser => sinks
  // - from 4 down to 0: colder water becomes less dense => rises
  // - below 0: ice floats (less dense)
  let text = "";
  if (t > 4) {
    text = "Wenn es abkühlt Richtung 4°C: wird dichter → sinkt eher.";
    layerCold.textContent = "kälter (dichter)";
    layerWarm.textContent = "wärmer (leichter)";
    fish.style.bottom = "10px";
  } else if (t >= 0) {
    text = "Unter 4°C Richtung 0°C: wird weniger dicht → steigt eher.";
    layerCold.textContent = "kälter (leichter)";
    layerWarm.textContent = "wärmer (dichter)";
    fish.style.bottom = "18px";
  } else {
    text = "Unter 0°C: Eis entsteht und schwimmt (geringere Dichte).";
    layerCold.textContent = "Eis/0°C (schwimmt)";
    layerWarm.textContent = "Wasser (~4°C unten)";
    fish.style.bottom = "12px";
  }

  behavior.textContent = text;

  // make the top layer visually "bigger" when near freezing
  const coldHeight = (t <= 0) ? 62 : (t <= 4 ? 58 : 55);
  layerCold.style.height = `${coldHeight}%`;
  layerWarm.style.height = `${100 - coldHeight}%`;
}

(function initWater(){
  const s = $("#waterTemp");
  if (!s) return;
  s.addEventListener("input", updateWater);
  updateWater();
})();

// ---------- Quiz + Progress (localStorage) ----------
const LS_KEY = "learnsite_quiz_done_v1";
const totalQuizzes = 4;

function loadDone(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  }catch{
    return {};
  }
}

function saveDone(done){
  localStorage.setItem(LS_KEY, JSON.stringify(done));
}

function setFeedback(id, ok, msg){
  const el = $(`#fb${id}`);
  el.classList.remove("good","bad");
  el.classList.add(ok ? "good" : "bad");
  el.textContent = msg;
}

function updateProgress(){
  const done = loadDone();
  const count = Object.values(done).filter(Boolean).length;

  $("#progressText").textContent = String(count);
  const pct = Math.round((count / totalQuizzes) * 100);
  $("#progressBar").style.width = `${pct}%`;
}

function markDone(id){
  const done = loadDone();
  done[String(id)] = true;
  saveDone(done);
  updateProgress();
}

function checkQuiz(id){
  if (id === 1){
    const v = Number($("#q1").value);
    // 25°C -> 298.15 K
    const ok = Math.abs(v - 298.15) <= 0.2;
    if (ok){
      setFeedback(1, true, "Richtig: 25°C + 273,15 = 298,15 K.");
      markDone(1);
    } else {
      setFeedback(1, false, "Fast. Denk an: K = °C + 273,15. (Bei 25°C kommt 298,15 K raus.)");
    }
  }

  if (id === 2){
    const v = $("#q2").value;
    const ok = (v === "b");
    if (ok){
      setFeedback(2, true, "Genau. Kelvin ist absolut: 0 K ist der absolute Nullpunkt.");
      markDone(2);
    } else {
      setFeedback(2, false, "Nicht ganz. Kelvin ist wichtig, weil es eine absolute Skala ist (0 K = absoluter Nullpunkt).");
    }
  }

  if (id === 3){
    const v = $("#q3").value;
    const ok = (v === "c");
    if (ok){
      setFeedback(3, true, "Richtig. Beim Erwärmen dehnen sich Metalle normalerweise aus (werden länger).");
      markDone(3);
    } else {
      setFeedback(3, false, "Nope. Normalerweise gilt: wärmer → Teilchenabstände minimal größer → Länge nimmt zu.");
    }
  }

  if (id === 4){
    const v = Number($("#q4").value);
    const ok = Math.abs(v - 4) <= 0.5;
    if (ok){
      setFeedback(4, true, "Richtig: Wasser hat bei ca. 4°C die höchste Dichte.");
      markDone(4);
    } else {
      setFeedback(4, false, "Nicht ganz. Der Spezialpunkt ist ungefähr 4°C (Dichte-Maximum).");
    }
  }
}

(function initQuiz(){
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-quiz]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-quiz"));
    checkQuiz(id);
  });

  $("#resetBtn").addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    // clear feedback
    [1,2,3,4].forEach(i => {
      const fb = $(`#fb${i}`);
      fb.classList.remove("good","bad");
      fb.textContent = "";
    });
    updateProgress();
  });

  updateProgress();
})();
