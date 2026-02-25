// --- Configuración: apunta a tu backend ---
const BACKEND_URL = '/buscar-qr';

const video = document.getElementById('video');
let scanning = false;
let stream = null;
let animationFrame = null;

const resultPanel = document.getElementById('resultPanel');
const qrCodeDisplay = document.getElementById('qrCodeDisplay');
const dataContent = document.getElementById('dataContent');

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    await video.play();
    scanning = true;
    requestAnimationFrame(scanQR);
  } catch (err) {
    alert('No se pudo acceder a la cámara: ' + err.message);
  }
}

function stopCamera() {
  scanning = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
}

function scanQR() {
  if (!scanning) return;
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, canvas.width, canvas.height, {
      inversionAttempts: 'dontInvert'
    });
    if (code) {
      stopCamera();
      qrCodeDisplay.innerText = code.data;
      consultarBackend(code.data);
      return;
    }
  }
  animationFrame = requestAnimationFrame(scanQR);
}

async function consultarBackend(codigo) {
  dataContent.innerHTML = '<div style="text-align:center; padding:1rem;">🔍 Consultando Google Sheets...</div>';
  resultPanel.style.display = 'block';

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo })
    });
    const result = await response.json();

    if (!response.ok) {
      mostrarError(result.error || 'Error en la consulta');
      return;
    }

    if (result.success) {
      mostrarResultado(result.data);
    } else {
      mostrarNoEncontrado(codigo);
    }
  } catch (error) {
    console.error(error);
    mostrarError('No se pudo conectar con el backend. ¿Está corriendo?');
  }
}

function mostrarResultado(registro) {
  const columnasMostrar = [
    'CODIGO', 'NOMBRE', 'PLACA', 'NUMERO DE CONTACTO', 'ULTIMO PAGO', 'QR', 'RECIBO'
  ];

  let html = '<div class="data-grid">';
  columnasMostrar.forEach(col => {
    const key = Object.keys(registro).find(k => 
      k.trim().toUpperCase() === col.trim().toUpperCase()
    );
    const valor = key ? registro[key] : '—';
    html += `<span class="data-label">${col}</span>`;
    html += `<span class="data-value">${valor}</span>`;
  });
  html += '</div>';
  dataContent.innerHTML = html;
}

function mostrarNoEncontrado(codigo) {
  dataContent.innerHTML = `  
    <div class="not-found">
      ❌ No se encontró el código <strong>${codigo}</strong> en Google Sheets
    </div>
  `;
}

function mostrarError(mensaje) {
  dataContent.innerHTML = `  
    <div class="not-found" style="background:#fdede0; color:#a94442;">
      ⚠️ ${mensaje}
    </div>
  `;
}

document.getElementById('startBtn').addEventListener('click', () => {
  stopCamera();
  startCamera();
});

document.getElementById('stopBtn').addEventListener('click', () => {
  stopCamera();
  resultPanel.style.display = 'none';
});

window.addEventListener('beforeunload', stopCamera);
