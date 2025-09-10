// public/script.js
const urlInput = document.getElementById("url");
const goBtn = document.getElementById("go");
const openNewBtn = document.getElementById("openNew");
const useIframe = document.getElementById("useIframe");
const status = document.getElementById("status");
const frame = document.getElementById("proxyFrame");
const historyList = document.getElementById("historyList");

const UV_HISTORY = "uv_history_v1";
let historyItems = JSON.parse(localStorage.getItem(UV_HISTORY) || "[]");

function renderHistory() {
  historyList.innerHTML = "";
  historyItems.slice().reverse().forEach(url => {
    const li = document.createElement("li");
    li.textContent = url;
    li.onclick = () => {
      urlInput.value = url;
      loadUrl(url);
    };
    historyList.appendChild(li);
  });
}
renderHistory();

function pushHistory(u) {
  if (!u) return;
  historyItems = historyItems.filter(x => x !== u);
  historyItems.push(u);
  if (historyItems.length > 50) historyItems.shift();
  localStorage.setItem(UV_HISTORY, JSON.stringify(historyItems));
  renderHistory();
}

async function loadUrl(raw) {
  if (!raw) return;
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;

  status.textContent = "Fetching…";
  const proxied = `/api/proxy?url=${encodeURIComponent(u)}`;

  pushHistory(u);

  if (useIframe.checked) {
    // Try load in iframe. Note: iframe will succeed only if the remote does not block framing.
    frame.style.display = "block";
    frame.src = proxied;
    status.textContent = `Loaded via proxy: ${u}`;
  } else {
    // Open in a new tab (safer, avoids framing restrictions)
    window.open(proxied, "_blank", "noopener");
    status.textContent = `Opened in new tab: ${u}`;
  }
}

goBtn.addEventListener("click", () => loadUrl(urlInput.value));
openNewBtn.addEventListener("click", () => {
  let u = urlInput.value.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  window.open(`/api/proxy?url=${encodeURIComponent(u)}`, "_blank", "noopener");
});

// quick Enter handling
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadUrl(urlInput.value);
});

// Simple ultraviolet starfield canvas visual
const canvas = document.getElementById("uv-canvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resize);
resize();

const stars = [];
for (let i = 0; i < 220; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    z: Math.random() * canvas.width,
    speed: 0.6 + Math.random() * 2
  });
}

function frameLoop() {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.fillStyle = "rgba(8,3,30,0.25)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const cx = canvas.width/2, cy = canvas.height/2;
  stars.forEach(s => {
    s.z -= s.speed;
    if (s.z <= 0) {
      s.x = Math.random() * canvas.width;
      s.y = Math.random() * canvas.height;
      s.z = canvas.width;
    }
    const k = canvas.width / s.z;
    const sx = (s.x - cx) * k + cx;
    const sy = (s.y - cy) * k + cy;
    const r = Math.max(0.2, 3 * (canvas.width / s.z));
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI*2);
    const alpha = Math.min(1, 1.2 - s.z / canvas.width);
    ctx.fillStyle = `rgba(138,92,255,${alpha})`;
    ctx.fill();
  });

  requestAnimationFrame(frameLoop);
}
frameLoop();
