// Register Face Page
const REG_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/';
let _regStream = null, _regModelsLoaded = false;
let _regCaptures = [], _regImages = [];
const REG_REQUIRED = 5;

function renderRegister() {
  document.getElementById('page-content').innerHTML = `
    <div class="page-topbar">
      <div class="page-title-block">
        <h1 class="page-title">Register Face</h1>
        <p class="page-subtitle">Capture biometric samples for an employee</p>
      </div>
      <div class="page-actions">
        <span class="tag tag-muted" id="regModelBadge">Loading models...</span>
      </div>
    </div>
    <div class="page-body rec-grid">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Camera Capture</span>
            <span class="tag tag-muted" id="regFaceStatus" role="status">No camera</span>
          </div>
          <div class="camera-viewport cam-h-380" id="regViewport">
            <div id="regPlaceholder" style="text-align:center;color:var(--text-3)">
              <div style="font-size:56px;opacity:0.12;margin-bottom:12px">o</div>
              <p style="font-family:var(--font-mono);font-size:12px">Select employee, then start camera</p>
            </div>
            <video id="regVideo" autoplay muted playsinline style="display:none;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)"></video>
            <canvas id="regCanvas" style="display:none;position:absolute;inset:0;width:100%;height:100%;transform:scaleX(-1)"></canvas>
            <div class="cam-corner tl"></div><div class="cam-corner tr"></div>
            <div class="cam-corner bl"></div><div class="cam-corner br"></div>
          </div>
          <div id="captureStrip" style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border);min-height:76px;align-items:center;background:var(--obsidian3)">
            ${Array(5).fill(0).map((_,i)=>`<div style="width:52px;height:52px;border-radius:8px;background:var(--surface);border:1px dashed var(--border2);display:flex;align-items:center;justify-content:center;color:var(--text-3);font-family:var(--font-mono);font-size:12px">${i+1}</div>`).join('')}
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-3);margin-left:8px">Capture 5 face angles</span>
          </div>
          <div style="display:flex;gap:10px;padding:12px 16px;border-top:1px solid var(--border);align-items:center">
            <button class="btn btn-primary" id="regStartBtn" onclick="startRegCamera()" disabled>Start Camera</button>
            <button class="btn btn-secondary" id="regCaptureBtn" onclick="doCapture()" style="display:none">Capture</button>
            <button class="btn btn-ghost" id="regStopBtn" onclick="stopRegCamera()" style="display:none">Stop</button>
            <span id="regCaptureCount" style="font-family:var(--font-mono);font-size:12px;color:var(--text-2);margin-left:auto">0 / 5</span>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Capture Guidelines</span></div>
          <div class="card-body guides-grid">
            ${[['◈ Front','Look directly at camera'],['◁ Left','Turn head slightly left'],['▷ Right','Turn head slightly right'],['▽ Down','Tilt chin slightly down'],['△ Up','Tilt chin slightly up']].map(([t,d])=>`
              <div style="display:flex;gap:8px;padding:8px;background:var(--obsidian3);border-radius:8px;align-items:flex-start">
                <span style="color:var(--citron);flex-shrink:0;font-size:13px;font-weight:700;margin-top:1px">${t.split(' ')[0]}</span>
                <div><div style="font-size:12px;font-weight:600">${t.split(' ').slice(1).join(' ')}</div><div style="font-size:11px;color:var(--text-2)">${d}</div></div>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header"><span class="card-title">Registration Steps</span></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
            <div class="form-group">
              <label class="form-label">Step 1 - Select Employee</label>
              <select class="form-control" id="regEmpSelect" onchange="onRegEmpSelect()">
                <option value="">Choose employee...</option>
              </select>
            </div>
            <div id="regEmpInfo" style="display:none;background:var(--obsidian3);border-radius:8px;padding:12px;border:1px solid var(--border)">
              <div style="display:flex;gap:10px;align-items:center">
                <div class="avatar" id="regEmpAvatar"></div>
                <div>
                  <div id="regEmpName" style="font-weight:700;font-size:14px"></div>
                  <div id="regEmpRole" style="font-size:11px;color:var(--text-2);font-family:var(--font-mono)"></div>
                  <div id="regFaceExisting" style="margin-top:4px"></div>
                </div>
              </div>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--text-3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:6px">Step 2 - AI Models</div>
              <div id="regModelStatus" style="background:var(--obsidian3);border-radius:8px;padding:10px 12px;font-family:var(--font-mono);font-size:11px;color:var(--text-2);display:flex;align-items:center;gap:8px">
                <div class="spinner" style="width:14px;height:14px;border-width:1.5px"></div> Loading...
              </div>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--text-3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:6px">Step 3 - Capture Samples</div>
              <div style="background:var(--obsidian3);border-radius:8px;padding:10px 12px">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                  <span style="font-size:11px;color:var(--text-2);font-family:var(--font-mono)">Progress</span>
                  <span style="font-size:11px;color:var(--citron);font-family:var(--font-mono)" id="regProgText">0 / 5</span>
                </div>
                <div class="conf-bar"><div class="conf-fill" id="regProgBar" style="width:0%;background:var(--citron)"></div></div>
              </div>
            </div>
            <div>
              <div style="font-size:10px;font-weight:700;color:var(--text-3);font-family:var(--font-mono);text-transform:uppercase;margin-bottom:6px">Step 4 - Save to System</div>
              <button class="btn btn-primary" id="regSaveBtn" onclick="saveRegistration()" disabled style="width:100%">Register Face in System</button>
            </div>
            <button class="btn btn-ghost btn-sm" id="regResetBtn" onclick="resetRegistration()" style="display:none">Reset</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Unregistered Employees</span></div>
          <div id="unregList" style="max-height:200px;overflow-y:auto">
            <div class="empty-state" style="padding:20px">Loading...</div>
          </div>
        </div>
      </div>
    </div>`;
  loadRegEmployees();
  loadRegModels();
  loadUnregistered();
}

async function loadRegEmployees() {
  try {
    const data = await API.employees.list({ per_page: 200 });
    const select = document.getElementById('regEmpSelect');
    select.innerHTML = '<option value="">Choose employee...</option>' +
      data.employees.map(e => `<option value="${e.id}">${e.first_name} ${e.last_name} (${e.department_name||'N/A'})</option>`).join('');
  } catch(e) {}
}

async function loadRegModels() {
  const badge = document.getElementById('regModelBadge');
  const status = document.getElementById('regModelStatus');
  try {
    status.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:1.5px"></div> Loading TinyFaceDetector...';
    await faceapi.nets.tinyFaceDetector.loadFromUri(REG_MODEL_URL);
    status.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:1.5px"></div> Loading FaceLandmarks...';
    await faceapi.nets.faceLandmark68Net.loadFromUri(REG_MODEL_URL);
    status.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:1.5px"></div> Loading FaceRecognition...';
    await faceapi.nets.faceRecognitionNet.loadFromUri(REG_MODEL_URL);
    _regModelsLoaded = true;
    status.innerHTML = '<span style="color:var(--mint)">OK</span> All models ready';
    badge.textContent = 'Models Ready'; badge.className = 'tag tag-mint';
    if (document.getElementById('regEmpSelect').value) document.getElementById('regStartBtn').disabled = false;
  } catch(e) {
    status.innerHTML = '<span style="color:var(--coral)">Error:</span> ' + e.message;
    badge.textContent = 'Error'; badge.className = 'tag tag-coral';
    document.getElementById('regStartBtn').disabled = false;
  }
}

function onRegEmpSelect() {
  const select = document.getElementById('regEmpSelect');
  const empId = select.value;
  if (!empId) { document.getElementById('regEmpInfo').style.display='none'; return; }
  const text = select.options[select.selectedIndex].text;
  const namePart = text.split(' (')[0];
  document.getElementById('regEmpAvatar').textContent = initials(namePart);
  document.getElementById('regEmpName').textContent = namePart;
  document.getElementById('regEmpRole').textContent = text.match(/\((.+)\)/)?.[1] || '';
  document.getElementById('regEmpInfo').style.display = 'block';
  document.getElementById('regStartBtn').disabled = !_regModelsLoaded;
}

async function startRegCamera() {
  try {
    _regStream = await navigator.mediaDevices.getUserMedia({ video:{ width:640, height:480, facingMode:'user' } });
    const video = document.getElementById('regVideo');
    const canvas = document.getElementById('regCanvas');
    video.srcObject = _regStream;
    video.style.display='block'; canvas.style.display='block';
    document.getElementById('regPlaceholder').style.display='none';
    document.getElementById('regStartBtn').style.display='none';
    document.getElementById('regCaptureBtn').style.display='';
    document.getElementById('regStopBtn').style.display='';
    video.onloadedmetadata = () => { canvas.width=video.videoWidth; canvas.height=video.videoHeight; regDetectLoop(); };
  } catch(e) { toast('Camera error: '+e.message,'error'); }
}

function stopRegCamera() {
  if(_regStream) _regStream.getTracks().forEach(t=>t.stop());
  document.getElementById('regVideo').style.display='none';
  document.getElementById('regCanvas').style.display='none';
  document.getElementById('regPlaceholder').style.display='flex';
  document.getElementById('regStartBtn').style.display='';
  document.getElementById('regCaptureBtn').style.display='none';
  document.getElementById('regStopBtn').style.display='none';
}

async function regDetectLoop() {
  const video = document.getElementById('regVideo');
  if(!video||!video.srcObject) return;
  const canvas = document.getElementById('regCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  try {
    const det = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:0.5})).withFaceLandmarks();
    if(det) {
      const b = det.detection.box;
      ctx.strokeStyle='#e2ff00'; ctx.lineWidth=2; ctx.strokeRect(b.x,b.y,b.width,b.height);
      document.getElementById('regFaceStatus').textContent='Face detected';
      document.getElementById('regFaceStatus').className='tag tag-mint';
    } else {
      document.getElementById('regFaceStatus').textContent='No face';
      document.getElementById('regFaceStatus').className='tag tag-coral';
    }
  } catch(e) {}
  requestAnimationFrame(regDetectLoop);
}

async function doCapture() {
  if(_regCaptures.length >= REG_REQUIRED) { toast('Already captured enough','info'); return; }
  const video = document.getElementById('regVideo');
  const det = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({inputSize:416,scoreThreshold:0.5})).withFaceLandmarks().withFaceDescriptor();
  if(!det) { toast('No face detected','error'); return; }
  _regCaptures.push(Array.from(det.descriptor));
  const tmp = document.createElement('canvas');
  tmp.width=video.videoWidth; tmp.height=video.videoHeight;
  tmp.getContext('2d').drawImage(video,0,0);
  _regImages.push(tmp.toDataURL('image/jpeg',0.6));
  updateCaptureStrip();
  document.getElementById('regProgBar').style.width = (_regCaptures.length/REG_REQUIRED*100)+'%';
  document.getElementById('regProgText').textContent = _regCaptures.length+' / '+REG_REQUIRED;
  document.getElementById('regCaptureCount').textContent = _regCaptures.length+' / '+REG_REQUIRED;
  if(_regCaptures.length >= REG_REQUIRED) { document.getElementById('regSaveBtn').disabled=false; toast('All samples captured! Click Register','success'); }
  else toast('Sample '+_regCaptures.length+'/'+REG_REQUIRED+' saved','info');
}

function updateCaptureStrip() {
  const strip = document.getElementById('captureStrip');
  strip.innerHTML = Array(REG_REQUIRED).fill(0).map((_,i) =>
    _regImages[i]
      ? `<img src="${_regImages[i]}" style="width:52px;height:52px;border-radius:8px;object-fit:cover;border:2px solid var(--citron)"/>`
      : `<div style="width:52px;height:52px;border-radius:8px;background:var(--surface);border:1px dashed var(--border2);display:flex;align-items:center;justify-content:center;color:var(--text-3);font-family:var(--font-mono);font-size:12px">${i+1}</div>`
  ).join('') + `<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-3);margin-left:8px">${_regCaptures.length}/${REG_REQUIRED} captured</span>`;
}

function avgDescriptor(arr) {
  const avg = new Array(128).fill(0);
  arr.forEach(d => d.forEach((v,i) => avg[i]+=v));
  return avg.map(v=>v/arr.length);
}

async function saveRegistration() {
  const empId = document.getElementById('regEmpSelect').value;
  if(!empId||_regCaptures.length<REG_REQUIRED) { toast('Complete all steps first','error'); return; }
  const btn = document.getElementById('regSaveBtn');
  btn.disabled=true; btn.textContent='Registering...';
  try {
    await API.recognition.register({ employee_id:parseInt(empId), descriptor:avgDescriptor(_regCaptures), samples:_regCaptures.length });
    if(_regImages[0]) await API.employees.update(empId, { photo:_regImages[0] });
    toast('Face registered successfully','success');
    document.getElementById('regFaceExisting').innerHTML='<span class="tag tag-mint">Registered</span>';
    btn.textContent='Registered';
    document.getElementById('regResetBtn').style.display='';
    loadUnregistered();
  } catch(e) { toast('Failed: '+e.message,'error'); btn.disabled=false; btn.textContent='Register Face in System'; }
}

function resetRegistration() {
  _regCaptures=[]; _regImages=[];
  updateCaptureStrip();
  document.getElementById('regProgBar').style.width='0%';
  document.getElementById('regProgText').textContent='0 / 5';
  document.getElementById('regCaptureCount').textContent='0 / 5';
  document.getElementById('regSaveBtn').disabled=true;
  document.getElementById('regSaveBtn').textContent='Register Face in System';
  document.getElementById('regResetBtn').style.display='none';
}

async function loadUnregistered() {
  const el = document.getElementById('unregList');
  if(!el) return;
  try {
    const data = await API.recognition.unregistered();
    if(!data.length) { el.innerHTML='<div class="empty-state" style="padding:16px">All employees registered</div>'; return; }
    el.innerHTML = data.map(e=>`
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer" onclick="document.getElementById('regEmpSelect').value='${e.id}';onRegEmpSelect()">
        ${avatar(e.name)}
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${e.name}</div><div style="font-size:11px;color:var(--text-2);font-family:var(--font-mono)">${e.department||'N/A'}</div></div>
        <span class="tag tag-coral">None</span>
      </div>`).join('');
  } catch(e) { el.innerHTML='<div class="empty-state" style="padding:16px">Failed to load</div>'; }
}
