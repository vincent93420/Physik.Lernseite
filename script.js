// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function formatNumber(n, decimals){
  if (!Number.isFinite(n)) return "–";
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
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

  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;
    nav.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  });
})();

// ---------- Temperature Conversion (exakt gerechnet, nur Anzeige gerundet) ----------
function toC(value, unit) {
  if (unit === "C") return value;
  if (unit === "K") return value - 273.15;
  if (unit === "F") return (value - 32) * (5/9);
  return NaN;
}
function fromC(c) {
  return { C: c, K: c + 273.15, F: c * (9/5) + 32 };
}

function updateConversion() {
  const v = Number($("#tValue").value);
  const unit = $("#tUnit").value;
  const decimals = Number($("#decimals").value);

  const c = toC(v, unit);
  const all = fromC(c);

  $("#outC").textContent = `${formatNumber(all.C, decimals)} °C`;
  $("#outK").textContent = `${formatNumber(all.K, decimals)} K`;
  $("#outF").textContent = `${formatNumber(all.F, decimals)} °F`;
}

(function initConverter(){
  const btn = $("#convertBtn");
  if (!btn) return;
  ["input","change"].forEach(ev => {
    $("#tValue").addEventListener(ev, updateConversion);
    $("#tUnit").addEventListener(ev, updateConversion);
    $("#decimals").addEventListener(ev, updateConversion);
  });
  btn.addEventListener("click", updateConversion);
  updateConversion();
})();

// ---------- Particle Motion Model ----------
function setDotAnimation(speed) {
  const dots = ["#dot1","#dot2","#dot3","#dot4","#dot5"].map($);
  const box = $(".motion-box");
  if (!box) return;

  const rect = box.getBoundingClientRect();
  const w = Math.max(220, rect.width);
  const h = Math.max(140, rect.height);

  let last = performance.now();
  function tick(now){
    const dt = Math.min(40, now - last);
    last = now;

    dots.forEach((dot, i) => {
      if (!dot) return;

      // initial position
      if (!dot.dataset.x){
        dot.dataset.x = String(10 + (i*35) % (w-20));
        dot.dataset.y = String(20 + (i*25) % (h-20));
      }

      const jitter = 5 + 28 * speed; // speed 0..1
      let x = Number(dot.dataset.x) + (Math.random() - 0.5) * jitter * (dt/16);
      let y = Number(dot.dataset.y) + (Math.random() - 0.5) * jitter * (dt/16);

      x = clamp(x, 6, w - 18);
      y = clamp(y, 6, h - 18);

      dot.dataset.x = String(x);
      dot.dataset.y = String(y);
      dot.style.left = `${x}px`;
      dot.style.top  = `${y}px`;
    });

    requestAnimationFrame(tick);
  }

  if (!window.__dotAnimStarted) {
    window.__dotAnimStarted = true;
    requestAnimationFrame(tick);
  }
}

function updateParticleUI(){
  const t = Number($("#tempSlider").value);
  $("#tempLabel").textContent = String(t);

  const k = t + 273.15;
  $("#kelvinLabel").textContent = formatNumber(k, 2);

  const speed = clamp((t + 20) / 140, 0, 1);
  setDotAnimation(speed);
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

  $("#outDL").textContent = `${formatNumber(dL, 6)} m (≈ ${formatNumber(dL*1000, 2)} mm)`;
  $("#outLNew").textContent = `${formatNumber(Lnew, 6)} m`;
}
(function initExpansion(){
  if (!$("#expandBtn")) return;
  $("#alpha").addEventListener("change", () => { updateAlphaCustomVisibility(); calcExpansion(); });
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
  const fish = document.querySelector(".lake-fish");

  let text = "";
  if (t > 4) {
    text = "Beim Abkühlen Richtung 4°C: wird dichter → sinkt eher.";
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

// ---------- Quiz Engine (mehrere Aufgaben pro Thema) ----------
const LS_KEY = "learnsite_quiz_v2";
const PER_BLOCK = 5; // Anzahl Fragen pro Thema (kannst du hochsetzen)

function loadState(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch{ return {}; }
}
function saveState(s){ localStorage.setItem(LS_KEY, JSON.stringify(s)); }

function updateGlobalProgress(){
  const state = loadState();
  const blocks = Object.values(state);
  let correct = 0, total = 0;
  blocks.forEach(b => {
    if (!b) return;
    correct += (b.correct || 0);
    total   += (b.answered || 0);
  });
  $("#progressText").textContent = String(correct);
  $("#progressTotal").textContent = String(total);
  const pct = total === 0 ? 0 : Math.round((correct/total)*100);
  $("#progressBar").style.width = `${pct}%`;
}

function shuffle(arr){
  const a = [...arr];
  for (let i = a.length-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fragenpools (du kannst jederzeit erweitern)
const quizPools = {
  skalen: [
    { type:"num", text:"Wie viel Kelvin sind 25°C?", unit:"K", answer: 298.15, tol: 0.2, explain:"K = °C + 273,15 → 25 + 273,15 = 298,15 K." },
    { type:"num", text:"Wie viel °C sind 77°F?", unit:"°C", answer: 25, tol: 0.2, explain:"°C = (°F − 32)·5/9 → (77−32)·5/9 = 25°C." },
    { type:"num", text:"Wie viel °F sind 0°C?", unit:"°F", answer: 32, tol: 0.2, explain:"°F = °C·9/5 + 32 → 0 + 32 = 32°F." },
    { type:"num", text:"Wie viel °C sind 300 K?", unit:"°C", answer: 26.85, tol: 0.2, explain:"°C = K − 273,15 → 300−273,15 = 26,85°C." },
    { type:"mc",  text:"Welche Aussage ist richtig?", options:[
      "Kelvin hat ein Gradzeichen (°K).",
      "0 K ist der absolute Nullpunkt.",
      "0°C ist der absolute Nullpunkt."
    ], correct:1, explain:"Kelvin ist absolut: 0 K = absoluter Nullpunkt." },
    { type:"mc", text:"Was ist bei ΔT richtig?", options:[
      "ΔT in K ist immer größer als in °C.",
      "ΔT in K und °C ist als Differenz numerisch gleich.",
      "ΔT darf man nur in °F angeben."
    ], correct:1, explain:"Differenzen: 10°C Unterschied = 10 K Unterschied." }
  ],

  teilchen: [
    { type:"mc", text:"Temperatur ist…", options:[
      "die gesamte gespeicherte Wärmeenergie eines Körpers",
      "ein Maß für die mittlere Bewegungsenergie der Teilchen",
      "immer gleich der Masse"
    ], correct:1, explain:"Temperatur: mittlere Bewegungsenergie." },
    { type:"mc", text:"Warum nutzt man in der Physik oft Kelvin?", options:[
      "weil Kelvin bei 0°C startet",
      "weil Kelvin eine absolute Skala ist (0 K als Nullpunkt)",
      "weil Celsius nur fürs Wetter ist"
    ], correct:1, explain:"Viele Formeln brauchen absolute Temperatur." },
    { type:"mc", text:"Zwei Körper haben gleiche Temperatur. Was stimmt?", options:[
      "Sie müssen gleich viel Wärmeenergie enthalten.",
      "Sie haben im Mittel gleich schnelle Teilchenbewegung.",
      "Der schwerere ist immer kälter."
    ], correct:1, explain:"Gleiche Temperatur → gleiche mittlere Bewegungsenergie, aber Wärmeenergie kann verschieden sein." },
    { type:"mc", text:"Was passiert im Teilchenmodell beim Erwärmen (fest)?", options:[
      "Teilchen werden größer",
      "Teilchen schwingen stärker um ihre Plätze",
      "Teilchen verschwinden"
    ], correct:1, explain:"Mehr Schwingung → größere mittlere Abstände → Ausdehnung." },
    { type:"mc", text:"Was ist Wärmeübertragung?", options:[
      "Energiefluss wegen Temperaturunterschied",
      "Temperaturmessung mit Thermometer",
      "Dichteänderung ohne Grund"
    ], correct:0, explain:"Wärme fließt von warm nach kalt." }
  ],

  ausdehnung: [
    { type:"mc", text:"Wie lautet die Formel der linearen Ausdehnung?", options:[
      "ΔL = α·L₀·ΔT",
      "ΔL = L₀/(α·ΔT)",
      "ΔL = α/(L₀·ΔT)"
    ], correct:0, explain:"Standardformel: ΔL = α·L₀·ΔT." },
    { type:"num", text:"Stahl: L₀ = 10 m, α = 12·10⁻⁶, ΔT = 30 K. Wie groß ist ΔL (in mm)?", unit:"mm",
      answer: 10*0.000012*30*1000, tol: 0.3, explain:"ΔL = α·L₀·ΔT = 0,000012·10·30 = 0,0036 m = 3,6 mm." },
    { type:"mc", text:"Was passiert mit einem Metallstab beim Erwärmen (normalerweise)?", options:[
      "Er wird kürzer", "Er bleibt exakt gleich", "Er wird länger"
    ], correct:2, explain:"Wärmer → Ausdehnung → länger." },
    { type:"num", text:"Alu: L₀ = 2,0 m, α = 17·10⁻⁶, ΔT = 50 K. ΔL (in mm)?", unit:"mm",
      answer: 2.0*0.000017*50*1000, tol: 0.3, explain:"ΔL = 0,000017·2·50 = 0,0017 m = 1,7 mm." },
    { type:"mc", text:"Welche Größe beeinflusst ΔL NICHT direkt?", options:[
      "α (Material)", "L₀ (Startlänge)", "Die Farbe des Stabs"
    ], correct:2, explain:"Farbe ist dafür egal." }
  ],

  wasser: [
    { type:"mc", text:"Bei welcher Temperatur hat Wasser die höchste Dichte?", options:[
      "0°C", "4°C", "100°C"
    ], correct:1, explain:"Dichte-Maximum bei ca. 4°C." },
    { type:"mc", text:"Warum friert ein See meistens von oben zu?", options:[
      "Weil warmes Wasser immer nach unten sinkt",
      "Weil Wasser unter 4°C weniger dicht wird und oben bleibt",
      "Weil Eis schwerer als Wasser ist"
    ], correct:1, explain:"Unter 4°C: weniger dicht → bleibt oben → dort friert es." },
    { type:"mc", text:"Was stimmt über Eis?", options:[
      "Eis ist dichter als Wasser und sinkt",
      "Eis ist weniger dicht und schwimmt",
      "Eis hat immer genau 4°C"
    ], correct:1, explain:"Eis schwimmt wegen geringerer Dichte." },
    { type:"mc", text:"Was passiert, wenn Wasser gefriert?", options:[
      "Volumen nimmt ab", "Volumen bleibt gleich", "Volumen nimmt zu"
    ], correct:2, explain:"Wasser dehnt sich beim Gefrieren aus." },
    { type:"mc", text:"Welche Folge ist typisch in der Natur?", options:[
      "Fische sterben immer im Winter",
      "Unten im See bleibt es oft bei ~4°C flüssig",
      "Wasser hat keine Besonderheiten"
    ], correct:1, explain:"Unten bleibt oft ~4°C, deshalb überleben Tiere." }
  ]
};

function makeQuiz(blockId){
  const titleEl = $(`#qTitle-${blockId}`);
  const idxEl   = $(`#qIdx-${blockId}`);
  const maxEl   = $(`#qMax-${blockId}`);
  const textEl  = $(`#qText-${blockId}`);
  const inputEl = $(`#qInput-${blockId}`);
  const fbEl    = $(`#qFb-${blockId}`);
  const btnCheck= $(`#qCheck-${blockId}`);
  const btnNext = $(`#qNext-${blockId}`);

  const pool = shuffle(quizPools[blockId]).slice(0, PER_BLOCK);
  let i = 0;
  let locked = false;

  const state = loadState();
  if (!state[blockId]) state[blockId] = { answered:0, correct:0 };
  saveState(state);

  maxEl.textContent = String(pool.length);

  function render(){
    locked = false;
    btnNext.disabled = true;
    fbEl.classList.remove("good","bad");
    fbEl.textContent = "";

    const q = pool[i];
    titleEl.textContent = "Frage";
    idxEl.textContent = String(i+1);
    textEl.textContent = q.text;

    inputEl.innerHTML = "";

    if (q.type === "mc"){
      const name = `mc-${blockId}`;
      q.options.forEach((opt, k) => {
        const id = `${name}-${k}`;
        const label = document.createElement("label");
        label.className = "option";
        label.innerHTML = `<input type="radio" name="${name}" id="${id}" value="${k}"> ${opt}`;
        inputEl.appendChild(label);
      });
    } else {
      const wrap = document.createElement("div");
      wrap.className = "row";
      wrap.innerHTML = `
        <label for="num-${blockId}">Antwort ${q.unit ? "(" + q.unit + ")" : ""}</label>
        <input id="num-${blockId}" type="number" step="0.01" placeholder="Zahl eingeben">
      `;
      inputEl.appendChild(wrap);
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = "Tipp: Nutze die Formeln oben und runde erst ganz am Ende.";
      inputEl.appendChild(hint);
    }
  }

  function getAnswer(){
    const q = pool[i];
    if (q.type === "mc"){
      const chosen = inputEl.querySelector("input[type=radio]:checked");
      return chosen ? Number(chosen.value) : null;
    } else {
      const v = Number($(`#num-${blockId}`)?.value);
      return Number.isFinite(v) ? v : null;
    }
  }

  function check(){
    if (locked) return;
    const q = pool[i];
    const a = getAnswer();

    if (a === null){
      fbEl.classList.remove("good","bad");
      fbEl.textContent = "Bitte erst eine Antwort auswählen/eingeben.";
      return;
    }

    locked = true;

    let ok = false;
    if (q.type === "mc"){
      ok = (a === q.correct);
    } else {
      ok = Math.abs(a - q.answer) <= (q.tol ?? 0.2);
    }

    const s = loadState();
    s[blockId].answered = (s[blockId].answered || 0) + 1;
    if (ok) s[blockId].correct = (s[blockId].correct || 0) + 1;
    saveState(s);
    updateGlobalProgress();

    fbEl.classList.add(ok ? "good" : "bad");
    fbEl.textContent = ok ? `Richtig. ${q.explain}` : `Nicht ganz. ${q.explain}`;

    btnNext.disabled = false;
  }

  function next(){
    if (i < pool.length - 1){
      i++;
      render();
    } else {
      // Ende
      btnNext.disabled = true;
      btnCheck.disabled = true;

      const s = loadState();
      const a = s[blockId].answered || 0;
      const c = s[blockId].correct || 0;

      fbEl.classList.remove("good","bad");
      fbEl.classList.add("good");
      fbEl.textContent = `Fertig! In diesem Block: ${c}/${a} richtig. Du kannst die Seite neu laden für neue Zufallsfragen.`;
    }
  }

  btnCheck.addEventListener("click", check);
  btnNext.addEventListener("click", next);

  render();
}

(function initAllQuizzes(){
  ["skalen","teilchen","ausdehnung","wasser"].forEach(makeQuiz);
  updateGlobalProgress();

  $("#resetBtn").addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    location.reload();
  });
})();
