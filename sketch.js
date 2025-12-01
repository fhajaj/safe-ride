// ========== ISI Safe Ride – Sound Demo (stacked layout, local model) ==========

// Local Teachable Machine sound model path
const LOCAL_MODEL_PATH = window.location.origin + "/audio-model/model.json";

// ml5 classifier
let classifier;

// Prediction label & confidence
let currentLabel = "Waiting…";
let currentConfidence = 0;

// Equalizer bar values (driven by AI)
let NUM_BARS = 40;
let barHeights = [];
let lastLabelChangeFrame = 0;

// DOM elements
let statusEl, emojiEl, labelTextEl, confidenceEl, startBtn;
let busPanelEl, busChipEl;

// Bus status
let busStatus = "safe"; // "safe" or "alert"
let demoStarted = false;

function setup() {
  // Match canvas width to the eq-canvas-holder div
  const holder = document.getElementById("eq-canvas-holder");
  const w = holder ? holder.offsetWidth : 900;
  const h = 130; // compact height so the whole UI fits without scroll

  const canvas = createCanvas(w, h);
  canvas.parent("eq-canvas-holder");

  // DOM references
  statusEl = select("#status");
  emojiEl = select("#emoji");
  labelTextEl = select("#label-text");
  confidenceEl = select("#confidence");
  startBtn = select("#start-btn");

  // Bus DOM elements
  busPanelEl = document.getElementById("bus-panel");
  busChipEl = document.getElementById("bus-chip");

  barHeights = new Array(NUM_BARS).fill(0);

  if (startBtn) {
    startBtn.mousePressed(startDemo);
  }
}

function startDemo() {
  if (demoStarted) return;
  demoStarted = true;

  if (statusEl) statusEl.html("🔄 Loading AI model…");

  const options = {
    probabilityThreshold: 0.1,
  };

  // 👉 Load model from local folder instead of URL
  classifier = ml5.soundClassifier(
    LOCAL_MODEL_PATH,
    options,
    () => {
      console.log("✅ Model is ready (local)");
      if (statusEl)
        statusEl.html("🎧 Listening… try clap, whistle, knock or scream!");
      classifier.classify(gotResult);
    }
  );
}

function draw() {
  drawMixerBackground();
  updateBarsFromAI();
  drawSoundBars();

  // Label overlay on canvas
  noStroke();
  fill(60, 20, 70, 230);
  textAlign(CENTER, BOTTOM);
  textSize(20);
  text(currentLabel, width / 2, height - 8);
}

function drawMixerBackground() {
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const r = lerp(255, 244, t);
    const g = lerp(224, 214, t);
    const b = lerp(250, 255, t);
    stroke(r, g, b);
    line(0, y, width, y);
  }
}

function updateBarsFromAI() {
  const maxH = height * 0.7;
  const minH = height * 0.06;

  const labelLower = currentLabel.toLowerCase();
  let baseEnergy;

  if (labelLower.includes("background") || currentConfidence < 0.2) {
    baseEnergy = 0.2 + currentConfidence * 0.3;
  } else {
    baseEnergy = 0.6 + currentConfidence * 0.6;
  }

  const framesSinceChange = frameCount - lastLabelChangeFrame;
  let changeBoost = 0;
  if (framesSinceChange < 30) {
    changeBoost = map(framesSinceChange, 0, 30, 0.6, 0);
  }

  const totalEnergy = constrain(baseEnergy + changeBoost, 0.1, 1.4);

  for (let i = 0; i < NUM_BARS; i++) {
    const noiseFactor =
      0.5 + 0.5 * noise(i * 0.3, frameCount * 0.03);
    const target = map(totalEnergy * noiseFactor, 0, 1.5, minH, maxH);
    barHeights[i] = lerp(barHeights[i], target, 0.25);
  }
}

function drawSoundBars() {
  const barWidth = width / NUM_BARS;
  const bottom = height * 0.9;

  for (let i = 0; i < NUM_BARS; i++) {
    const x = i * barWidth + barWidth / 2;
    const h = constrain(barHeights[i], 4, height * 0.7);

    let confBoost = map(currentConfidence, 0, 1, 0, 40);
    const gradColor = lerpColor(
      color(236, 64 + confBoost, 122, 235),
      color(123, 31, 162 + confBoost, 235),
      i / NUM_BARS
    );

    noStroke();
    fill(gradColor);
    rectMode(CORNERS);
    rect(x - barWidth * 0.45, bottom, x + barWidth * 0.45, bottom - h, 12);
  }
}

// Label → emoji + text
function getLabelDisplay(label) {
  const lower = label.toLowerCase();

  if (lower.includes("clap")) return { text: "Clap", emoji: "👏" };
  if (lower.includes("whistle")) return { text: "Whistle", emoji: "😗" };
  if (lower.includes("knock")) return { text: "Knock", emoji: "👊" };
  if (lower.includes("scream")) return { text: "Scream", emoji: "😱" };
  if (lower.includes("background"))
    return { text: "Background Noise", emoji: "🤫" };

  return { text: label, emoji: "🎧" };
}

function gotResult(error, results) {
  if (error) {
    console.error(error);
    if (statusEl) statusEl.html("❌ Error – check console");
    return;
  }

  if (!results || results.length === 0) return;

  const oldLabel = currentLabel;

  const res = results[0];
  currentLabel = res.label || "Unknown";
  currentConfidence = res.confidence || 0;

  if (currentLabel !== oldLabel) {
    lastLabelChangeFrame = frameCount;
  }

  const display = getLabelDisplay(currentLabel);

  if (labelTextEl) labelTextEl.html(display.text);
  if (emojiEl) emojiEl.html(display.emoji);
  if (confidenceEl)
    confidenceEl.html((currentConfidence * 100).toFixed(1) + "%");

  const lower = currentLabel.toLowerCase();
  if (lower.includes("scream")) {
    busStatus = "alert";
  } else {
    busStatus = "safe";
  }

  // Update bus panel classes + chip text
  if (busPanelEl && busChipEl) {
    busPanelEl.classList.toggle("alert", busStatus === "alert");
    busPanelEl.classList.toggle("safe", busStatus === "safe");
    busChipEl.textContent = busStatus === "alert" ? "ALERT MODE" : "SAFE RIDE";
  }
}
