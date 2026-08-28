const { FFmpeg } = FFmpegWASM;
const { fetchFile, toBlobURL } = FFmpegUtil;

let ffmpeg = null;

const videoInput = document.getElementById('videoInput');
const statusContainer = document.getElementById('statusContainer');
const statusText = document.getElementById('statusText');
const statusPercent = document.getElementById('statusPercent');
const progressBar = document.getElementById('progressBar');
const logText = document.getElementById('logText');
const resultsContainer = document.getElementById('resultsContainer');
const partsList = document.getElementById('partsList');

videoInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  partsList.innerHTML = '';
  resultsContainer.classList.add('hidden');
  statusContainer.classList.remove('hidden');
  progressBar.style.width = '5%';
  statusPercent.innerText = '5%';
  statusText.innerText = 'Iniciando sistema...';
  logText.innerText = '';

  try {
    if (!ffmpeg) {
      ffmpeg = new FFmpeg();

      ffmpeg.on('progress', ({ progress }) => {
        const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
        progressBar.style.width = pct + '%';
        statusPercent.innerText = pct + '%';
      });

      ffmpeg.on('log', ({ message }) => {
        if (message.length < 50) logText.innerText = message;
      });

      statusText.innerText = 'Carregando motor de vídeo (~25MB)...';
      logText.innerText = 'Baixando arquivos da CDN...';
      progressBar.style.width = '15%';

      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
      });
    }

    statusText.innerText = 'Lendo arquivo de vídeo...';
    progressBar.style.width = '35%';
    statusPercent.innerText = '35%';

    const ext = file.name.split('.').pop().toLowerCase() || 'mp4';
    const inputName = `input.${ext}`;

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    statusText.innerText = 'Fatiando vídeo em partes de 30s...';
    logText.innerText = 'Processando...';

    await ffmpeg.exec([
      '-i', inputName,
      '-c', 'copy',
      '-map', '0',
      '-segment_time', '30',
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

      const card = document.createElement('div');
      card.className = 'flex flex-col sm:flex-row items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 gap-4';

      const infoDiv = document.createElement('div');
      infoDiv.innerHTML = `<div class="font-semibold text-gray-800">Parte ${i + 1}</div>`;

      const videoPreview = document.createElement('video');
      videoPreview.src = videoUrl;
      videoPreview.controls = true;
      videoPreview.className = 'w-full sm:w-44 h-28 object-cover rounded-lg bg-black';

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'flex gap-2';

      const downloadBtn = document.createElement('a');
      downloadBtn.href = videoUrl;
      downloadBtn.download = `status_parte_${i + 1}.mp4`;
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
    logText.innerText = 'Verifique a conexão ou tente um arquivo menor.';
  }
});
