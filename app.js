const { FFmpeg } = FFmpegWASM;
const { fetchFile, toBlobURL } = FFmpegUtil;

let ffmpeg = null;
let isEngineReady = false;
let currentFile = null;
let segmentTime = 30;
let generatedBlobs = [];

// Elementos DOM
const engineDot = document.getElementById('engineDot');
const engineStatus = document.getElementById('engineStatus');
const dropZone = document.getElementById('dropZone');
const videoInput = document.getElementById('videoInput');
const sizeWarning = document.getElementById('sizeWarning');
const previewCard = document.getElementById('previewCard');
const originalVideoPreview = document.getElementById('originalVideoPreview');
const videoName = document.getElementById('videoName');
const videoStats = document.getElementById('videoStats');
const estimatedParts = document.getElementById('estimatedParts');
const processBtn = document.getElementById('processBtn');
const timeBtns = document.querySelectorAll('.time-btn');

const statusContainer = document.getElementById('statusContainer');
const statusText = document.getElementById('statusText');
const statusPercent = document.getElementById('statusPercent');
const progressBar = document.getElementById('progressBar');
const logText = document.getElementById('logText');
const resultsContainer = document.getElementById('resultsContainer');
const partsList = document.getElementById('partsList');
const downloadZipBtn = document.getElementById('downloadZipBtn');

async function preloadFFmpeg() {
  try {
    ffmpeg = new FFmpeg();

    ffmpeg.on('progress', ({ progress }) => {
      const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
      progressBar.style.width = pct + '%';
      statusPercent.innerText = pct + '%';
    });

    ffmpeg.on('log', ({ message }) => {
      if (message.length < 50) logText.innerText = message;
    });

    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
    });

    isEngineReady = true;
    engineDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
    engineStatus.innerText = 'Motor de vídeo pronto';
    
    if (currentFile) {
      processBtn.disabled = false;
      processBtn.innerText = 'Fatiar Vídeo';
    }
  } catch (err) {
    console.error(err);
    engineDot.className = 'w-2 h-2 rounded-full bg-red-500';
    engineStatus.innerText = 'Erro ao carregar motor. Recarregue a página.';
  }
}

window.addEventListener('DOMContentLoaded', preloadFFmpeg);

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('bg-emerald-100');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('bg-emerald-100');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('bg-emerald-100');
  if (e.dataTransfer.files.length) handleFileSelected(e.dataTransfer.files[0]);
});

videoInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFileSelected(e.target.files[0]);
});

timeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    timeBtns.forEach(b => {
      b.className = 'time-btn py-2 border rounded-lg font-medium text-sm border-gray-300 bg-white text-gray-700 hover:bg-gray-100';
    });
    btn.className = 'time-btn py-2 border rounded-lg font-medium text-sm border-emerald-500 bg-emerald-50 text-emerald-700 font-bold';
    segmentTime = parseInt(btn.dataset.time);
    updateEstimates();
  });
});

function handleFileSelected(file) {
  if (!file.type.startsWith('video/')) {
    alert('Por favor, selecione um arquivo de vídeo válido.');
    return;
  }

  currentFile = file;
  videoName.innerText = file.name;
  
  if (file.size > 100 * 1024 * 1024) {
    sizeWarning.classList.remove('hidden');
  } else {
    sizeWarning.classList.add('hidden');
  }

  const videoUrl = URL.createObjectURL(file);
  originalVideoPreview.src = videoUrl;

  originalVideoPreview.onloadedmetadata = () => {
    updateEstimates();
    previewCard.classList.remove('hidden');
    resultsContainer.classList.add('hidden');

    if (isEngineReady) {
      processBtn.disabled = false;
      processBtn.innerText = 'Fatiar Vídeo';
    } else {
      processBtn.disabled = true;
      processBtn.innerText = 'Carregando motor...';
    }
  };
}

function updateEstimates() {
  if (!currentFile || !originalVideoPreview.duration) return;

  const duration = originalVideoPreview.duration;
  const parts = Math.ceil(duration / segmentTime);
  const sizeMB = (currentFile.size / (1024 * 1024)).toFixed(1);

  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  const durationFormatted = `${mins > 0 ? mins + 'm ' : ''}${secs}s`;

  videoStats.innerText = `Tamanho: ${sizeMB} MB | Duração: ${durationFormatted}`;
  estimatedParts.innerText = `Serão geradas aproximadamente ${parts} parte(s) de ${segmentTime}s.`;
}

processBtn.addEventListener('click', async () => {
  if (!currentFile || !isEngineReady) return;

  partsList.innerHTML = '';
  generatedBlobs = [];
  resultsContainer.classList.add('hidden');
  statusContainer.classList.remove('hidden');
  progressBar.style.width = '10%';
  statusPercent.innerText = '10%';
  statusText.innerText = 'Lendo arquivo de vídeo...';

  try {
    const ext = currentFile.name.split('.').pop().toLowerCase() || 'mp4';
    const inputName = `input.${ext}`;

    await ffmpeg.writeFile(inputName, await fetchFile(currentFile));

    statusText.innerText = `Fatiando vídeo em partes de ${segmentTime}s...`;

    await ffmpeg.exec([
      '-i', inputName,
      '-c', 'copy',
      '-map', '0',
      '-segment_time', segmentTime.toString(),
      '-f', 'segment',
      '-reset_timestamps', '1',
      'parte_%03d.mp4'
    ]);

    statusText.innerText = 'Gerando pré-visualizações...';

    const dirFiles = await ffmpeg.readDir('/');
    const partFiles = dirFiles
      .map(f => f.name)
      .filter(name => name.startsWith('parte_') && name.endsWith('.mp4'))
      .sort();

    resultsContainer.classList.remove('hidden');

    for (let i = 0; i < partFiles.length; i++) {
      const filename = partFiles[i];
      const data = await ffmpeg.readFile(filename);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(blob);

      // Armazena no array global para criação do ZIP
      generatedBlobs.push({
        name: `status_parte_${String(i + 1).padStart(2, '0')}.mp4`,
        blob: blob
      });

      const card = document.createElement('div');
      card.className = 'flex flex-col sm:flex-row items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 gap-4';

      const infoDiv = document.createElement('div');
      infoDiv.innerHTML = `<div class="font-semibold text-gray-800">Parte ${i + 1} (${segmentTime}s)</div>`;

      const videoPreview = document.createElement('video');
      videoPreview.src = videoUrl;
      videoPreview.controls = true;
      videoPreview.className = 'w-full sm:w-44 h-28 object-cover rounded-lg bg-black';

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'flex gap-2';

      const downloadBtn = document.createElement('a');
      downloadBtn.href = videoUrl;
      downloadBtn.download = `status_parte_${String(i + 1).padStart(2, '0')}.mp4`;
      downloadBtn.className = 'px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg font-medium';
      downloadBtn.innerText = 'Baixar';

      const shareBtn = document.createElement('button');
      shareBtn.className = 'px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg font-medium';
      shareBtn.innerText = 'Compartilhar';
      shareBtn.onclick = async () => {
        const shareFile = new File([blob], `status_parte_${i + 1}.mp4`, { type: 'video/mp4' });
        if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
          await navigator.share({ files: [shareFile] });
        } else {
          alert('Compartilhamento direto não suportado. Use o botão Baixar.');
        }
      };

      actionsDiv.appendChild(downloadBtn);
      actionsDiv.appendChild(shareBtn);
      card.appendChild(infoDiv);
      card.appendChild(videoPreview);
      card.appendChild(actionsDiv);
      partsList.appendChild(card);
    }

    statusContainer.classList.add('hidden');

  } catch (err) {
    console.error(err);
    statusText.innerText = 'Erro ao processar o vídeo.';
    logText.innerText = 'Tente um arquivo menor ou recarregue a página.';
  }
});

// Download em Lote (.ZIP)
downloadZipBtn.addEventListener('click', async () => {
  if (!generatedBlobs.length) return;

  const zip = new JSZip();
  generatedBlobs.forEach(item => {
    zip.file(item.name, item.blob);
  });

  downloadZipBtn.innerText = 'Compactando...';
  downloadZipBtn.disabled = true;

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipContent);

  const a = document.createElement('a');
  a.href = zipUrl;
  a.download = 'whatsapp_status_partes.zip';
  a.click();

  downloadZipBtn.innerText = '📦 Baixar Tudo (.ZIP)';
  downloadZipBtn.disabled = false;
});
