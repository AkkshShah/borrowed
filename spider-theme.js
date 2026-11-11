/* ==========================================================================
   SPIDER-VERSE THEME CONTROLLER (spider-theme.js)
   Brings full Spider-Man interactive coolness to the Borrowed app:
   - Web Audio synthesizer ("THWIP!", "Tingle", "Zip", "Hit")
   - Real-time web shooting with SVG strands, comic bursts, and web splats
   - Multiverse Suit Vault (Classic, Miles, Gwen, 2099)
   - Ditko Spider-Sense tingling aura and smart item detection
   - Web-Watch HUD Dashboard with Arcade Mini-Games (Glider Buster, Reflex Test)
   - Interactive pullable mascot physics
   ========================================================================== */

(() => {
  'use strict';

  const THEME_ID = 'web-slinger';
  const STORAGE = {
    suit: 'borrowed-spider-suit-v1',
    sound: 'borrowed-spider-sound-v1',
    trophies: 'borrowed-spider-trophies-v1',
    gliderScore: 'borrowed-spider-glider-high-v1',
    reflexBest: 'borrowed-spider-reflex-best-v1'
  };

  // Comic action words for web shots
  const COMIC_WORDS = ['THWIP!', 'FWIP!', 'ZING!', 'THWACK!', 'WOOSH!', 'SNAP!', 'POW!'];

  // Suit definitions with dedicated pixel & vector sprites
  const SUITS = {
    classic: {
      id: 'classic',
      name: 'Classic Spidey',
      tag: 'Peter Parker · Red & Blue',
      primary: '#e52536',
      accent: '#65b9ff',
      icon: '🕷️',
      quote: 'With great power comes great responsibility.'
    },
    miles: {
      id: 'miles',
      name: 'Miles Morales',
      tag: 'Brooklyn · Venom Strike',
      primary: '#ff1844',
      accent: '#ffd000',
      icon: '⚡',
      quote: 'What’s up, Danger?'
    },
    gwen: {
      id: 'gwen',
      name: 'Ghost-Spider',
      tag: 'Gwen Stacy · Earth-65',
      primary: '#ff6fa9',
      accent: '#3cead6',
      icon: '🌸',
      quote: 'I’m free. I can do anything.'
    },
    '2099': {
      id: '2099',
      name: 'Spider-Man 2099',
      tag: 'Miguel O’Hara · Cyber Nueva York',
      primary: '#ff0055',
      accent: '#00e5ff',
      icon: '🤖',
      quote: 'The future of campus resource access is now.'
    }
  };

  // Trophies / Achievements
  const TROPHY_CATALOG = [
    { id: 'first_thwip', name: 'First Thwip', desc: 'Shot your first web on campus', icon: '🕸️' },
    { id: 'spider_sense', name: 'Sixth Sense', desc: 'Activated Spider-Sense mode', icon: '⚡' },
    { id: 'glider_ace', name: 'Drone Hunter', desc: 'Scored 5 hits in Glider Buster', icon: '🎯' },
    { id: 'fast_reflexes', name: 'Lightning Reflex', desc: 'Under 280ms in the Reflex Test', icon: '⚡' },
    { id: 'multiverse', name: 'Multiverse Traveler', desc: 'Tried on all 4 Spider suits', icon: '🌌' },
    { id: 'web_weaver', name: 'Master Web-Weaver', desc: 'Linked campus web anchors', icon: '🌐' }
  ];

  let audioCtx = null;
  let activeSuit = localStorage.getItem(STORAGE.suit) || 'classic';
  let soundEnabled = localStorage.getItem(STORAGE.sound) !== 'off';
  let unlockedTrophies = [];
  try {
    unlockedTrophies = JSON.parse(localStorage.getItem(STORAGE.trophies) || '[]');
  } catch {
    unlockedTrophies = [];
  }

  let gliderGame = { timer: null, score: 0, active: false };
  let reflexGame = { state: 'idle', timeout: null, start: 0 };
  let canvasLayer = null;
  let hudDialog = null;
  let squigglesElem = null;

  /* --------------------------------------------------------------------------
     1. Web Audio Synthesizer (Authentic Comic Sound FX)
     -------------------------------------------------------------------------- */
  function getAudioContext() {
    if (!audioCtx && soundEnabled) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playThwip() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Noise burst for the pressurized web canister hiss
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Filter sweep: starts bright, closes down fast
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.075);
      filter.Q.value = 4;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.08);

      // Add a tiny sine snap pop
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

      oscGain.gain.setValueAtTime(0.08, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  function playTingle() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [1180, 1480, 1820].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.04, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.17);
      });
    } catch {}
  }

  function playHit() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  function playCheer() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(0.06, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.23);
      });
    } catch {}
  }

  /* --------------------------------------------------------------------------
     2. Interactive Web-Shooter Mechanics (Anywhere Click & Splat)
     -------------------------------------------------------------------------- */
  function shootWeb(x, y, customWord) {
    if (document.body.dataset.theme !== THEME_ID) return;
    playThwip();
    unlockTrophy('first_thwip');

    // Origin: bottom right web-shooter
    const originX = window.innerWidth > 600 ? window.innerWidth - 60 : window.innerWidth / 2;
    const originY = window.innerHeight - 20;

    // Draw SVG web strand
    if (canvasLayer) {
      const svg = canvasLayer.querySelector('svg');
      if (svg) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const ctrlX = (originX + x) / 2 + (Math.random() * 80 - 40);
        const ctrlY = (originY + y) / 2 - 40;
        path.setAttribute('d', `M ${originX} ${originY} Q ${ctrlX} ${ctrlY} ${x} ${y}`);
        path.setAttribute('class', 'spider-web-strand');
        svg.appendChild(path);
        setTimeout(() => path.remove(), 400);
      }
    }

    // Spawn comic burst label
    const burst = document.createElement('div');
    burst.className = 'spider-comic-burst';
    burst.style.left = `${x}px`;
    burst.style.top = `${y}px`;
    const word = customWord || COMIC_WORDS[Math.floor(Math.random() * COMIC_WORDS.length)];
    burst.style.setProperty('--burst-rot', `${(Math.random() * 24 - 12)}deg`);
    burst.innerHTML = `<span class="spider-burst-label">${word}</span>`;
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 700);

    // Spawn web splat net
    const splat = document.createElement('div');
    splat.className = 'spider-web-splat';
    splat.style.left = `${x}px`;
    splat.style.top = `${y}px`;
    splat.innerHTML = `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="50" cy="50" r="14" stroke-dasharray="3 3"/>
      <circle cx="50" cy="50" r="28"/>
      <circle cx="50" cy="50" r="42" stroke-dasharray="4 2"/>
      <line x1="50" y1="8" x2="50" y2="92"/>
      <line x1="8" y1="50" x2="92" y2="50"/>
      <line x1="20" y1="20" x2="80" y2="80"/>
      <line x1="20" y1="80" x2="80" y2="20"/>
    </svg>`;
    document.body.appendChild(splat);
    setTimeout(() => splat.remove(), 800);
  }

  function handlePointerDown(e) {
    if (document.body.dataset.theme !== THEME_ID) return;
    // Don't intercept typing in inputs or textareas
    if (e.target.closest('input, textarea, select, dialog:not(#spider-watch-dialog)')) return;

    // Check if clicked inside HUD window or controls
    if (e.target.closest('.spider-watch-window, .spider-hud-btn, .nav-item, .topbar button')) return;

    // If clicked on an item card, give it an elastic web-zip reaction
    const card = e.target.closest('.item-card');
    if (card) {
      shootWeb(e.clientX, e.clientY, 'ZIP!');
      card.style.transform = 'scale(0.96) translateY(-4px)';
      setTimeout(() => {
        card.style.transform = '';
      }, 220);
      return;
    }

    // Generic screen click: shoot web
    shootWeb(e.clientX, e.clientY);
  }

  /* --------------------------------------------------------------------------
     3. Multiverse Suit Vault & Graphics
     -------------------------------------------------------------------------- */
  function getSuitSvg(suitId) {
    // Crisp pixel/vector sprites tailored for each suit
    if (suitId === 'miles') {
      return `<svg class="spider-chibi-art" viewBox="0 0 32 52" shape-rendering="crispEdges">
        <path d="M16 0v11" stroke="#ffd000" stroke-width="1.5"/>
        <path d="M13 8h6v2h-6zM12 10h8v2h-8z" fill="#ff1744"/>
        <path d="M10 13h12v2h-12zM9 15h14v5h-14zM11 20h10v2h-10z" fill="#0d1117"/>
        <path d="M11 15h4v2h-4zM17 15h4v2h-4z" fill="#ffd000"/>
        <path d="M12 17h3v1h-3zM17 17h3v1h-3z" fill="#0d1117"/>
        <path d="M11 22h10v2h-10zM9 24h14v7h-14zM11 31h10v2h-10z" fill="#0d1117"/>
        <path d="M14 25h4v4h-4z" fill="#ff1744"/>
        <path d="M8 23H6v2H4v3h2v-2h3zM23 23h2v2h2v3h-2v-2h-3z" fill="#ff1744"/>
        <path d="M11 32h4v5h-2v4h-3v-2h1zM17 32h4v4h2v4h-3v-3h-3z" fill="#0d1117"/>
        <path d="M10 40h4v2h-5v-1zM20 40h3v2h-5v-1z" fill="#ff1744"/>
      </svg>`;
    }
    if (suitId === 'gwen') {
      return `<svg class="spider-chibi-art" viewBox="0 0 32 52" shape-rendering="crispEdges">
        <path d="M16 0v11" stroke="#3cead6" stroke-width="1.5"/>
        <path d="M13 8h6v2h-6zM12 10h8v2h-8z" fill="#ffffff"/>
        <path d="M10 13h12v2h-12zM9 15h14v5h-14zM11 20h10v2h-10z" fill="#ff6fa9"/>
        <path d="M11 15h4v2h-4zM17 15h4v2h-4z" fill="#3cead6"/>
        <path d="M12 17h3v1h-3zM17 17h3v1h-3z" fill="#0d1117"/>
        <path d="M11 22h10v2h-10zM9 24h14v7h-14zM11 31h10v2h-10z" fill="#0d1117"/>
        <path d="M11 24h10v6h-10z" fill="#ffffff"/>
        <path d="M8 23H6v2H4v3h2v-2h3zM23 23h2v2h2v3h-2v-2h-3z" fill="#ff6fa9"/>
        <path d="M11 32h4v5h-2v4h-3v-2h1zM17 32h4v4h2v4h-3v-3h-3z" fill="#0d1117"/>
        <path d="M10 40h4v2h-5v-1zM20 40h3v2h-5v-1z" fill="#3cead6"/>
      </svg>`;
    }
    if (suitId === '2099') {
      return `<svg class="spider-chibi-art" viewBox="0 0 32 52" shape-rendering="crispEdges">
        <path d="M16 0v11" stroke="#00e5ff" stroke-width="1.5"/>
        <path d="M13 8h6v2h-6zM12 10h8v2h-8z" fill="#ff0055"/>
        <path d="M10 13h12v2h-12zM9 15h14v5h-14zM11 20h10v2h-10z" fill="#071126"/>
        <path d="M11 15h4v2h-4zM17 15h4v2h-4z" fill="#00e5ff"/>
        <path d="M12 17h3v1h-3zM17 17h3v1h-3z" fill="#ff0055"/>
        <path d="M11 22h10v2h-10zM9 24h14v7h-14zM11 31h10v2h-10z" fill="#071126"/>
        <path d="M13 25h6v4h-6z" fill="#ff0055"/>
        <path d="M8 23H6v2H4v3h2v-2h3zM23 23h2v2h2v3h-2v-2h-3z" fill="#ff0055"/>
        <path d="M11 32h4v5h-2v4h-3v-2h1zM17 32h4v4h2v4h-3v-3h-3z" fill="#071126"/>
        <path d="M10 40h4v2h-5v-1zM20 40h3v2h-5v-1z" fill="#ff0055"/>
      </svg>`;
    }
    // Classic Peter Parker Red & Blue
    return `<svg class="spider-chibi-art" viewBox="0 0 32 52" shape-rendering="crispEdges">
      <path d="M16 0v11" stroke="#d8eaff" stroke-width="1.5"/>
      <path d="M13 8h6v2h-6zM12 10h8v2h-8z" fill="#d52b42"/>
      <path d="M10 13h12v2h-12zM9 15h14v5h-14zM11 20h10v2h-10z" fill="#111827"/>
      <path d="M11 15h4v2h-4zM17 15h4v2h-4z" fill="#f7fbff"/>
      <path d="M12 17h3v1h-3zM17 17h3v1h-3z" fill="#111a2b"/>
      <path d="M11 22h10v2h-10zM9 24h14v7h-14zM11 31h10v2h-10z" fill="#111827"/>
      <path d="M11 24h10v6h-10z" fill="#d52b42"/>
      <path d="M15 24h3v2h-3zM14 26h3v2h-3zM13 28h3v2h-3z" fill="#f7fbff"/>
      <path d="M8 23H6v2H4v3h2v-2h3zM23 23h2v2h2v3h-2v-2h-3z" fill="#111827"/>
      <path d="M7 24H5v3h2v-2h2v-1zM25 24h2v3h-2v-2h-2v-1z" fill="#d52b42"/>
      <path d="M11 32h4v5h-2v4h-3v-2h1zM17 32h4v4h2v4h-3v-3h-3z" fill="#111827"/>
      <path d="M12 33h2v5h-2v3h-2v-2h1zM18 33h2v4h2v3h-2v-2h-2z" fill="#111827"/>
      <path d="M10 40h4v2h-5v-1zM20 40h3v2h-5v-1z" fill="#d52b42"/>
      <path d="M7 42h7v2H7zM18 42h6v2h-6z" fill="#111827"/>
      <path d="M8 42h5v1H8zM19 42h4v1h-4z" fill="#d52b42"/>
    </svg>`;
  }

  function applySuit(suitId) {
    if (!SUITS[suitId]) suitId = 'classic';
    activeSuit = suitId;
    document.body.dataset.spiderSuit = suitId;
    localStorage.setItem(STORAGE.suit, suitId);

    // Update hanging mascot sprite
    const mascot = document.querySelector('.spider-mascot');
    if (mascot) {
      mascot.innerHTML = `<span class="spider-mascot-thread" aria-hidden="true"></span>${getSuitSvg(suitId)}`;
    }

    // Refresh suit cards in HUD
    document.querySelectorAll('.spider-suit-card').forEach(card => {
      card.classList.toggle('is-selected', card.dataset.suit === suitId);
    });

    // Check if tried all 4 suits for trophy
    let tried = [];
    try {
      tried = JSON.parse(localStorage.getItem('borrowed-spider-tried-suits') || '[]');
    } catch {}
    if (!tried.includes(suitId)) {
      tried.push(suitId);
      localStorage.setItem('borrowed-spider-tried-suits', JSON.stringify(tried));
    }
    if (tried.length >= 4) {
      unlockTrophy('multiverse');
    }
  }

  /* --------------------------------------------------------------------------
     4. Spider-Sense Tingle Mode
     -------------------------------------------------------------------------- */
  function toggleSpiderSense() {
    const isNowActive = !document.body.classList.contains('spider-sense-active');
    document.body.classList.toggle('spider-sense-active', isNowActive);

    const senseBtn = document.querySelector('#spider-hud-sense');
    if (senseBtn) {
      senseBtn.classList.toggle('is-active', isNowActive);
      senseBtn.querySelector('span').textContent = isNowActive ? 'ON' : 'OFF';
    }

    if (isNowActive) {
      playTingle();
      unlockTrophy('spider_sense');
      showSenseBadges();
      if (typeof window.showToast === 'function') {
        window.showToast('⚡ Spider-Sense is tingling! Campus resources highlighted.');
      }
    } else {
      document.querySelectorAll('.spider-sense-badge').forEach(b => b.remove());
    }
  }

  function showSenseBadges() {
    if (!document.body.classList.contains('spider-sense-active')) return;
    document.querySelectorAll('.spider-sense-badge').forEach(b => b.remove());

    // Highlight top-rated items on Explore
    const cards = document.querySelectorAll('.item-card');
    cards.forEach((card, idx) => {
      if (idx % 2 === 0) {
        const badge = document.createElement('span');
        badge.className = 'spider-sense-badge';
        badge.innerHTML = '⚡ SPIDER-SENSE PICK';
        card.prepend(badge);
      }
    });
  }

  /* --------------------------------------------------------------------------
     5. Trophies & Achievements
     -------------------------------------------------------------------------- */
  function unlockTrophy(trophyId) {
    if (unlockedTrophies.includes(trophyId)) return;
    unlockedTrophies.push(trophyId);
    localStorage.setItem(STORAGE.trophies, JSON.stringify(unlockedTrophies));

    playCheer();
    const trophy = TROPHY_CATALOG.find(t => t.id === trophyId);
    if (trophy && typeof window.showToast === 'function') {
      window.showToast(`🏆 SPIDER-TROPHY: ${trophy.name}! ${trophy.desc}`);
    }

    // Refresh UI badges in HUD
    document.querySelectorAll(`[data-trophy="${trophyId}"]`).forEach(el => {
      el.classList.add('is-unlocked');
    });
  }

  /* --------------------------------------------------------------------------
     6. Arcade Mini-Games (Glider Buster & Reflex Test)
     -------------------------------------------------------------------------- */
  function startGliderGame(arena) {
    if (gliderGame.active) return;
    gliderGame.active = true;
    gliderGame.score = 0;
    const scoreDisplay = arena.parentElement.querySelector('.spider-game-score');
    if (scoreDisplay) scoreDisplay.textContent = 'Score: 0';

    arena.innerHTML = '';
    const spawnTarget = () => {
      if (!gliderGame.active || !arena.isConnected) return;
      arena.innerHTML = '';

      const target = document.createElement('div');
      target.className = 'spider-glider-target';
      target.innerHTML = '🛸';
      target.setAttribute('title', 'Tap to Thwip!');

      const maxX = arena.clientWidth - 50;
      const maxY = arena.clientHeight - 50;
      target.style.left = `${Math.max(10, Math.floor(Math.random() * maxX))}px`;
      target.style.top = `${Math.max(10, Math.floor(Math.random() * maxY))}px`;

      target.addEventListener('pointerdown', (ev) => {
        ev.stopPropagation();
        gliderGame.score++;
        playHit();
        shootWeb(ev.clientX, ev.clientY, 'GOTCHA!');
        if (scoreDisplay) scoreDisplay.textContent = `Score: ${gliderGame.score}`;
        target.remove();

        if (gliderGame.score >= 5) {
          unlockTrophy('glider_ace');
        }

        clearTimeout(gliderGame.timer);
        gliderGame.timer = setTimeout(spawnTarget, 280);
      });

      arena.appendChild(target);
      clearTimeout(gliderGame.timer);
      gliderGame.timer = setTimeout(spawnTarget, 1400); // Drone escapes after 1.4s
    };

    spawnTarget();
  }

  function startReflexTest(arena) {
    if (reflexGame.state === 'waiting') return;

    const instruction = arena.querySelector('.spider-reflex-instruction');
    const scoreText = arena.querySelector('.spider-reflex-score');

    if (reflexGame.state === 'ready') {
      // User tapped when ready: record reaction time!
      const elapsed = Date.now() - reflexGame.start;
      reflexGame.state = 'idle';
      arena.classList.remove('is-ready');

      playHit();
      shootWeb(window.innerWidth / 2, window.innerHeight / 2, `${elapsed}ms!`);

      if (elapsed < 280) {
        unlockTrophy('fast_reflexes');
      }

      let rank = 'Spidey Reflexes: ';
      if (elapsed < 210) rank += '⚡ Superhuman Spider-Sense!';
      else if (elapsed < 300) rank += '🔥 Avenger-Level!';
      else rank += '👍 Friendly Neighborhood Guardian!';

      if (instruction) instruction.textContent = rank;
      if (scoreText) scoreText.textContent = `${elapsed} ms (Tap to test again)`;
      return;
    }

    // Start waiting phase
    reflexGame.state = 'waiting';
    arena.classList.add('is-waiting');
    arena.classList.remove('is-ready');
    if (instruction) instruction.textContent = 'Hold on... wait for the red alert...';
    if (scoreText) scoreText.textContent = '--- ms';

    clearTimeout(reflexGame.timeout);
    const delay = 1200 + Math.random() * 2200; // 1.2s - 3.4s random delay

    reflexGame.timeout = setTimeout(() => {
      if (!arena.isConnected) return;
      reflexGame.state = 'ready';
      reflexGame.start = Date.now();
      arena.classList.remove('is-waiting');
      arena.classList.add('is-ready');
      playTingle();
      if (instruction) instruction.textContent = '💥 THWIP NOW! TAP THE BOX!';
    }, delay);
  }

  /* --------------------------------------------------------------------------
     7. Web-Watch HUD Modal & Control Bar
     -------------------------------------------------------------------------- */
  function buildHudDialog() {
    if (document.querySelector('#spider-watch-dialog')) return;

    // Full screen overlay canvas for web strands
    canvasLayer = document.createElement('div');
    canvasLayer.className = 'spider-thwip-canvas';
    canvasLayer.innerHTML = '<svg></svg>';
    document.body.appendChild(canvasLayer);

    // Screen vignette for Spider-Sense
    const vignette = document.createElement('div');
    vignette.className = 'spider-sense-vignette';
    document.body.appendChild(vignette);

    // Floating launcher bar in the bottom right
    const launcher = document.createElement('div');
    launcher.className = 'spider-hud-launcher';
    launcher.innerHTML = `
      <button type="button" class="spider-hud-btn" id="spider-hud-sense" title="Toggle Spider-Sense">
        ⚡ SENSE: <span>OFF</span>
      </button>
      <button type="button" class="spider-hud-btn" id="spider-hud-open" title="Open Spider-Watch HUD">
        🕷️ WEB-WATCH
      </button>
    `;
    document.body.appendChild(launcher);

    launcher.querySelector('#spider-hud-sense').addEventListener('click', toggleSpiderSense);
    launcher.querySelector('#spider-hud-open').addEventListener('click', () => openHud(true));

    // Modal dialog
    hudDialog = document.createElement('div');
    hudDialog.id = 'spider-watch-dialog';
    hudDialog.className = 'spider-watch-dialog';
    hudDialog.setAttribute('role', 'dialog');
    hudDialog.setAttribute('aria-modal', 'true');

    hudDialog.innerHTML = `
      <div class="spider-watch-window">
        <header class="spider-watch-header">
          <div class="spider-watch-title-group">
            <div class="spider-watch-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
            </div>
            <div class="spider-watch-heading">
              <b>WEB-WATCH CONSOLE</b>
              <small>Spider-Verse · Neighborhood HUD</small>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <button type="button" class="spider-sound-toggle" id="spider-sound-toggle" title="Toggle Sound">
              ${soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF'}
            </button>
            <button type="button" class="spider-watch-close" id="spider-watch-close" aria-label="Close HUD">✕</button>
          </div>
        </header>

        <nav class="spider-watch-tabs">
          <button type="button" class="spider-watch-tab is-active" data-tab="arcade">🎯 Arcade</button>
          <button type="button" class="spider-watch-tab" data-tab="suits">🥋 Suits</button>
          <button type="button" class="spider-watch-tab" data-tab="anchors">🌐 Anchors</button>
          <button type="button" class="spider-watch-tab" data-tab="trophies">🏆 Trophies</button>
        </nav>

        <!-- Tab 1: Arcade Mini-Games -->
        <section class="spider-tab-content is-active" id="spider-tab-arcade">
          <div class="spider-game-card">
            <div class="spider-game-header">
              <h3>GLIDER BUSTER · WEB TARGET RANGE</h3>
              <span class="spider-game-score">Score: 0</span>
            </div>
            <div class="spider-glider-arena" id="spider-glider-arena"></div>
            <small style="color:#94a3b8;font-size:10px;">Tap flying targets to trap them with a quick web Thwip!</small>
          </div>

          <div class="spider-game-card">
            <div class="spider-game-header">
              <h3>SPIDER-SENSE REFLEX TEST</h3>
            </div>
            <div class="spider-reflex-arena" id="spider-reflex-arena">
              <span class="spider-reflex-instruction">Tap to start the reflex test</span>
              <span class="spider-reflex-score">--- ms</span>
            </div>
          </div>
        </section>

        <!-- Tab 2: Multiverse Suit Vault -->
        <section class="spider-tab-content" id="spider-tab-suits">
          <p style="font-size:11px;color:#94a3b8;margin:0;">Select a suit to instantly change web colors, character sprite, and theme aura.</p>
          <div class="spider-suit-grid">
            ${Object.values(SUITS).map(suit => `
              <div class="spider-suit-card ${suit.id === activeSuit ? 'is-selected' : ''}" data-suit="${suit.id}">
                <div class="spider-suit-preview">${getSuitSvg(suit.id)}</div>
                <b class="spider-suit-name">${suit.name}</b>
                <small class="spider-suit-tag">${suit.tag}</small>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Tab 3: Campus Web Anchors -->
        <section class="spider-tab-content" id="spider-tab-anchors">
          <div class="spider-game-card">
            <div class="spider-game-header">
              <h3>SRM CAMPUS WEB ANCHORS</h3>
              <span class="spider-game-score" id="spider-anchor-counter">0 / 6 Linked</span>
            </div>
            <p style="font-size:11px;color:#94a3b8;margin:4px 0 10px;">Discover the hidden web nodes on each of the six campus screens:</p>
            <div id="spider-anchor-list" style="display:grid;gap:6px;"></div>
          </div>
        </section>

        <!-- Tab 4: Trophies -->
        <section class="spider-tab-content" id="spider-tab-trophies">
          <div class="spider-trophy-grid">
            ${TROPHY_CATALOG.map(t => `
              <div class="spider-trophy-badge ${unlockedTrophies.includes(t.id) ? 'is-unlocked' : ''}" data-trophy="${t.id}">
                <span class="spider-trophy-icon">${t.icon}</span>
                <div class="spider-trophy-meta">
                  <b>${t.name}</b>
                  <small>${t.desc}</small>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;

    document.body.appendChild(hudDialog);

    // Event listeners for HUD
    hudDialog.querySelector('#spider-watch-close').addEventListener('click', () => openHud(false));
    hudDialog.addEventListener('click', (e) => {
      if (e.target === hudDialog) openHud(false);
    });

    // Sound toggle
    const soundBtn = hudDialog.querySelector('#spider-sound-toggle');
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem(STORAGE.sound, soundEnabled ? 'on' : 'off');
      soundBtn.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      if (soundEnabled) playThwip();
    });

    // Tabs switching
    hudDialog.querySelectorAll('.spider-watch-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        hudDialog.querySelectorAll('.spider-watch-tab').forEach(b => b.classList.remove('is-active'));
        hudDialog.querySelectorAll('.spider-tab-content').forEach(c => c.classList.remove('is-active'));
        tabBtn.classList.add('is-active');
        const target = hudDialog.querySelector(`#spider-tab-${tabBtn.dataset.tab}`);
        if (target) target.classList.add('is-active');

        if (tabBtn.dataset.tab === 'arcade') {
          startGliderGame(hudDialog.querySelector('#spider-glider-arena'));
        }
      });
    });

    // Suit switcher cards
    hudDialog.querySelectorAll('.spider-suit-card').forEach(card => {
      card.addEventListener('click', () => {
        applySuit(card.dataset.suit);
        playThwip();
      });
    });

    // Reflex Test Arena click
    const reflexArena = hudDialog.querySelector('#spider-reflex-arena');
    reflexArena.addEventListener('click', () => startReflexTest(reflexArena));

    // Populate Anchors list
    renderAnchorList();
  }

  function renderAnchorList() {
    const list = document.querySelector('#spider-anchor-list');
    if (!list) return;

    let anchorState = { found: [] };
    try {
      anchorState = JSON.parse(localStorage.getItem('borrowed-spider-anchors-v2') || '{"found":[]}');
    } catch {}

    const counter = document.querySelector('#spider-anchor-counter');
    if (counter) counter.textContent = `${anchorState.found.length} / 6 Linked`;

    const anchors = [
      ['explore', 'Explore Screen', 'Near the hero banner discovery area'],
      ['activity', 'Activity Screen', 'Follow the thread near your activity trail'],
      ['community', 'Campus Board', 'Find the connection on the student board'],
      ['map', 'Campus Map', 'Look for the pin-side web glint'],
      ['profile', 'Profile Card', 'Check the edge of your profile card'],
      ['list', 'List Item Form', 'A small strand waits by the listing modal']
    ];

    list.innerHTML = anchors.map(([id, name, hint]) => {
      const isDone = anchorState.found.includes(id);
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid ${isDone ? '#22c55e' : 'rgba(255,255,255,0.08)'}">
          <div>
            <b style="font-size:11px;color:${isDone ? '#4ade80' : '#ffffff'}">${isDone ? '✓ ' : '○ '}${name}</b>
            <small style="display:block;font-size:9px;color:#94a3b8;">${hint}</small>
          </div>
          <button type="button" class="spider-hud-btn" style="height:26px;font-size:9px;padding:0 8px;" onclick="window.BorrowedSpiderTheme.goToPage('${id}')">
            ${isDone ? 'Visited' : 'Swing ↗'}
          </button>
        </div>
      `;
    }).join('');

    if (anchorState.found.length >= 6) {
      unlockTrophy('web_weaver');
    }
  }

  function openHud(isOpen) {
    if (!hudDialog) buildHudDialog();
    hudDialog.classList.toggle('is-open', isOpen);
    if (isOpen) {
      playThwip();
      renderAnchorList();
      const arena = hudDialog.querySelector('#spider-glider-arena');
      if (arena) startGliderGame(arena);
    } else {
      gliderGame.active = false;
      clearTimeout(gliderGame.timer);
    }
  }

  /* --------------------------------------------------------------------------
     8. Interactive Mascot Physics & Dragging
     -------------------------------------------------------------------------- */
  function setupMascotInteractions() {
    const mascot = document.querySelector('.spider-mascot');
    if (!mascot || mascot.dataset.spiderBound) return;
    mascot.dataset.spiderBound = 'true';

    // Update sprite for current suit
    mascot.innerHTML = `<span class="spider-mascot-thread" aria-hidden="true"></span>${getSuitSvg(activeSuit)}`;

    // Add Ditko squiggles above mascot
    squigglesElem = document.createElement('div');
    squigglesElem.className = 'spider-sense-squiggles';
    squigglesElem.innerHTML = '<span class="spider-squiggle"></span><span class="spider-squiggle"></span><span class="spider-squiggle"></span>';
    mascot.appendChild(squigglesElem);

    // Click: Swing & Thwip!
    mascot.addEventListener('click', (e) => {
      e.stopPropagation();
      playThwip();
      mascot.classList.remove('spider-swing');
      void mascot.offsetWidth;
      mascot.classList.add('spider-swing');
      shootWeb(mascot.getBoundingClientRect().left + 25, mascot.getBoundingClientRect().top + 30, 'THWIP!');
    });

    // Double-click: Spin flip celebration!
    mascot.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      playCheer();
      mascot.classList.remove('spider-celebrate');
      void mascot.offsetWidth;
      mascot.classList.add('spider-celebrate');
      if (typeof window.showToast === 'function') {
        const suit = SUITS[activeSuit] || SUITS.classic;
        window.showToast(`${suit.icon} Spidey: "${suit.quote}"`);
      }
    });
  }

  /* --------------------------------------------------------------------------
     9. Theme Lifecycle & Initializer
     -------------------------------------------------------------------------- */
  function syncTheme() {
    const isActive = document.body.dataset.theme === THEME_ID;

    if (!isActive) {
      // Remove or hide our HUD elements if theme is switched
      if (hudDialog) hudDialog.classList.remove('is-open');
      const launcher = document.querySelector('.spider-hud-launcher');
      if (launcher) launcher.style.display = 'none';
      if (canvasLayer) canvasLayer.style.display = 'none';
      document.body.classList.remove('spider-sense-active');
      return;
    }

    // Active web-slinger theme!
    applySuit(activeSuit);
    buildHudDialog();

    const launcher = document.querySelector('.spider-hud-launcher');
    if (launcher) launcher.style.display = 'flex';
    if (canvasLayer) canvasLayer.style.display = 'block';

    setupMascotInteractions();
    showSenseBadges();
  }

  // Bind global pointer listener for dynamic web shooting
  document.addEventListener('pointerdown', handlePointerDown, { passive: true });

  // Watch dataset.theme changes
  const themeObserver = new MutationObserver(() => syncTheme());
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

  // Initial boot check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncTheme);
  } else {
    syncTheme();
  }

  // Public API
  window.BorrowedSpiderTheme = {
    shootWeb,
    applySuit,
    openHud,
    toggleSpiderSense,
    goToPage: (page) => {
      openHud(false);
      const navBtn = document.querySelector(`.nav-item[data-screen="${page}"]`);
      if (navBtn) navBtn.click();
      else if (page === 'list') {
        document.querySelector('.nav-item[data-screen="list"]')?.click();
      }
    }
  };
})();
