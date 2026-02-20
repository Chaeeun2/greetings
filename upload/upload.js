(() => {
  'use strict';

  const WORKER_URL = UPLOAD_CONFIG.WORKER_URL;
  const UPLOAD_SECRET = UPLOAD_CONFIG.UPLOAD_SECRET;

  const MAX_IMAGE_SIZE = 2 * 1024 * 1024;   // 2MB
  const MAX_VIDEO_SIZE = 10 * 1024 * 1024;   // 10MB

  const form = document.getElementById('uploadForm');
  const submitBtn = document.getElementById('submitBtn');
  const mainFileInput = document.getElementById('mainFile');
  const mainDropZone = document.getElementById('mainDropZone');
  const mainPreview = document.getElementById('mainPreview');
  const detailList = document.getElementById('detailList');
  const addDetailBtn = document.getElementById('addDetailBtn');
  const successScreen = document.getElementById('successScreen');
  const resetBtn = document.getElementById('resetBtn');
  const uploadOverlay = document.getElementById('uploadOverlay');
  const uploadStatus = document.getElementById('uploadStatus');
  const progressFill = document.getElementById('progressFill');

  let mainFile = null;
  let detailFiles = [];

  // ===== 유틸 =====
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function isVideo(file) {
    return file.type.startsWith('video/');
  }

  function validateFile(file) {
    const maxSize = isVideo(file) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return `파일 크기 초과 (${formatSize(file.size)} / 최대 ${formatSize(maxSize)})`;
    }

    if (isVideo(file)) {
      if (!file.type.match(/video\/mp4/)) return 'MP4 형식만 지원됩니다';
    } else {
      if (!file.type.match(/image\/(jpeg|png)/)) return 'JPG, PNG 형식만 지원됩니다';
    }
    return null;
  }

  async function uploadToR2(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'X-Upload-Secret': UPLOAD_SECRET },
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }
    return (await res.json()).url;
  }

  // ===== 메인 이미지 =====
  mainFileInput.addEventListener('change', () => {
    const file = mainFileInput.files[0];
    if (!file) return;
    setMainFile(file);
  });

  ['dragover', 'dragenter'].forEach(evt => {
    mainDropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      mainDropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    mainDropZone.addEventListener(evt, () => {
      mainDropZone.classList.remove('dragover');
    });
  });

  mainDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setMainFile(file);
  });

  function setMainFile(file) {
    const error = validateFile(file);
    mainFile = error ? null : file;
    mainDropZone.classList.toggle('has-file', !!mainFile);

    if (error) {
      mainPreview.innerHTML = `
        <div class="file-preview-item">
          <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-error">${error}</div>
          </div>
          <button type="button" class="remove-file" onclick="clearMainFile()">×</button>
        </div>`;
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const mediaTag = isVideo(file)
      ? `<video src="${objectUrl}" muted autoplay loop playsinline></video>`
      : `<img src="${objectUrl}">`;

    mainPreview.innerHTML = `
      <div class="file-preview-item">
        ${mediaTag}
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${formatSize(file.size)}</div>
        </div>
        <button type="button" class="remove-file" onclick="clearMainFile()">×</button>
      </div>`;
  }

  window.clearMainFile = function () {
    mainFile = null;
    mainFileInput.value = '';
    mainDropZone.classList.remove('has-file');
    mainPreview.innerHTML = '';
  };

  // ===== 상세 이미지 =====
  addDetailBtn.addEventListener('click', addDetailRow);

  function addDetailRow() {
    const idx = detailFiles.length;
    detailFiles.push(null);

    const item = document.createElement('div');
    item.className = 'detail-item';
    item.dataset.idx = idx;
    item.innerHTML = `
      <div class="detail-drop">
        <input type="file" accept="image/jpeg,image/png,video/mp4">
        <span class="drop-placeholder">파일 선택 (이미지/영상)</span>
      </div>
      <button type="button" class="remove-detail">×</button>
    `;

    const fileInput = item.querySelector('input[type="file"]');
    const dropArea = item.querySelector('.detail-drop');

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) setDetailFile(item, idx, file);
    });

    ['dragover', 'dragenter'].forEach(evt => {
      dropArea.addEventListener(evt, (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropArea.addEventListener(evt, () => dropArea.classList.remove('dragover'));
    });
    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) setDetailFile(item, idx, file);
    });

    item.querySelector('.remove-detail').addEventListener('click', () => {
      detailFiles[idx] = null;
      item.remove();
    });

    detailList.appendChild(item);
  }

  function setDetailFile(item, idx, file) {
    const error = validateFile(file);
    const dropArea = item.querySelector('.detail-drop');

    if (error) {
      detailFiles[idx] = null;
      dropArea.classList.remove('has-file');
      dropArea.innerHTML = `
        <input type="file" accept="image/jpeg,image/png,video/mp4">
        <div class="detail-info">
          <div>
            <div class="detail-name" style="color:#e24545">${file.name}</div>
            <div style="font-size:12px;color:#e24545">${error}</div>
          </div>
        </div>`;
      const newInput = dropArea.querySelector('input[type="file"]');
      newInput.addEventListener('change', () => {
        const f = newInput.files[0];
        if (f) setDetailFile(item, idx, f);
      });
      return;
    }

    detailFiles[idx] = file;
    dropArea.classList.add('has-file');
    const objectUrl = URL.createObjectURL(file);
    const mediaTag = isVideo(file)
      ? `<video src="${objectUrl}" muted autoplay loop playsinline style="width:40px;height:40px;object-fit:cover;border-radius:4px"></video>`
      : `<img src="${objectUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:4px">`;

    dropArea.innerHTML = `
      <input type="file" accept="image/jpeg,image/png,video/mp4">
      <div class="detail-info">
        ${mediaTag}
        <div class="detail-name">${file.name} (${formatSize(file.size)})</div>
      </div>`;

    const newInput = dropArea.querySelector('input[type="file"]');
    newInput.addEventListener('change', () => {
      const f = newInput.files[0];
      if (f) setDetailFile(item, idx, f);
    });
  }

  // ===== 폼 제출 =====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!mainFile) {
      alert('대표 이미지를 업로드해주세요');
      return;
    }

    const author = document.getElementById('authorName').value.trim();
    if (!author) {
      alert('디자이너 활동명을 입력해주세요');
      return;
    }

    const validDetails = detailFiles.filter(Boolean);
    const totalUploads = 1 + validDetails.length;
    let uploaded = 0;

    submitBtn.disabled = true;
    uploadOverlay.style.display = 'flex';

    function updateProgress() {
      uploaded++;
      uploadStatus.textContent = `업로드 중... (${uploaded}/${totalUploads})`;
      progressFill.style.width = `${(uploaded / totalUploads) * 100}%`;
    }

    try {
      uploadStatus.textContent = `업로드 중... (0/${totalUploads})`;
      progressFill.style.width = '0%';

      const mainUrl = await uploadToR2(mainFile);
      updateProgress();

      const extraUrls = [];
      for (const file of validDetails) {
        const url = await uploadToR2(file);
        extraUrls.push(url);
        updateProgress();
      }

      const year = document.getElementById('year').value;
      const instagram = document.getElementById('instagramId').value.trim();
      const isMainVideo = isVideo(mainFile);

      const data = {
        author,
        instagram: instagram ? `@${instagram.replace(/^@/, '')}` : '',
        instagramUrl: instagram ? `https://instagram.com/${instagram.replace(/^@/, '')}` : '',
        year,
        extras: extraUrls,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (isMainVideo) {
        data.video = mainUrl;
      } else {
        data.image = mainUrl;
      }

      await db.collection('submissions').add(data);

      uploadOverlay.style.display = 'none';
      form.style.display = 'none';
      successScreen.style.display = 'block';

    } catch (err) {
      uploadOverlay.style.display = 'none';
      alert('업로드 실패: ' + err.message);
      console.error(err);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ===== 리셋 =====
  resetBtn.addEventListener('click', () => {
    form.reset();
    mainFile = null;
    detailFiles = [];
    mainFileInput.value = '';
    mainDropZone.classList.remove('has-file');
    mainPreview.innerHTML = '';
    detailList.innerHTML = '';
    successScreen.style.display = 'none';
    form.style.display = 'flex';
    progressFill.style.width = '0%';
  });
})();
