(() => {
  'use strict';

  const WORKER_URL = ADMIN_CONFIG.WORKER_URL;
  const UPLOAD_SECRET = ADMIN_CONFIG.UPLOAD_SECRET;

  const loginScreen = document.getElementById('loginScreen');
  const adminScreen = document.getElementById('adminScreen');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginError = document.getElementById('loginError');
  const userEmailEl = document.getElementById('userEmail');
  const postcardList = document.getElementById('postcardList');
  const addBtn = document.getElementById('addBtn');
  const postcardModal = document.getElementById('postcardModal');
  const modalTitle = document.getElementById('modalTitle');
  const postcardForm = document.getElementById('postcardForm');
  const cancelBtn = document.getElementById('cancelBtn');
  const addExtraBtn = document.getElementById('addExtraBtn');
  const extrasContainer = document.getElementById('extrasContainer');
  const submitBtn = document.getElementById('submitBtn');
  const mainDropZone = document.getElementById('mainDropZone');
  const mainFileInput = document.getElementById('formMainFile');
  const mainUrlInput = document.getElementById('formMainUrl');
  const mainPreview = document.getElementById('mainPreview');
  const uploadOverlay = document.getElementById('uploadOverlay');
  const uploadStatus = document.getElementById('uploadStatus');
  const uploadProgress = document.getElementById('uploadProgress');

  const submissionList = document.getElementById('submissionList');
  const submissionModal = document.getElementById('submissionModal');
  const submissionDetail = document.getElementById('submissionDetail');
  const submissionCountEl = document.getElementById('submissionCount');
  const acceptBtn = document.getElementById('acceptBtn');
  const rejectBtn = document.getElementById('rejectBtn');
  const closeSubmissionBtn = document.getElementById('closeSubmissionBtn');

  let allPostcards = [];
  let allSubmissions = [];
  let currentSubmission = null;
  let mainFile = null;

  // ===== 탭 =====
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('submissionsTab').style.display = target === 'submissions' ? 'block' : 'none';
      document.getElementById('postcardsTab').style.display = target === 'postcards' ? 'block' : 'none';
    });
  });

  // ===== 유틸 =====
  function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function isVideoFile(file) {
    return file && file.type.startsWith('video/');
  }

  function isVideoUrl(url) {
    return /\.(mp4|webm|mov)(\?|$)/i.test(url);
  }

  // ===== R2 Upload =====
  async function uploadToR2(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'X-Upload-Secret': UPLOAD_SECRET },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }
    return (await res.json()).url;
  }

  function extractR2Key(url) {
    if (!url) return null;
    try {
      const u = new URL(url);
      const key = decodeURIComponent(u.pathname.replace(/^\//, ''));
      return key || null;
    } catch { return null; }
  }

  async function deleteFromR2(keys) {
    const validKeys = keys.filter(Boolean);
    if (validKeys.length === 0) return;
    try {
      await fetch(WORKER_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Upload-Secret': UPLOAD_SECRET,
        },
        body: JSON.stringify({ keys: validKeys }),
      });
    } catch (err) {
      console.warn('R2 삭제 실패 (무시됨):', err);
    }
  }

  function showUploadProgress(current, total) {
    uploadOverlay.style.display = 'flex';
    uploadStatus.textContent = `업로드 중... (${current}/${total})`;
    uploadProgress.style.width = `${(current / total) * 100}%`;
  }

  function hideUploadProgress() {
    uploadOverlay.style.display = 'none';
    uploadProgress.style.width = '0%';
  }

  // ===== Auth =====
  auth.onAuthStateChanged(user => {
    if (user) {
      loginScreen.style.display = 'none';
      adminScreen.style.display = 'block';
      userEmailEl.textContent = user.email;
      loadPostcards();
      loadSubmissions();
    } else {
      loginScreen.style.display = 'flex';
      adminScreen.style.display = 'none';
    }
  });

  loginBtn.addEventListener('click', async () => {
    loginError.textContent = '';
    try {
      await auth.signInWithEmailAndPassword(loginEmail.value, loginPassword.value);
    } catch (e) {
      loginError.textContent = '로그인 실패: ' + e.message;
    }
  });

  loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });

  logoutBtn.addEventListener('click', () => auth.signOut());

  // ===== Submissions =====
  async function loadSubmissions() {
    const snapshot = await db.collection('submissions').orderBy('createdAt', 'desc').get();
    allSubmissions = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    const pendingCount = allSubmissions.filter(s => s.status === 'pending').length;
    submissionCountEl.textContent = pendingCount;
    renderSubmissions();
  }

  function renderSubmissions() {
    if (allSubmissions.length === 0) {
      submissionList.innerHTML = '<div class="empty-state">신청 내역이 없습니다</div>';
      return;
    }

    submissionList.innerHTML = '';
    allSubmissions.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'submission-card';

      const mediaSrc = sub.video || sub.image || '';
      const isVideo = !!sub.video;
      const extrasCount = sub.extras ? sub.extras.length : 0;
      const statusLabel = { pending: '대기중', accepted: '수락됨', rejected: '거절됨' };
      const dateStr = sub.createdAt ? new Date(sub.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : '';

      card.innerHTML = `
        ${isVideo
          ? `<video class="sub-thumb" src="${mediaSrc}" muted autoplay loop playsinline></video>`
          : `<img class="sub-thumb" src="${mediaSrc}" alt="${sub.author || ''}" loading="lazy">`
        }
        <div class="sub-info">
          <div class="sub-author">${sub.author || '(이름 없음)'}</div>
          <div class="sub-instagram">${sub.instagram || ''}</div>
          <div class="sub-meta">${sub.year || ''} · extras ${extrasCount}개 · ${dateStr}</div>
          <div class="sub-status ${sub.status || 'pending'}">${statusLabel[sub.status] || '대기중'}</div>
        </div>
      `;

      card.addEventListener('click', () => openSubmissionDetail(sub));
      submissionList.appendChild(card);
    });
  }

  function openSubmissionDetail(sub) {
    currentSubmission = sub;
    const mediaSrc = sub.video || sub.image || '';
    const isVideo = !!sub.video;

    let mediaHtml = '';
    if (isVideo) {
      mediaHtml = `<video src="${mediaSrc}" controls playsinline style="max-width:100%;max-height:300px;border-radius:10px"></video>`;
    } else if (mediaSrc) {
      mediaHtml = `<img src="${mediaSrc}" style="max-width:100%;max-height:300px;border-radius:10px">`;
    }

    let extrasHtml = '';
    if (sub.extras && sub.extras.length > 0) {
      extrasHtml = '<div class="detail-extras">' + sub.extras.map(url => {
        if (isVideoUrl(url)) {
          return `<video src="${url}" controls playsinline></video>`;
        }
        return `<img src="${url}" loading="lazy">`;
      }).join('') + '</div>';
    }

    const dateStr = sub.createdAt ? new Date(sub.createdAt.seconds * 1000).toLocaleString('ko-KR') : '-';

    submissionDetail.innerHTML = `
      <div class="detail-media">${mediaHtml}</div>
      ${extrasHtml}
      <div class="detail-grid">
        <div class="detail-label">이름</div>
        <div class="detail-value">${sub.author || '-'}</div>
        <div class="detail-label">인스타그램</div>
        <div class="detail-value">${sub.instagram || '-'}</div>
        <div class="detail-label">연도</div>
        <div class="detail-value">${sub.year || '-'}</div>
        <div class="detail-label">제출일</div>
        <div class="detail-value">${dateStr}</div>
        <div class="detail-label">상태</div>
        <div class="detail-value">${sub.status || 'pending'}</div>
      </div>
    `;

    const isPending = !sub.status || sub.status === 'pending';
    acceptBtn.style.display = isPending ? 'block' : 'none';
    rejectBtn.style.display = isPending ? 'block' : 'none';

    submissionModal.style.display = 'flex';
  }

  function closeSubmissionModal() {
    submissionModal.style.display = 'none';
    currentSubmission = null;
  }

  closeSubmissionBtn.addEventListener('click', closeSubmissionModal);
  submissionModal.addEventListener('click', (e) => {
    if (e.target === submissionModal) closeSubmissionModal();
  });

  acceptBtn.addEventListener('click', async () => {
    if (!currentSubmission) return;
    if (!confirm(`"${currentSubmission.author}" 엽서를 수락하시겠습니까?`)) return;

    try {
      const sub = currentSubmission;
      const maxOrder = allPostcards.length > 0
        ? Math.max(...allPostcards.map(c => c.order || 0)) + 1
        : 0;

      const postcardData = {
        author: sub.author || '',
        instagram: sub.instagram || '',
        instagramUrl: sub.instagramUrl || '',
        extras: sub.extras || [],
        order: maxOrder,
        year: sub.year || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (sub.video) {
        postcardData.video = sub.video;
      } else {
        postcardData.image = sub.image || '';
      }

      await db.collection('postcards').add(postcardData);
      await db.collection('submissions').doc(sub.firestoreId).delete();

      showToast('수락 완료 — 엽서에 추가되었습니다');
      closeSubmissionModal();
      loadSubmissions();
      loadPostcards();
    } catch (err) {
      showToast('수락 실패: ' + err.message);
      console.error(err);
    }
  });

  rejectBtn.addEventListener('click', async () => {
    if (!currentSubmission) return;
    if (!confirm(`"${currentSubmission.author}" 엽서를 거절하시겠습니까?\n이미지/영상도 함께 삭제됩니다.`)) return;

    try {
      const sub = currentSubmission;
      const keysToDelete = [];

      const mainUrl = sub.video || sub.image || '';
      keysToDelete.push(extractR2Key(mainUrl));

      if (sub.extras) {
        sub.extras.forEach(url => keysToDelete.push(extractR2Key(url)));
      }

      await deleteFromR2(keysToDelete);
      await db.collection('submissions').doc(sub.firestoreId).delete();

      showToast('거절 완료 — 파일이 삭제되었습니다');
      closeSubmissionModal();
      loadSubmissions();
    } catch (err) {
      showToast('거절 실패: ' + err.message);
      console.error(err);
    }
  });

  // ===== Postcards CRUD =====
  async function loadPostcards() {
    const snapshot = await db.collection('postcards').orderBy('order', 'desc').get();
    allPostcards = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
    renderList();
  }

  function renderList() {
    postcardList.innerHTML = '';
    allPostcards.forEach(card => {
      const div = document.createElement('div');
      div.className = 'postcard-item';

      const mediaSrc = card.video || card.image || '';
      const isVideo = !!card.video;
      const extrasCount = card.extras ? card.extras.length : 0;

      div.innerHTML = `
        ${isVideo
          ? `<video class="thumb" src="${mediaSrc}" muted autoplay loop playsinline></video>`
          : `<img class="thumb" src="${mediaSrc}" alt="${card.author || ''}" loading="lazy">`
        }
        <div class="info">
          <div class="author">${card.author || '(이름 없음)'}</div>
          <div class="instagram">${card.instagram || ''}</div>
          <div class="meta">order: ${card.order ?? '-'} · extras: ${extrasCount}개</div>
          <div class="actions">
            <button class="btn-secondary edit-btn">수정</button>
            <button class="btn-danger delete-btn">삭제</button>
          </div>
        </div>
      `;

      div.querySelector('.edit-btn').addEventListener('click', () => openEditModal(card));
      div.querySelector('.delete-btn').addEventListener('click', () => deletePostcard(card));

      postcardList.appendChild(div);
    });
  }

  async function deletePostcard(card) {
    if (!confirm(`"${card.author}" 엽서를 삭제하시겠습니까?`)) return;
    try {
      await db.collection('postcards').doc(card.firestoreId).delete();
      showToast('삭제 완료');
      loadPostcards();
    } catch (e) {
      showToast('삭제 실패: ' + e.message);
    }
  }

  // ===== 엽서 모달 =====
  addBtn.addEventListener('click', openAddModal);
  cancelBtn.addEventListener('click', closeModal);
  postcardModal.addEventListener('click', (e) => {
    if (e.target === postcardModal) closeModal();
  });

  function openAddModal() {
    modalTitle.textContent = '엽서 추가';
    postcardForm.reset();
    document.getElementById('formId').value = '';
    clearMainFile();
    mainUrlInput.value = '';
    extrasContainer.innerHTML = '';
    postcardModal.style.display = 'flex';
  }

  function openEditModal(card) {
    modalTitle.textContent = '엽서 수정';
    document.getElementById('formId').value = card.firestoreId;
    document.getElementById('formAuthor').value = card.author || '';
    document.getElementById('formYear').value = card.year || '2026';
    document.getElementById('formOrder').value = card.order ?? 0;

    const ig = (card.instagram || '').replace(/^@/, '');
    document.getElementById('formInstagram').value = ig;

    clearMainFile();
    const existingUrl = card.video || card.image || '';
    mainUrlInput.value = existingUrl;
    if (existingUrl) showUrlPreview(existingUrl);

    extrasContainer.innerHTML = '';
    if (card.extras && card.extras.length > 0) {
      card.extras.forEach(url => addExtraRow(url));
    }

    postcardModal.style.display = 'flex';
  }

  function closeModal() {
    postcardModal.style.display = 'none';
  }

  // ===== 메인 파일 미리보기 =====
  function clearMainFile() {
    mainFile = null;
    mainFileInput.value = '';
    mainDropZone.classList.remove('has-file');
    mainPreview.innerHTML = '';
  }

  function setMainFilePreview(file) {
    mainFile = file;
    mainUrlInput.value = '';
    mainDropZone.classList.add('has-file');

    const objectUrl = URL.createObjectURL(file);
    const mediaTag = isVideoFile(file)
      ? `<video src="${objectUrl}" muted autoplay loop playsinline></video>`
      : `<img src="${objectUrl}">`;

    mainPreview.innerHTML = `
      <div class="file-preview-item">
        ${mediaTag}
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${formatSize(file.size)}</div>
        </div>
        <button type="button" class="remove-file" onclick="document.querySelector('#formMainFile').dispatchEvent(new Event('clear'))">×</button>
      </div>`;
  }

  function showUrlPreview(url) {
    if (!url) { mainPreview.innerHTML = ''; return; }
    mainDropZone.classList.remove('has-file');
    mainFile = null;
    if (isVideoUrl(url)) {
      mainPreview.innerHTML = `<div class="file-preview-item"><video src="${url}" muted autoplay loop playsinline></video><div class="file-info"><div class="file-name">URL 미리보기</div></div></div>`;
    } else {
      mainPreview.innerHTML = `<div class="file-preview-item"><img src="${url}"><div class="file-info"><div class="file-name">URL 미리보기</div></div></div>`;
    }
  }

  mainFileInput.addEventListener('change', () => {
    const file = mainFileInput.files[0];
    if (file) setMainFilePreview(file);
  });

  mainFileInput.addEventListener('clear', clearMainFile);

  mainUrlInput.addEventListener('input', () => {
    const url = mainUrlInput.value.trim();
    if (url) {
      mainFile = null;
      mainFileInput.value = '';
      showUrlPreview(url);
    } else {
      mainPreview.innerHTML = '';
    }
  });

  ['dragover', 'dragenter'].forEach(evt => {
    mainDropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      mainDropZone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    mainDropZone.addEventListener(evt, () => mainDropZone.classList.remove('dragover'));
  });
  mainDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setMainFilePreview(file);
  });

  // ===== Extras 관리 =====
  addExtraBtn.addEventListener('click', () => addExtraRow(''));

  function addExtraRow(existingUrl) {
    const item = document.createElement('div');
    item.className = 'detail-item';
    item.innerHTML = `
      <div style="flex:1">
        <div class="detail-drop">
          <input type="file" accept="image/jpeg,image/png,video/mp4">
          <span class="drop-placeholder">파일 선택 (이미지/영상)</span>
        </div>
        <div class="detail-url-row">
          <span class="detail-or">또는</span>
          <input type="url" class="extra-url" placeholder="이미지/영상 URL" value="${existingUrl}">
        </div>
        <div class="extra-preview"></div>
      </div>
      <button type="button" class="remove-detail">×</button>
    `;

    const fileInput = item.querySelector('input[type="file"]');
    const urlInput = item.querySelector('.extra-url');
    const dropArea = item.querySelector('.detail-drop');
    const previewEl = item.querySelector('.extra-preview');

    if (existingUrl) {
      showExtraPreview(previewEl, existingUrl, isVideoUrl(existingUrl));
    }

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        urlInput.value = '';
        dropArea.classList.add('has-file');
        const objectUrl = URL.createObjectURL(file);
        const tag = isVideoFile(file) ? 'video' : 'img';
        showExtraPreview(previewEl, objectUrl, isVideoFile(file));
      }
    });

    urlInput.addEventListener('input', () => {
      const url = urlInput.value.trim();
      if (url) {
        fileInput.value = '';
        dropArea.classList.remove('has-file');
        showExtraPreview(previewEl, url, isVideoUrl(url));
      } else {
        previewEl.innerHTML = '';
      }
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
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change'));
      }
    });

    item.querySelector('.remove-detail').addEventListener('click', () => item.remove());
    extrasContainer.appendChild(item);
  }

  function showExtraPreview(el, src, video) {
    if (video) {
      el.innerHTML = `<video src="${src}" muted autoplay loop playsinline style="max-height:60px;border-radius:4px"></video>`;
    } else {
      el.innerHTML = `<img src="${src}" style="max-height:60px;border-radius:4px">`;
    }
  }

  // ===== 폼 제출 =====
  postcardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;

    try {
      const firestoreId = document.getElementById('formId').value;
      let mainUrl = mainUrlInput.value.trim();

      const extraEntries = [];
      extrasContainer.querySelectorAll('.detail-item').forEach(item => {
        const file = item.querySelector('input[type="file"]').files[0];
        const url = item.querySelector('.extra-url').value.trim();
        if (file) {
          extraEntries.push({ file, url: null });
        } else if (url) {
          extraEntries.push({ file: null, url });
        }
      });

      const filesToUpload = [];
      if (mainFile) filesToUpload.push(mainFile);
      extraEntries.forEach(e => { if (e.file) filesToUpload.push(e.file); });

      if (filesToUpload.length > 0) {
        let uploaded = 0;
        const total = filesToUpload.length;
        showUploadProgress(0, total);

        if (mainFile) {
          mainUrl = await uploadToR2(mainFile);
          uploaded++;
          showUploadProgress(uploaded, total);
        }

        for (const entry of extraEntries) {
          if (entry.file) {
            entry.url = await uploadToR2(entry.file);
            uploaded++;
            showUploadProgress(uploaded, total);
          }
        }

        hideUploadProgress();
      }

      if (!mainUrl) {
        showToast('대표 이미지/영상을 업로드하거나 URL을 입력하세요');
        submitBtn.disabled = false;
        return;
      }

      const isVideo = isVideoUrl(mainUrl) || isVideoFile(mainFile);
      const extras = extraEntries.map(e => e.url).filter(Boolean);
      const igId = document.getElementById('formInstagram').value.trim().replace(/^@/, '');

      const data = {
        author: document.getElementById('formAuthor').value.trim(),
        instagram: igId ? `@${igId}` : '',
        instagramUrl: igId ? `https://instagram.com/${igId}` : '',
        year: document.getElementById('formYear').value,
        order: parseInt(document.getElementById('formOrder').value) || 0,
        extras,
      };

      if (isVideo) {
        data.video = mainUrl;
      } else {
        data.image = mainUrl;
      }

      if (firestoreId) {
        if (isVideo) {
          data.image = firebase.firestore.FieldValue.delete();
        } else {
          data.video = firebase.firestore.FieldValue.delete();
        }
        await db.collection('postcards').doc(firestoreId).update(data);
        showToast('수정 완료');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('postcards').add(data);
        showToast('추가 완료');
      }

      closeModal();
      loadPostcards();
    } catch (err) {
      hideUploadProgress();
      showToast('저장 실패: ' + err.message);
      console.error(err);
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
