(() => {
  'use strict';

  // ===== 모바일 감지 =====
  const IS_MOBILE = window.innerWidth <= 768;

  // ===== 캔버스 설정 =====
  const CARD_COLS = IS_MOBILE ? 7 : 8;
  const BASE_W = IS_MOBILE ? 150 : 280;
  const BASE_H = IS_MOBILE ? 190 : 350;
  const GAP_X = IS_MOBILE ? 100 : 220;
  const GAP_Y = IS_MOBILE ? 80 : 180;
  const STAGGER_X = (BASE_W + GAP_X) / 2;
  const PADDING_X = IS_MOBILE ? 40 : 80;
  const PADDING_Y = IS_MOBILE ? 40 : 80;
  const FRICTION = 0.92;
  const MIN_VELOCITY = 0.5;

  // 카드 수에 따라 캔버스 크기 동적 계산
  function calcCanvasSize(cardCount) {
    const rows = Math.ceil(cardCount / CARD_COLS);
    const w = CARD_COLS * (BASE_W + GAP_X) + STAGGER_X + PADDING_X * 2;
    const h = rows * (BASE_H + GAP_Y) + PADDING_Y * 2;
    return { w, h, rows };
  }

  let CANVAS_WIDTH, CANVAS_HEIGHT;

  // 카드 기준 면적 (원본 비율 유지, 세로/가로 이미지 시각적 크기 통일)
  const CARD_TARGET_AREA = BASE_W * BASE_H;

  // postcards 데이터는 postcards.js에서 로드됩니다

  // ===== 원본 비율 기반 면적 균등 크기 계산 =====
  const MAX_CARD_W = IS_MOBILE ? 220 : 480;

  function calcSizeByArea(aspect) {
    // area = w * h, w = aspect * h → area = aspect * h² → h = sqrt(area / aspect)
    let h = Math.round(Math.sqrt(CARD_TARGET_AREA / aspect));
    let w = Math.round(h * aspect);
    if (w > MAX_CARD_W) {
      w = MAX_CARD_W;
      h = Math.round(w / aspect);
    }
    return { w, h };
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(resolve => setTimeout(resolve, ms)),
    ]);
  }

  function loadMediaSize(card) {
    if (card.video) {
      return withTimeout(new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = card.video;
        const done = () => {
          if (video.videoWidth && video.videoHeight) {
            const aspect = video.videoWidth / video.videoHeight;
            Object.assign(card, calcSizeByArea(aspect));
          } else {
            card.w = BASE_W;
            card.h = BASE_H;
          }
          resolve();
        };
        video.addEventListener('loadedmetadata', done);
        video.addEventListener('error', done);
      }), IS_MOBILE ? 3000 : 5000).then(() => {
        if (!card.w || !card.h) {
          card.w = BASE_W;
          card.h = BASE_H;
        }
      });
    }
    card.w = BASE_W;
    card.h = BASE_H;
    return Promise.resolve();
  }

  // ===== 카드 배치 (셔플 + 엇갈린 벽돌 + 랜덤 jitter) =====
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function layoutCards(cards) {
    const shuffled = shuffle(cards);
    const positions = [];
    const stepX = BASE_W + GAP_X;
    const stepY = BASE_H + GAP_Y;
    const totalRows = Math.ceil(shuffled.length / CARD_COLS);

    // 1단계: 그리드 기준 좌표 계산
    const rawPositions = [];
    shuffled.forEach((card, i) => {
      const col = i % CARD_COLS;
      const row = Math.floor(i / CARD_COLS);
      const isOddRow = row % 2 === 1;
      const stagger = isOddRow ? STAGGER_X : 0;

      const cx = col * stepX + stagger;
      const cy = row * stepY;

      rawPositions.push({ card, cx, cy });
    });

    // 2단계: 그리드 중심 → 캔버스 중심 오프셋 계산
    let minCx = Infinity, maxCx = -Infinity, minCy = Infinity, maxCy = -Infinity;
    rawPositions.forEach(({ cx, cy }) => {
      if (cx < minCx) minCx = cx;
      if (cx > maxCx) maxCx = cx;
      if (cy < minCy) minCy = cy;
      if (cy > maxCy) maxCy = cy;
    });
    const gridCenterX = (minCx + maxCx) / 2;
    const gridCenterY = (minCy + maxCy) / 2;
    const shiftX = CANVAS_WIDTH / 2 - gridCenterX;
    const shiftY = CANVAS_HEIGHT / 2 - gridCenterY;

    // 3단계: 최종 좌표 (중앙 정렬 + jitter)
    rawPositions.forEach(({ card, cx, cy }) => {
      const jitterX = (Math.random() - 0.5) * 60;
      const jitterY = (Math.random() - 0.5) * 60;

      const x = cx + shiftX - card.w / 2 + jitterX;
      const y = cy + shiftY - card.h / 2 + jitterY;
      const rotation = (Math.random() - 0.5) * 16;

      positions.push({ ...card, x, y, rotation });
    });

    return positions;
  }

  // ===== DOM 생성 =====
  function renderCards(canvas, cards) {
    const elements = [];

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'postcard';
      el.style.left = `${card.x}px`;
      el.style.top = `${card.y}px`;
      el.style.width = `${card.w}px`;
      el.style.height = `${card.h}px`;
      el.style.setProperty('--rotation', `${card.rotation}deg`);

      if (card.video) {
        const video = document.createElement('video');
        video.src = card.video;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.draggable = false;
        el.appendChild(video);
      } else if (card.image) {
        const img = document.createElement('img');
        img.src = card.image;
        img.alt = card.author || '';
        img.draggable = false;
        img.loading = 'lazy';
        el.appendChild(img);
      }

      el._cardData = card;
      el.style.setProperty('--intro-rotate', `${(Math.random() - 0.5) * 12}deg`);
      canvas.appendChild(el);
      elements.push(el);
    });

    // 순차 등장 애니메이션
    requestAnimationFrame(() => {
      elements.forEach((el, i) => {
        setTimeout(() => {
          el.classList.add('is-visible');
        }, i * 40);
      });
    });
  }

  // ===== 상세 보기 =====
  function initDetail() {
    const backdrop = document.getElementById('detailBackdrop');
    const scrollEl = document.getElementById('detailScroll');
    const inner = document.getElementById('detailScrollInner');

    let isOpen = false;
    let sourceEl = null;

    function calcTargetSize(card) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isMobile = vw <= 768;
      const maxH = vh * (isMobile ? 0.8 : 0.8);
      const maxW = vw * (isMobile ? 0.85 : 0.5);
      const aspect = card.w / card.h;
      let tw, th;
      if (card.h > card.w) {
        th = maxH;
        tw = th * aspect;
        if (tw > maxW) { tw = maxW; th = tw / aspect; }
      } else {
        tw = maxW;
        th = tw / aspect;
        if (th > maxH) { th = maxH; tw = th * aspect; }
      }
      return { tw, th };
    }

    function createCardEl(src, w, h, isVideo) {
      const el = document.createElement('div');
      el.className = 'detail-card';
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;

      if (isVideo) {
        const video = document.createElement('video');
        video.src = src;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.draggable = false;
        el.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = src;
        img.draggable = false;
        el.appendChild(img);
      }
      return el;
    }

    function buildInfoHTML(card) {
      let html = `<p class="detail-author">${card.author || ''}</p>`;
      if (card.instagram) {
        const handle = card.instagram.startsWith('@') ? card.instagram : `@${card.instagram}`;
        const url = card.instagramUrl || `https://instagram.com/${handle.replace('@', '')}`;
        html += `<a class="detail-instagram" href="${url}" target="_blank" rel="noopener noreferrer">${handle}</a>`;
      }
      return html;
    }

    function openDetail(cardEl) {
      if (isOpen) return;
      isOpen = true;
      sourceEl = cardEl;
      const card = cardEl._cardData;

      cardEl.style.opacity = '0';

      const { tw, th } = calcTargetSize(card);
      const vw = window.innerWidth;
      const hasExtras = card.extras && card.extras.length > 0;
      const isMobile = vw <= 768;
      const cardGap = isMobile ? 30 : 60;
      const cardStartY = isMobile ? 90 : 80;
      const leftPos = (vw - tw) / 2;

      inner.innerHTML = '';
      scrollEl.scrollTop = 0;

      // 작가 정보 (헤더 위치에 고정)
      const infoDiv = document.createElement('div');
      infoDiv.className = 'detail-info';
      infoDiv.innerHTML = buildInfoHTML(card);
      document.body.appendChild(infoDiv);

      // 메인 카드
      const mainSrc = card.video || card.image;
      const mainEl = createCardEl(mainSrc, tw, th, !!card.video);
      mainEl.classList.add('main-card');
      mainEl.style.position = 'absolute';
      mainEl.style.left = `${leftPos}px`;
      mainEl.style.top = `${cardStartY}px`;
      mainEl.style.zIndex = '10';
      mainEl.style.opacity = '0';
      mainEl.style.transform = 'scale(0.8)';
      mainEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      inner.appendChild(mainEl);

      // extras — 처음에는 메인 카드 위치에 겹쳐서 배치
      const extraEls = [];
      if (hasExtras) {
        card.extras.forEach((src, i) => {
          const el = createCardEl(src, tw, th, false);
          el.style.position = 'absolute';
          el.style.left = `${leftPos}px`;
          el.style.top = `${cardStartY}px`;
          el.style.zIndex = `${5 - i}`;
          const stackRotation = (Math.random() - 0.5) * 16;
          el.style.transform = `rotate(${stackRotation}deg)`;
          el.style.opacity = '1';
          el.style.transition = 'top 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease';
          el.dataset.stackRotation = stackRotation;
          inner.appendChild(el);
          extraEls.push(el);
        });
      }

      // 스크롤 높이 계산
      const allCount = 1 + (hasExtras ? card.extras.length : 0);
      const lastCardBottom = cardStartY + allCount * (th + cardGap) - cardGap;
      const totalH = lastCardBottom + 80;
      inner.style.height = `${totalH}px`;

      backdrop.classList.add('active');
      scrollEl.classList.add('active');

      // 애니메이션: 메인 카드 등장
      requestAnimationFrame(() => {
        mainEl.style.opacity = '1';
        mainEl.style.transform = 'scale(1)';
      });

      // 애니메이션: extras가 아래로 펼쳐짐 (1초 겹친 상태 유지 후 천천히)
      if (hasExtras) {
        extraEls.forEach((el, i) => {
          const finalTop = cardStartY + (i + 1) * (th + cardGap);
          setTimeout(() => {
            requestAnimationFrame(() => {
              el.style.top = `${finalTop}px`;
              el.style.transform = 'rotate(0deg)';
            });
          }, 1000 + i * 150);
        });
      }

      requestAnimationFrame(() => infoDiv.classList.add('active'));
    }

    function closeDetail() {
      if (!isOpen || !sourceEl) return;
      isOpen = false;

      const card = sourceEl._cardData;
      const hasExtras = card.extras && card.extras.length > 0;
      const { tw, th } = calcTargetSize(card);
      const isMobile = window.innerWidth <= 768;
      const cardStartY = isMobile ? 90 : 90;

      // extras를 메인 카드 위치로 다시 접기
      const extras = inner.querySelectorAll('.detail-card:not(.main-card)');
      extras.forEach((el, i) => {
        el.style.transition = 'top 0.6s cubic-bezier(0.6, 0, 0.4, 1), transform 0.6s cubic-bezier(0.6, 0, 0.4, 1), opacity 0.35s ease';
        setTimeout(() => {
          el.style.top = `${cardStartY}px`;
          el.style.transform = `rotate(${el.dataset.stackRotation || 0}deg)`;
          el.style.opacity = '0';
        }, i * 50);
      });

      // 메인 카드 페이드아웃
      const mainCard = inner.querySelector('.main-card');
      if (mainCard) {
        mainCard.style.opacity = '0';
        mainCard.style.transform = 'scale(0.8)';
      }

      const infoDiv = document.querySelector('body > .detail-info');
      if (infoDiv) infoDiv.classList.remove('active');

      backdrop.classList.remove('active');

      setTimeout(() => {
        scrollEl.classList.remove('active');
        inner.innerHTML = '';
        if (infoDiv) infoDiv.remove();
        if (sourceEl) {
          sourceEl.style.opacity = '';
          sourceEl = null;
        }
      }, 500);
    }

    backdrop.addEventListener('click', closeDetail);

    scrollEl.addEventListener('click', (e) => {
      if (e.target === scrollEl || e.target === inner) {
        closeDetail();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetail();
    });

    return { openDetail, closeDetail, isOpen: () => isOpen };
  }

  let detailAPI = null;

  // ===== 드래그 & 관성 스크롤 =====
  const DRAG_THRESHOLD = 5;

  function initDrag(viewport, canvas) {
    let isPointerDown = false;
    let isDragging = false;
    let startX, startY;
    let offsetX = 0, offsetY = 0;
    let velocityX = 0, velocityY = 0;
    let lastX, lastY, lastTime;
    let animFrame = null;
    let clickTarget = null;

    function applyTransform() {
      canvas.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    }

    function clampOffset() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const minX = -(CANVAS_WIDTH - vw);
      const minY = -(CANVAS_HEIGHT - vh);
      offsetX = Math.max(minX, Math.min(0, offsetX));
      offsetY = Math.max(minY, Math.min(0, offsetY));
    }

    // 초기 위치: 캔버스 정중앙을 화면 정중앙에 맞춤
    offsetX = -(CANVAS_WIDTH - window.innerWidth) / 2;
    offsetY = -(CANVAS_HEIGHT - window.innerHeight) / 2;
    clampOffset();
    applyTransform();

    function onPointerDown(e) {
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      isPointerDown = true;
      isDragging = false;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      startX = clientX;
      startY = clientY;
      lastX = clientX;
      lastY = clientY;
      lastTime = performance.now();
      velocityX = 0;
      velocityY = 0;

      clickTarget = e.target.closest('.postcard');

      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
    }

    function onPointerMove(e) {
      if (!isPointerDown) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const distX = Math.abs(clientX - startX);
      const distY = Math.abs(clientY - startY);

      if (!isDragging) {
        if (distX > DRAG_THRESHOLD || distY > DRAG_THRESHOLD) {
          isDragging = true;
          viewport.classList.add('is-dragging');
        } else {
          return;
        }
      }

      e.preventDefault();

      const dx = clientX - lastX;
      const dy = clientY - lastY;
      const now = performance.now();
      const dt = now - lastTime;

      if (dt > 0) {
        velocityX = dx / dt * 16;
        velocityY = dy / dt * 16;
      }

      offsetX += dx;
      offsetY += dy;
      clampOffset();
      applyTransform();

      lastX = clientX;
      lastY = clientY;
      lastTime = now;
    }

    function onPointerUp(e) {
      if (!isPointerDown) return;
      isPointerDown = false;

      if (isDragging) {
        isDragging = false;
        viewport.classList.remove('is-dragging');
        startInertia();
      } else {
        if (clickTarget && clickTarget._cardData && detailAPI && !detailAPI.isOpen()) {
          detailAPI.openDetail(clickTarget);
        }
      }

      clickTarget = null;
    }

    function startInertia() {
      function step() {
        velocityX *= FRICTION;
        velocityY *= FRICTION;

        if (Math.abs(velocityX) < MIN_VELOCITY && Math.abs(velocityY) < MIN_VELOCITY) {
          animFrame = null;
          return;
        }

        offsetX += velocityX;
        offsetY += velocityY;
        clampOffset();
        applyTransform();

        animFrame = requestAnimationFrame(step);
      }

      animFrame = requestAnimationFrame(step);
    }

    // 마우스 이벤트
    viewport.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // 터치 이벤트
    viewport.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    // 리사이즈 대응
    window.addEventListener('resize', () => {
      clampOffset();
      applyTransform();
    });
  }

  // ===== 이미지 프리로드 + 진행률 =====
  function preloadAndMeasure(cards, onProgress) {
    let loaded = 0;
    const total = cards.length;
    const perItemTimeout = IS_MOBILE ? 4000 : 6000;

    return Promise.all(cards.map(card => {
      if (card.video) {
        loaded++;
        onProgress(loaded / total);
        return Promise.resolve();
      }

      return withTimeout(new Promise(resolve => {
        const img = new Image();
        img.src = card.image;
        img.onload = () => {
          const aspect = img.naturalWidth / img.naturalHeight;
          Object.assign(card, calcSizeByArea(aspect));
          loaded++;
          onProgress(loaded / total);
          resolve();
        };
        img.onerror = () => {
          card.w = BASE_W;
          card.h = BASE_H;
          loaded++;
          onProgress(loaded / total);
          resolve();
        };
      }), perItemTimeout).then(() => {
        if (!card.w || !card.h) {
          card.w = BASE_W;
          card.h = BASE_H;
        }
        if (loaded < total) {
          loaded++;
          onProgress(loaded / total);
        }
      });
    }));
  }

  // ===== 초기화 =====
  async function init() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingFill = document.getElementById('loadingFill');

    // 비디오 사이즈 계산 (병렬)
    const videoCards = postcards.filter(c => c.video);
    const videoPromise = Promise.all(videoCards.map(loadMediaSize));

    // 이미지 프리로드 + 사이즈 계산 (통합)
    const preloadPromise = preloadAndMeasure(postcards, (progress) => {
      loadingFill.style.height = `${Math.round(progress * 100)}%`;
    });

    await Promise.all([videoPromise, preloadPromise]);

    const { w: cw, h: ch } = calcCanvasSize(postcards.length);
    CANVAS_WIDTH = cw;
    CANVAS_HEIGHT = ch;

    const canvas = document.getElementById('canvas');
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    const laid = layoutCards(postcards);
    renderCards(canvas, laid);

    detailAPI = initDetail();

    const viewport = document.querySelector('.viewport');
    initDrag(viewport, canvas);

    // 로딩 화면 제거
    loadingFill.style.height = '100%';
    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
      setTimeout(() => loadingOverlay.remove(), 600);
    }, 400);

    // About 모달
    const aboutBackdrop = document.getElementById('aboutBackdrop');
    const aboutModal = document.getElementById('aboutModal');
    const aboutLink = document.querySelector('.about-link');

    function openAbout(e) {
      e.preventDefault();
      aboutBackdrop.classList.add('active');
      aboutModal.classList.add('active');
    }
    function closeAbout() {
      aboutBackdrop.classList.remove('active');
      aboutModal.classList.remove('active');
    }

    aboutLink.addEventListener('click', openAbout);
    aboutBackdrop.addEventListener('click', closeAbout);
    aboutModal.addEventListener('click', (e) => {
      if (!e.target.closest('a')) closeAbout();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
