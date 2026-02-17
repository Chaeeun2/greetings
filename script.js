(() => {
  'use strict';

  // ===== 모바일 감지 =====
  const IS_MOBILE = window.innerWidth <= 768;

  // ===== 캔버스 설정 =====
  const CARD_COLS = IS_MOBILE ? 3 : 6;
  const BASE_W = IS_MOBILE ? 200 : 340;
  const BASE_H = IS_MOBILE ? 250 : 420;
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

  // ===== 엽서 데이터 =====
  const postcards = [
    { id: 1,  image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/Bbi%201.png',        author: 'Bbi',       instagram: '@isooplll',         instagramUrl: 'https://instagram.com/isooplll', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/Bbi%202.png'] },
    { id: 2,  image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/eugene%201.webp',     author: 'eugene',    instagram: '@euxxgene_works',   instagramUrl: 'https://instagram.com/euxxgene_works', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/eugene%202.webp'] },
    { id: 3,  image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/mana%201.png',        author: 'mana',      instagram: '@mana.webp',        instagramUrl: 'https://instagram.com/mana.webp', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/mana%202.png'] },
    { id: 4,  image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/soi%201.jpg',         author: 'soi',       instagram: '@soiios.zz',        instagramUrl: 'https://instagram.com/soiios.zz', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/soi%202.jpg'] },
    { id: 5,  image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/symsi.jpg',         author: 'symsi',     instagram: '@every.thing.is',   instagramUrl: 'https://instagram.com/every.thing.is' },
    { id: 6,  image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/yyoung.jpg',        author: 'yyoung',    instagram: '@yyoung200',        instagramUrl: 'https://instagram.com/yyoung200' },
    { id: 7,  image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/zooya%20kim%201.jpg',   author: 'zooya kim', instagram: '@zooya_kim',         instagramUrl: 'https://instagram.com/zooya_kim', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/zooya%20kim%202.jpg'] },
    { id: 8,  image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%80%E1%85%AA%E1%86%A8%E1%84%8B%E1%85%A8%E1%84%85%E1%85%B5%E1%86%B7%201.jpg',       author: '곽예림',     instagram: '@kwakk.yr',          instagramUrl: 'https://instagram.com/kwakk.yr', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%80%E1%85%AA%E1%86%A8%E1%84%8B%E1%85%A8%E1%84%85%E1%85%B5%E1%86%B7%202.jpg'] },
    { id: 9,  image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%80%E1%85%AE%E1%84%92%E1%85%A8%E1%84%85%E1%85%B5%E1%86%AB.jpg',          author: '구혜린',     instagram: '@cm369yk',           instagramUrl: 'https://instagram.com/cm369yk', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%80%E1%85%AE%E1%84%92%E1%85%A8%E1%84%85%E1%85%B5%E1%86%AB%202.jpg'] },
    { id: 10, video: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%80%E1%85%B5%E1%86%B7%E1%84%8B%E1%85%A8%E1%84%80%E1%85%A7%E1%86%BC.mp4',          author: '김예경',     instagram: '@yewrks',            instagramUrl: 'https://instagram.com/yewrks' },
    { id: 11, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%87%E1%85%A1%E1%84%85%E1%85%A1%E1%86%BC%201.png',         author: '바랑',       instagram: '@barang._.design_',  instagramUrl: 'https://instagram.com/barang._.design_', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%87%E1%85%A1%E1%84%85%E1%85%A1%E1%86%BC%202.png'] },
    { id: 12, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%87%E1%85%A1%E1%86%A8%E1%84%87%E1%85%A6%E1%84%85%E1%85%B5%201.jpg',        author: '박베리',     instagram: '@bahkberry_x',       instagramUrl: 'https://instagram.com/bahkberry_x', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%87%E1%85%A1%E1%86%A8%E1%84%87%E1%85%A6%E1%84%85%E1%85%B5%202.png'] },
    { id: 13, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%87%E1%85%A1%E1%86%BC%E1%84%8E%E1%85%A2%E1%84%8B%E1%85%A7%E1%86%AB%201.jpg',        author: '방채연',     instagram: '@_cha.archive.on',   instagramUrl: 'https://instagram.com/_cha.archive.on', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%87%E1%85%A1%E1%86%BC%E1%84%8E%E1%85%A2%E1%84%8B%E1%85%A7%E1%86%AB%202.jpg', 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%87%E1%85%A1%E1%86%BC%E1%84%8E%E1%85%A2%E1%84%8B%E1%85%A7%E1%86%AB%203.jpg', 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%87%E1%85%A1%E1%86%BC%E1%84%8E%E1%85%A2%E1%84%8B%E1%85%A7%E1%86%AB%204.jpg'] },
    { id: 14, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%89%E1%85%B5%E1%84%82%E1%85%A1%E1%84%87%E1%85%B3.jpg',          author: '시나브',     instagram: '@airdrop_1122',      instagramUrl: 'https://instagram.com/airdrop_1122' },
    { id: 15, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%89%E1%85%B5%E1%84%8B%E1%85%A9%201.jpg',         author: '시오',       instagram: '@seao_zip',          instagramUrl: 'https://instagram.com/seao_zip', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%89%E1%85%B5%E1%84%8B%E1%85%A9%202.jpg'] },
    { id: 16, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%89%E1%85%B5%E1%86%AB%E1%84%92%E1%85%AA%E1%86%AB%E1%84%8C%E1%85%AE%E1%86%AB.png',          author: '신환준',     instagram: '@seenhzn',           instagramUrl: 'https://instagram.com/seenhzn' },
    { id: 17, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%8B%E1%85%A9%E1%84%8C%E1%85%A2%201.png',         author: '오재',       instagram: '@ojaeh.kr',          instagramUrl: 'https://instagram.com/ojaeh.kr', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%8B%E1%85%A9%E1%84%8C%E1%85%A2%202.png'] },
    { id: 18, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%8B%E1%85%B2%E1%84%8B%E1%85%AF%E1%86%AB%201.jpg',         author: '유원',       instagram: '@_deeef3',           instagramUrl: 'https://instagram.com/_deeef3', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%8B%E1%85%B2%E1%84%8B%E1%85%AF%E1%86%AB%202.jpg'] },
    { id: 19, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%8B%E1%85%B5%E1%84%8E%E1%85%A2%E1%84%92%E1%85%A7%E1%86%AB.jpg',          author: '이채현',     instagram: '',                   instagramUrl: '' },
    { id: 20, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%8C%E1%85%A5%E1%86%BC%E1%84%92%E1%85%A7%E1%86%AB%E1%84%8C%E1%85%AE.jpg',          author: '정현주',     instagram: '@jujung.hyn',        instagramUrl: 'https://instagram.com/jujung.hyn' },
    { id: 21, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%8E%E1%85%AC%E1%84%8B%E1%85%B5%E1%84%8B%E1%85%A1%E1%86%AB.jpg',          author: '최이안',     instagram: '@ianch0i',           instagramUrl: 'https://instagram.com/ianch0i' },
    { id: 22, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%91%E1%85%B5%E1%84%91%E1%85%B5%201.png',         author: '피피',       instagram: '@peepi.kr',          instagramUrl: 'https://instagram.com/peepi.kr', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%91%E1%85%B5%E1%84%91%E1%85%B5%202.png'] },
    { id: 23, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/%E1%84%92%E1%85%B4%E1%84%8B%E1%85%B2%E1%86%AB.png', author: '희윤', instagram: '@hyoonzine', instagramUrl: 'https://instagram.com/hyoonzine' },
    { id: 24, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/chaewon.jpg',         author: '문채원',       instagram: '@whatinthe_zip',          instagramUrl: 'https://instagram.com/whatinthe_zip' },
    { id: 25, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/seon.jpg', author: 'seon', instagram: '@seon.object', instagramUrl: 'https://instagram.com/hyoonzine' },
    { id: 25, image: 'https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/alot.jpg',           author: '어랏',       instagram: '@alolot.kr',         instagramUrl: 'https://instagram.com/alolot.kr', extras: ['https://pub-0e3520b4da7b4fd383674dd5e967ed42.r2.dev/alot2.jpg'] },
  ];

  // ===== 원본 비율 기반 면적 균등 크기 계산 =====
  const MAX_CARD_W = IS_MOBILE ? 280 : 480;

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

  function loadMediaSize(card) {
    return new Promise((resolve) => {
      if (card.video) {
        const video = document.createElement('video');
        video.src = card.video;
        video.addEventListener('loadedmetadata', () => {
          const aspect = video.videoWidth / video.videoHeight;
          Object.assign(card, calcSizeByArea(aspect));
          resolve();
        });
        video.addEventListener('error', () => {
          card.w = BASE_W;
          card.h = BASE_H;
          resolve();
        });
      } else if (card.image) {
        const img = new Image();
        img.src = card.image;
        img.onload = () => {
          const aspect = img.naturalWidth / img.naturalHeight;
          Object.assign(card, calcSizeByArea(aspect));
          resolve();
        };
        img.onerror = () => {
          card.w = BASE_W;
          card.h = BASE_H;
          resolve();
        };
      } else {
        card.w = BASE_W;
        card.h = BASE_H;
        resolve();
      }
    });
  }

  // ===== SVG 아트 생성 =====
  function createCardArt(type, bg) {
    const isDark = isColorDark(bg);
    const stroke = isDark ? '#ffffff' : '#333333';
    const accent = isDark ? '#ffcc66' : '#c0392b';

    const arts = {
      tree: `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,10 20,50 80,50" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <polygon points="50,30 15,75 85,75" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <polygon points="50,50 10,100 90,100" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <rect x="43" y="100" width="14" height="12" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <circle cx="50" cy="10" r="3" fill="${accent}"/>
      </svg>`,
      abstract: `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="50" r="30" fill="none" stroke="#e74c3c" stroke-width="1.5"/>
        <path d="M30,50 Q60,10 90,50 Q60,90 30,50" fill="none" stroke="#3498db" stroke-width="1.2"/>
        <line x1="20" y1="50" x2="100" y2="50" stroke="#ccc" stroke-width="0.5"/>
        <circle cx="60" cy="50" r="5" fill="#e74c3c" opacity="0.3"/>
      </svg>`,
      snowflake: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(50,50)" stroke="#6eabdb" stroke-width="1.2" fill="none">
          ${[0,60,120,180,240,300].map(a => `<line x1="0" y1="0" x2="0" y2="-35" transform="rotate(${a})"/>
            <line x1="0" y1="-20" x2="-8" y2="-28" transform="rotate(${a})"/>
            <line x1="0" y1="-20" x2="8" y2="-28" transform="rotate(${a})"/>`).join('')}
        </g>
      </svg>`,
      star: `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <polygon points="60,5 72,40 110,40 78,60 88,95 60,72 32,95 42,60 10,40 48,40" fill="none" stroke="#e67e22" stroke-width="1.5"/>
        <line x1="60" y1="0" x2="60" y2="100" stroke="#f39c12" stroke-width="0.3" opacity="0.5"/>
        <circle cx="60" cy="5" r="8" fill="#e74c3c" opacity="0.2"/>
      </svg>`,
      ornament: `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="65" r="30" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <rect x="45" y="30" width="10" height="8" rx="2" fill="none" stroke="${stroke}" stroke-width="1.2"/>
        <path d="M50,28 Q55,20 50,15 Q45,20 50,28" fill="none" stroke="${stroke}" stroke-width="1"/>
        <ellipse cx="50" cy="65" rx="20" ry="10" fill="none" stroke="${stroke}" stroke-width="0.5" opacity="0.5"/>
      </svg>`,
      dance: `<svg viewBox="0 0 90 130" xmlns="http://www.w3.org/2000/svg">
        ${[0,1,2,3,4].map(i => {
          const x = 15 + i * 15;
          return `<circle cx="${x}" cy="${40 + Math.sin(i)*10}" r="4" fill="none" stroke="${stroke}" stroke-width="1"/>
            <line x1="${x}" y1="${44 + Math.sin(i)*10}" x2="${x}" y2="${70 + Math.sin(i)*10}" stroke="${stroke}" stroke-width="1"/>
            <line x1="${x-8}" y1="${55 + Math.sin(i)*10}" x2="${x+8}" y2="${55 + Math.cos(i)*8}" stroke="${stroke}" stroke-width="1"/>
            <line x1="${x}" y1="${70 + Math.sin(i)*10}" x2="${x-6}" y2="${90 + Math.sin(i)*10}" stroke="${stroke}" stroke-width="1"/>
            <line x1="${x}" y1="${70 + Math.sin(i)*10}" x2="${x+6}" y2="${90 + Math.cos(i)*10}" stroke="${stroke}" stroke-width="1"/>`;
        }).join('')}
      </svg>`,
      house: `<svg viewBox="0 0 110 140" xmlns="http://www.w3.org/2000/svg">
        <polygon points="55,15 15,55 95,55" fill="none" stroke="${stroke}" stroke-width="1"/>
        <rect x="20" y="55" width="70" height="60" fill="none" stroke="${stroke}" stroke-width="1"/>
        <rect x="42" y="85" width="16" height="30" fill="none" stroke="${stroke}" stroke-width="1"/>
        <rect x="28" y="65" width="12" height="12" fill="none" stroke="${stroke}" stroke-width="0.8"/>
        <rect x="65" y="65" width="12" height="12" fill="none" stroke="${stroke}" stroke-width="0.8"/>
        ${[0,1,2,3,4,5].map(i => `<circle cx="${20+i*16}" cy="${10+Math.random()*5}" r="1" fill="${stroke}" opacity="0.6"/>`).join('')}
      </svg>`,
      holly: `<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,20 Q30,50 40,80 Q45,90 50,110" fill="none" stroke="#2d5a27" stroke-width="2"/>
        <ellipse cx="40" cy="50" rx="18" ry="28" fill="none" stroke="#2d5a27" stroke-width="1.2" transform="rotate(-15,40,50)"/>
        <ellipse cx="62" cy="55" rx="18" ry="28" fill="none" stroke="#2d5a27" stroke-width="1.2" transform="rotate(15,62,55)"/>
        <circle cx="50" cy="35" r="5" fill="#c0392b"/>
        <circle cx="56" cy="30" r="4" fill="#e74c3c"/>
        <circle cx="44" cy="32" r="3.5" fill="#a93226"/>
      </svg>`,
      wreath: `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="50" r="32" fill="none" stroke="#5d7a3a" stroke-width="3"/>
        ${[0,30,60,90,120,150,180,210,240,270,300,330].map(a => {
          const rad = a * Math.PI / 180;
          const x = 60 + 32 * Math.cos(rad);
          const y = 50 + 32 * Math.sin(rad);
          return `<circle cx="${x}" cy="${y}" r="${a%60===0 ? 3 : 2}" fill="${a%60===0 ? '#c0392b' : '#6b8e3a'}"/>`;
        }).join('')}
        <text x="60" y="54" text-anchor="middle" font-size="8" font-family="serif" fill="#333" letter-spacing="1">MERRY</text>
        <text x="60" y="64" text-anchor="middle" font-size="7" font-family="serif" fill="#333" letter-spacing="1">CHRISTMAS</text>
      </svg>`,
      pine: `<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,10 30,40 70,40" fill="#2d5a27" opacity="0.8"/>
        <polygon points="50,25 25,60 75,60" fill="#2d5a27" opacity="0.7"/>
        <polygon points="50,40 20,80 80,80" fill="#2d5a27" opacity="0.6"/>
        <polygon points="50,55 15,100 85,100" fill="#2d5a27" opacity="0.5"/>
        <rect x="44" y="100" width="12" height="15" fill="#5d4037"/>
        <circle cx="50" cy="10" r="4" fill="#ffd700"/>
      </svg>`,
      candle: `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="45" width="20" height="55" fill="none" stroke="${stroke}" stroke-width="1.5" rx="2"/>
        <ellipse cx="50" cy="45" rx="10" ry="3" fill="none" stroke="${stroke}" stroke-width="1"/>
        <line x1="50" y1="45" x2="50" y2="30" stroke="${stroke}" stroke-width="1"/>
        <ellipse cx="50" cy="25" rx="5" ry="8" fill="none" stroke="#e67e22" stroke-width="1">
          <animate attributeName="ry" values="8;6;8" dur="2s" repeatCount="indefinite"/>
        </ellipse>
        <circle cx="50" cy="22" r="2" fill="#f39c12" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite"/>
        </circle>
      </svg>`,
      gift: `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="40" width="70" height="45" fill="none" stroke="${stroke}" stroke-width="1.5" rx="2"/>
        <rect x="20" y="30" width="80" height="15" fill="none" stroke="${stroke}" stroke-width="1.5" rx="2"/>
        <line x1="60" y1="30" x2="60" y2="85" stroke="#c0392b" stroke-width="2"/>
        <line x1="20" y1="38" x2="100" y2="38" stroke="#c0392b" stroke-width="2"/>
        <path d="M60,30 Q50,15 40,25" fill="none" stroke="#c0392b" stroke-width="1.5"/>
        <path d="M60,30 Q70,15 80,25" fill="none" stroke="#c0392b" stroke-width="1.5"/>
      </svg>`,
      bell: `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <path d="M30,70 Q30,30 50,25 Q70,30 70,70" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <line x1="25" y1="70" x2="75" y2="70" stroke="${stroke}" stroke-width="1.5"/>
        <circle cx="50" cy="78" r="6" fill="none" stroke="${stroke}" stroke-width="1.2"/>
        <line x1="50" y1="25" x2="50" y2="15" stroke="${stroke}" stroke-width="1.2"/>
        <circle cx="50" cy="13" r="3" fill="none" stroke="${stroke}" stroke-width="1"/>
        <path d="M35,70 Q35,80 25,85" fill="none" stroke="${stroke}" stroke-width="0.8" opacity="0.5"/>
        <path d="M65,70 Q65,80 75,85" fill="none" stroke="${stroke}" stroke-width="0.8" opacity="0.5"/>
      </svg>`,
      snow: `<svg viewBox="0 0 130 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="60" width="110" height="3" fill="${stroke}" opacity="0.2" rx="1"/>
        ${Array.from({length: 25}, (_, i) => {
          const x = 10 + Math.random() * 110;
          const y = 10 + Math.random() * 50;
          const r = 1 + Math.random() * 2;
          return `<circle cx="${x}" cy="${y}" r="${r}" fill="${stroke}" opacity="${0.2 + Math.random() * 0.5}"/>`;
        }).join('')}
      </svg>`,
      heart: `<svg viewBox="0 0 95 120" xmlns="http://www.w3.org/2000/svg">
        <path d="M47.5,35 C47.5,25 35,15 25,25 C15,35 15,50 47.5,80 C80,50 80,35 70,25 C60,15 47.5,25 47.5,35Z" fill="none" stroke="#e74c3c" stroke-width="1.5"/>
        <path d="M47.5,45 C47.5,40 42,35 37,40 C32,45 32,50 47.5,65 C63,50 63,45 58,40 C53,35 47.5,40 47.5,45Z" fill="#e74c3c" opacity="0.15"/>
      </svg>`,
      letter: `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="25" width="90" height="55" fill="none" stroke="${stroke}" stroke-width="1.2" rx="2"/>
        <polyline points="15,25 60,58 105,25" fill="none" stroke="${stroke}" stroke-width="1.2"/>
        <line x1="15" y1="80" x2="40" y2="58" stroke="${stroke}" stroke-width="0.6" opacity="0.4"/>
        <line x1="105" y1="80" x2="80" y2="58" stroke="${stroke}" stroke-width="0.6" opacity="0.4"/>
      </svg>`,
      moon: `<svg viewBox="0 0 100 130" xmlns="http://www.w3.org/2000/svg">
        <path d="M60,30 A25,25 0 1,0 60,80 A18,18 0 1,1 60,30" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        ${Array.from({length: 12}, (_, i) => {
          const x = 15 + Math.random() * 70;
          const y = 15 + Math.random() * 100;
          return `<circle cx="${x}" cy="${y}" r="${0.5 + Math.random()}" fill="${stroke}" opacity="${0.3 + Math.random() * 0.5}"/>`;
        }).join('')}
      </svg>`,
      ribbon: `<svg viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,20 Q30,40 50,55 Q70,40 50,20" fill="none" stroke="#c0392b" stroke-width="1.5"/>
        <path d="M50,55 Q35,70 25,90" fill="none" stroke="#c0392b" stroke-width="1.5"/>
        <path d="M50,55 Q65,70 75,90" fill="none" stroke="#c0392b" stroke-width="1.5"/>
        <path d="M50,55 L50,95" fill="none" stroke="#c0392b" stroke-width="1"/>
      </svg>`,
      mistletoe: `<svg viewBox="0 0 110 120" xmlns="http://www.w3.org/2000/svg">
        <line x1="55" y1="10" x2="55" y2="50" stroke="#5d7a3a" stroke-width="1.5"/>
        <ellipse cx="40" cy="40" rx="15" ry="22" fill="none" stroke="#5d7a3a" stroke-width="1" transform="rotate(-10,40,40)"/>
        <ellipse cx="70" cy="40" rx="15" ry="22" fill="none" stroke="#5d7a3a" stroke-width="1" transform="rotate(10,70,40)"/>
        <ellipse cx="55" cy="50" rx="15" ry="25" fill="none" stroke="#5d7a3a" stroke-width="1"/>
        <circle cx="55" cy="80" r="3" fill="#fff"/>
        <circle cx="50" cy="76" r="2.5" fill="#fff"/>
        <circle cx="60" cy="77" r="2.5" fill="#fff"/>
      </svg>`,
      cookie: `<svg viewBox="0 0 105 105" xmlns="http://www.w3.org/2000/svg">
        <circle cx="52" cy="52" r="35" fill="none" stroke="#d4a050" stroke-width="2"/>
        <circle cx="42" cy="40" r="4" fill="#5d3a1a" opacity="0.7"/>
        <circle cx="60" cy="45" r="3.5" fill="#5d3a1a" opacity="0.7"/>
        <circle cx="48" cy="60" r="4" fill="#5d3a1a" opacity="0.7"/>
        <circle cx="65" cy="62" r="3" fill="#5d3a1a" opacity="0.7"/>
        <circle cx="38" cy="55" r="2.5" fill="#5d3a1a" opacity="0.5"/>
      </svg>`,
    };

    return arts[type] || arts.tree;
  }

  function isColorDark(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
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
      const maxH = vh * (isMobile ? 0.6 : 0.75);
      const maxW = vw * (isMobile ? 0.88 : 0.6);
      const aspect = card.w / card.h;
      let tw, th;
      if (card.h > card.w) {
        th = Math.min(maxH, card.h * 1.8);
        tw = th * aspect;
        if (tw > maxW) { tw = maxW; th = tw / aspect; }
      } else {
        tw = Math.min(maxW, card.w * 1.8);
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
      const cardStartY = isMobile ? 90 : 60;
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
      const cardStartY = isMobile ? 90 : 60;

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

  // ===== 초기화 =====
  async function init() {
    await Promise.all(postcards.map(loadMediaSize));

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
