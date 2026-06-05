// Recognition Page — Full Pipeline UI

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';
let _recStream = null, _recRunning = false, _modelsLoaded = false;
let _lastCheckin = 0;
const CHECKIN_COOLDOWN = 6000;

function renderRecognition() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-topbar">
      <div class="page-title-block">
        <h1 class="page-title">Face Scan</h1>
        <p class="page-subtitle">Real-time identification & automated check-in</p>
      </div>
      <div class="page-actions">
        <span class="tag tag-muted" id="modelBadge">⟳ Loading models…</span>
        <span class="tag tag-muted" id="fpsBadge">— FPS</span>
      </div>
    </div>
    <div class="page-body" style="display:grid;grid-template-columns:1fr 340px;gap:20px">
      <!-- Camera -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Live Camera Feed</span>
            <span class="tag tag-coral" id="camStatus">Off</span>
          </div>
          <div class="camera-viewport" id="camViewport" style="background:#000;min-height:420px;display:flex;align-items:center;justify-content:center">
            <div id="camPlaceholder" style="text-align:center;color:var(--text-3)">
              <div style="font-size:56px;opacity:0.15;margin-bottom:12px">◎</div>
              <p style="font-family:var(--font-mono);font-size:12px">Camera not started</p>
            </div>
            <video id="recVideo" autoplay muted playsinline style="display:none;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)"></video>
            <canvas id="recCanvas" style="display:none;position:absolute;inset:0;width:100%;height:100%;transform:scaleX(-1)"></canvas>
            <div class="cam-corner tl"></div>
            <div class="cam-corner tr"></div>
            <div class="cam-corner bl"></div>
            <div class="cam-corner br"></div>
            <div class="scan-sweep" id="scanSweep"></div>
          </div>
          <div style="display:flex;gap:10px;padding:14px;border-top:1px solid var(--border);align-items:center">
            <button class="btn btn-primary" id="startCamBtn" onclick="startRecCamera()" disabled>◎ Start Camera</button>
            <button class="btn btn-secondary" id="stopCamBtn" onclick="stopRecCamera()" style="display:none">✕ Stop</button>
            <span id="recStatusMsg" style="font-family:var(--font-mono);font-size:11px;color:var(--text-3);margin-left:auto"></span>
          </div>
        </div>

        <!-- Scan Log -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Scan Log</span>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('scanLog').innerHTML=''">Clear</button>
          </div>
          <div id="scanLog" style="max-height:180px;overflow-y:auto;padding:8px;font-family:var(--font-mono);font-size:11px;display:flex;flex-direction:column;gap:3px">
            <div style="color:var(--text-3);padding:8px">System ready — start camera to scan</div>
          </div>
        </div>
      </div>

      <!-- Right Panel -->
      <div style="display:flex;flex-direction:column;gap:16px">
        <!-- ID Card -->
        <div class="id-card" id="idCard">
          <div class="id-card-top">
            <div style="font-size:10px;font-family:var(--font-mono);color:var(--text-3);letter-spacing:1px">IDENTITY RESULT</div>
            <div style="font-size:40px;opacity:0.1;margin:12px 0">◎</div>
            <div style="color:var(--text-3);font-size:12px;font-family:var(--font-mono)">Start camera to scan</div>
          </div>
          <div class="id-fields" id="idFields">
            <div class="id-field"><span class="id-field-label">Status</span><span class="tag tag-muted">Idle</span></div>
          </div>
        </div>

        <!-- Pipeline Metrics -->
        <div class="card">
          <div class="card-header"><span class="card-title">AI Pipeline Metrics</span></div>
          <div class="card-body" id="pipelineMetrics">
            <div style="color:var(--text-3);font-family:var(--font-mono);font-size:11px">Awaiting scan…</div>
          </div>
        </div>

        <!-- Today Stats -->
        <div class="card">
          <div class="card-header"><span class="card-title">Today's Sessions</span></div>
          <div class="card-body" id="todaySessions">
            <div class="skeleton" style="height:60px"></div>
          </div>
        </div>
      </div>
    </div>`;

  loadRecModels();
  loadTodaySessions();
}

function addScanLog(msg, type='') {
  const log = document.getElementById('scanLog');
  const colors = { success:'var(--mint)', error:'var(--coral)', warn:'var(--amber)', '':'var(--text-2)' };
  const time = new Date().toTimeString().slice(0,8);
  const entry = document.createElement('div');
  entry.style.cssText = `display:flex;gap:10px;padding:5px 8px;border-radius:5px;background:var(--obsidian3)`;
  entry.innerHTML = `<span style="color:var(--text-3)">${time}</span><span style="color:${colors[type]||colors['']}">${msg}</span>`;
  log.insertBefore(entry, log.firstChild);
  if(log.children.length > 60) log.removeChild(log.lastChild);
}

async function loadRecModels() {
  const badge = document.getElementById('modelBadge');
  badge.textContent = '⟳ Loading TinyFaceDetector…';
  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    badge.textContent = '⟳ Loading Landmarks…';
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    badge.textContent = '⟳ Loading FaceRecognition…';
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    _modelsLoaded = true;
    badge.textContent = '✓ Models Ready';
    badge.className = 'tag tag-mint';
    document.getElementById('startCamBtn').disabled = false;
    addScanLog('All AI models loaded successfully', 'success');
  } catch(e) {
    badge.textContent = '✗ Model Error';
    badge.className = 'tag tag-coral';
    document.getElementById('startCamBtn').disabled = false;
    addScanLog('Model load error: ' + e.message, 'error');
  }
}

async function startRecCamera() {
  try {
    _recStream = await navigator.mediaDevices.getUserMedia({ video:{ width:1280,height:720,facingMode:'user' } });
    const video = document.getElementById('recVideo');
    const canvas = document.getElementById('recCanvas');
    video.srcObject = _recStream;
    video.style.display = 'block';
    canvas.style.display = 'block';
    document.getElementById('camPlaceholder').style.display = 'none';
    document.getElementById('startCamBtn').style.display = 'none';
    document.getElementById('stopCamBtn').style.display = '';
    document.getElementById('camStatus').textContent = '● Live';
    document.getElementById('camStatus').className = 'tag tag-mint';
    document.getElementById('scanSweep').classList.add('active');
    _recRunning = true;
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      addScanLog('Camera started — scanning active', 'success');
      if(_modelsLoaded) recDetectLoop();
      else addScanLog('Models not ready — recognition unavailable', 'warn');
    };
  } catch(e) {
    toast('Camera error: ' + e.message, 'error');
  }
}

function stopRecCamera() {
  _recRunning = false;
  if(_recStream) _recStream.getTracks().forEach(t=>t.stop());
  const video = document.getElementById('recVideo');
  const canvas = document.getElementById('recCanvas');
  video.style.display = 'none';
  canvas.style.display = 'none';
  document.getElementById('camPlaceholder').style.display = 'flex';
  document.getElementById('startCamBtn').style.display = '';
  document.getElementById('stopCamBtn').style.display = 'none';
  document.getElementById('camStatus').textContent = 'Off';
  document.getElementById('camStatus').className = 'tag tag-coral';
  document.getElementById('scanSweep').classList.remove('active');
  addScanLog('Camera stopped');
}

let _fpsCount=0, _fpsLast=Date.now();

async function recDetectLoop() {
  if(!_recRunning) return;
  const video = document.getElementById('recVideo');
  const canvas = document.getElementById('recCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);

  _fpsCount++;
  const now = Date.now();
  if(now-_fpsLast > 1000) {
    const fps = document.getElementById('fpsBadge');
    if(fps) fps.textContent = _fpsCount+' FPS';
    _fpsCount=0; _fpsLast=now;
  }

  try {
    const opts = new faceapi.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.5});
    const detections = await faceapi.detectAllFaces(video,opts).withFaceLandmarks().withFaceDescriptors();

    document.getElementById('recStatusMsg').textContent =
      detections.length ? `${detections.length} face(s) detected` : 'No face detected';

    for(const det of detections) {
      const box = det.detection.box;
      drawFaceBox(ctx, box, '#e2ff00', 2);

      if(_modelsLoaded && Date.now()-_lastCheckin > CHECKIN_COOLDOWN) {
        const descriptor = Array.from(det.descriptor);
        identify(descriptor);
      }
    }
  } catch(e) {}

  if(_recRunning) requestAnimationFrame(recDetectLoop);
}

function drawFaceBox(ctx, box, color, lw) {
  const s = 18;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  [[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]]
    .forEach(([cx,cy],i) => {
      const dx=i%2===0?1:-1, dy=i<2?1:-1;
      ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+dx*s,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,cy+dy*s); ctx.stroke();
    });
}

async function identify(descriptor) {
  _lastCheckin = Date.now();
  try {
    const result = await API.recognition.identify({ descriptor });
    renderPipeline(result.pipeline);

    if(result.match) {
      const emp = result.employee;
      renderIDCard(emp, result.confidence, result.pipeline);
      addScanLog(`✓ Match: ${emp.first_name} ${emp.last_name} (${result.confidence.toFixed(1)}%)`, 'success');

      // Auto check-in
      const ci = await API.attendance.checkin({ employee_id: emp.employee_id, method:'face', confidence: result.confidence });
      if(ci.type === 'checkin') toast(`${emp.first_name} ${emp.last_name} checked in ✓`, 'success');
      else if(ci.type === 'checkout') toast(`${emp.first_name} ${emp.last_name} checked out`, 'info');
      loadTodaySessions();
    } else {
      renderUnknown(result);
      addScanLog(`No match — ${result.reason||'unknown'} (dist: ${result.best_distance||'—'})`, 'warn');
    }
  } catch(e) { addScanLog('Identify error: ' + e.message, 'error'); }
}

function renderIDCard(emp, conf, pipeline) {
  const confColor = conf>80?'var(--mint)':conf>50?'var(--amber)':'var(--coral)';
  document.getElementById('idCard').innerHTML = `
    <div class="id-card-top">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--citron);letter-spacing:1px">IDENTITY CONFIRMED</div>
      ${avatar(emp.first_name+' '+emp.last_name, emp.photo, 'lg')}
      <div class="id-emp-name">${emp.first_name} ${emp.last_name}</div>
      <div class="id-emp-role">${emp.position||'—'} · ${emp.department||'—'}</div>
      <span class="tag tag-mint" style="margin-top:4px">✓ Verified</span>
    </div>
    <div class="id-fields">
      <div class="id-field"><span class="id-field-label">Employee No</span><span class="id-field-val">${emp.employee_no}</span></div>
      <div class="id-field"><span class="id-field-label">Department</span><span class="id-field-val">${emp.department||'—'}</span></div>
      <div class="id-field" style="flex-direction:column;align-items:flex-start;gap:6px">
        <span class="id-field-label">Confidence: <span style="color:${confColor}">${conf.toFixed(1)}%</span></span>
        <div class="conf-bar" style="width:100%"><div class="conf-fill" style="width:${conf}%;background:${confColor}"></div></div>
      </div>
      <div class="id-field"><span class="id-field-label">Liveness</span><span class="tag tag-mint">${pipeline?Math.round(pipeline.liveness_score*100)+'%':'—'}</span></div>
      <div class="id-field"><span class="id-field-label">Anti-Spoof</span><span class="tag tag-mint">${pipeline?Math.round(pipeline.anti_spoof_score*100)+'%':'—'}</span></div>
    </div>`;
}

function renderUnknown(result) {
  const reason = result.reason==='liveness_failed'?'Liveness Check Failed':'Face Not Recognized';
  document.getElementById('idCard').innerHTML = `
    <div class="id-card-top" style="background:rgba(255,92,107,0.05)">
      <div style="font-size:10px;font-family:var(--font-mono);color:var(--coral);letter-spacing:1px">IDENTITY UNKNOWN</div>
      <div style="font-size:48px;opacity:0.2;margin:16px 0">?</div>
      <div style="font-weight:700;color:var(--coral)">${reason}</div>
      <span class="tag tag-coral">✗ Unverified</span>
    </div>
    <div class="id-fields">
      <div class="id-field"><span class="id-field-label">Action</span>
        <a onclick="navigate('register')" style="color:var(--citron);cursor:pointer;font-size:12px;font-family:var(--font-mono)">⊕ Register Face</a>
      </div>
    </div>`;
}

function renderPipeline(p) {
  if(!p) return;
  document.getElementById('pipelineMetrics').innerHTML = [
    ['Detection Conf.', `${Math.round(p.detection_confidence*100)}%`, p.detection_confidence>0.85?'mint':'amber'],
    ['Liveness Score', `${Math.round(p.liveness_score*100)}%`, p.liveness_score>0.72?'mint':'coral'],
    ['Anti-Spoof',     `${Math.round(p.anti_spoof_score*100)}%`, p.anti_spoof_score>0.85?'mint':'coral'],
    ['Landmark Quality',`${Math.round(p.landmark_quality*100)}%`, 'mint'],
    ['Illumination',   `${Math.round(p.illumination_score*100)}%`, p.illumination_score>0.6?'mint':'amber'],
    ['Pose Deviation', `${p.pose_deviation}°`, p.pose_deviation<20?'mint':'amber'],
    ['Glasses',        p.glasses_detected?'Detected':'Clear', p.glasses_detected?'amber':'mint'],
    ['Occlusion',      p.occlusion_detected?'Detected':'None', p.occlusion_detected?'coral':'mint'],
  ].map(([label, val, color])=>`
    <div class="pipeline-metric">
      <span class="pipeline-metric-label">${label}</span>
      <span class="pipeline-metric-val" style="color:var(--${color})">${val}</span>
    </div>`).join('');
}

async function loadTodaySessions() {
  const el = document.getElementById('todaySessions');
  if(!el) return;
  try {
    const data = await API.employees.stats();
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="background:var(--obsidian3);border-radius:8px;padding:12px;text-align:center">
          <div style="font-family:var(--font-serif);font-size:28px;color:var(--mint)">${data.present_today}</div>
          <div style="font-size:10px;color:var(--text-3);font-family:var(--font-mono)">PRESENT</div>
        </div>
        <div style="background:var(--obsidian3);border-radius:8px;padding:12px;text-align:center">
          <div style="font-family:var(--font-serif);font-size:28px;color:var(--coral)">${data.absent_today}</div>
          <div style="font-size:10px;color:var(--text-3);font-family:var(--font-mono)">ABSENT</div>
        </div>
      </div>`;
  } catch(e) {}
}
