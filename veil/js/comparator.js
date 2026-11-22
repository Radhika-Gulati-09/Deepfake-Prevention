/**
 * Veil — Video Comparator & Synchronized Playback Controller
 * 
 * Manages:
 * 1. Synchronized playback across original and protected videos (lockstep scrubbing, play/pause).
 * 2. Draggable split comparison slider with touch, mouse, and keyboard accessibility.
 * 3. Mode switching: Split Slider, Side-by-Side, and Live Difference Map.
 * 4. Real-time 10x difference map rendering during playback.
 */

class VideoComparator {
  constructor() {
    // Mode: 'split' | 'side' | 'delta'
    this.currentMode = 'split';

    // DOM Elements
    this.splitView = document.getElementById('view-split-container');
    this.sideView = document.getElementById('view-side-container');
    this.deltaView = document.getElementById('view-delta-container');

    this.splitHandle = document.getElementById('split-handle');
    this.splitOverlay = document.getElementById('split-overlay-layer');

    // Video references
    this.compVideoOrig = document.getElementById('comp-video-orig');
    this.compVideoProt = document.getElementById('comp-video-prot');
    this.sideVideoOrig = document.getElementById('side-video-orig');
    this.sideVideoProt = document.getElementById('side-video-prot');

    // Delta Canvas
    this.compDeltaCanvas = document.getElementById('comp-delta-canvas');
    this.compDeltaCtx = this.compDeltaCanvas ? this.compDeltaCanvas.getContext('2d') : null;

    // Controls
    this.btnPlay = document.getElementById('btn-sync-play');
    this.iconPlay = document.getElementById('icon-play');
    this.textPlay = document.getElementById('text-play-label');
    this.btnRestart = document.getElementById('btn-sync-restart');
    this.timecodeDisplay = document.getElementById('sync-timecode');
    this.scrubber = document.getElementById('comp-scrubber');

    // Buttons
    this.btnModeSplit = document.getElementById('mode-split');
    this.btnModeSide = document.getElementById('mode-side');
    this.btnModeDelta = document.getElementById('mode-delta');

    // Internal state
    this.splitPercent = 50;
    this.isDragging = false;
    this.isPlaying = false;
    this.deltaAnimId = null;

    // Offscreen comparison canvas for delta calculation
    this.calcCanvasOrig = document.createElement('canvas');
    this.calcCtxOrig = this.calcCanvasOrig.getContext('2d', { willReadFrequently: true });
    this.calcCanvasProt = document.createElement('canvas');
    this.calcCtxProt = this.calcCanvasProt.getContext('2d', { willReadFrequently: true });

    this._initEvents();
  }

  /**
   * Initializes both video sources into the comparator
   */
  loadVideos(originalUrl, protectedUrl) {
    this.compVideoOrig.src = originalUrl;
    this.compVideoProt.src = protectedUrl;
    this.sideVideoOrig.src = originalUrl;
    this.sideVideoProt.src = protectedUrl;

    // Reset playback & split state
    this.setSplitPercent(50);
    this.setMode('split');
    this.pause();

    const onMeta = () => {
      this.updateTimecode();
      if (this.compVideoOrig.videoWidth && this.compVideoOrig.videoHeight) {
        const w = Math.min(640, this.compVideoOrig.videoWidth);
        const h = Math.round((this.compVideoOrig.videoHeight * w) / this.compVideoOrig.videoWidth);
        this.calcCanvasOrig.width = w;
        this.calcCanvasOrig.height = h;
        this.calcCanvasProt.width = w;
        this.calcCanvasProt.height = h;
        if (this.compDeltaCanvas) {
          this.compDeltaCanvas.width = w;
          this.compDeltaCanvas.height = h;
        }
      }
    };

    if (this.compVideoOrig.readyState >= 1) {
      onMeta();
    } else {
      this.compVideoOrig.onloadedmetadata = onMeta;
    }
  }

  /**
   * Sets split divider position (0..100)
   */
  setSplitPercent(percent) {
    this.splitPercent = Math.max(0, Math.min(100, percent));
    if (this.splitOverlay && this.splitHandle) {
      // The right-hand protected video is revealed via clip-path
      this.splitOverlay.style.clipPath = `inset(0 0 0 ${this.splitPercent}%)`;
      this.splitHandle.style.left = `${this.splitPercent}%`;
      this.splitHandle.setAttribute('aria-valuenow', Math.round(this.splitPercent));
    }
  }

  /**
   * Switch between visual comparison modes
   */
  setMode(mode) {
    this.currentMode = mode;

    [this.btnModeSplit, this.btnModeSide, this.btnModeDelta].forEach(btn => {
      if (btn) {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
      }
    });

    this.splitView.classList.add('hidden');
    this.sideView.classList.add('hidden');
    this.deltaView.classList.add('hidden');

    if (mode === 'split') {
      this.splitView.classList.remove('hidden');
      this.btnModeSplit.classList.add('active');
      this.btnModeSplit.setAttribute('aria-checked', 'true');
      this._stopDeltaLoop();
    } else if (mode === 'side') {
      this.sideView.classList.remove('hidden');
      this.btnModeSide.classList.add('active');
      this.btnModeSide.setAttribute('aria-checked', 'true');
      this._stopDeltaLoop();
    } else if (mode === 'delta') {
      this.deltaView.classList.remove('hidden');
      this.btnModeDelta.classList.add('active');
      this.btnModeDelta.setAttribute('aria-checked', 'true');
      this._startDeltaLoop();
    }
  }

  /**
   * Toggle Play / Pause
   */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    const activeOrig = this.currentMode === 'side' ? this.sideVideoOrig : this.compVideoOrig;
    const activeProt = this.currentMode === 'side' ? this.sideVideoProt : this.compVideoProt;

    // Resynchronize timestamps before starting
    activeProt.currentTime = activeOrig.currentTime;

    Promise.all([activeOrig.play(), activeProt.play()]).then(() => {
      this.isPlaying = true;
      this._updatePlayButtonState(true);
    }).catch(err => {
      console.warn('Veil playback notice:', err);
    });
  }

  pause() {
    [this.compVideoOrig, this.compVideoProt, this.sideVideoOrig, this.sideVideoProt].forEach(v => {
      if (v) v.pause();
    });
    this.isPlaying = false;
    this._updatePlayButtonState(false);
  }

  restart() {
    [this.compVideoOrig, this.compVideoProt, this.sideVideoOrig, this.sideVideoProt].forEach(v => {
      if (v) v.currentTime = 0;
    });
    this.scrubber.value = 0;
    this.updateTimecode();
    this.play();
  }

  seekToPercent(percent) {
    const activeOrig = this.compVideoOrig;
    if (activeOrig.duration) {
      const targetTime = (percent / 100) * activeOrig.duration;
      [this.compVideoOrig, this.compVideoProt, this.sideVideoOrig, this.sideVideoProt].forEach(v => {
        if (v) v.currentTime = targetTime;
      });
      this.updateTimecode();
      if (this.currentMode === 'delta') {
        this._renderDeltaFrame();
      }
    }
  }

  updateTimecode() {
    const v = this.compVideoOrig;
    const cur = v.currentTime || 0;
    const dur = v.duration || 0;
    const fmt = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };
    this.timecodeDisplay.textContent = `${fmt(cur)} / ${fmt(dur)}`;

    if (dur > 0 && !this.isDraggingScrubber) {
      this.scrubber.value = (cur / dur) * 100;
    }
  }

  _updatePlayButtonState(playing) {
    if (playing) {
      this.textPlay.textContent = 'Pause';
      this.iconPlay.innerHTML = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>';
    } else {
      this.textPlay.textContent = 'Play';
      this.iconPlay.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>';
    }
  }

  /**
   * Continuous sync watchdog to correct any playback drift (>40ms)
   */
  _syncCheck() {
    const orig = this.currentMode === 'side' ? this.sideVideoOrig : this.compVideoOrig;
    const prot = this.currentMode === 'side' ? this.sideVideoProt : this.compVideoProt;

    if (orig && prot && !orig.paused) {
      const diff = Math.abs(orig.currentTime - prot.currentTime);
      if (diff > 0.04) {
        prot.currentTime = orig.currentTime;
      }
    }
    this.updateTimecode();
  }

  /**
   * Delta map renderer for difference inspection mode
   */
  _startDeltaLoop() {
    this._stopDeltaLoop();
    const render = () => {
      this._renderDeltaFrame();
      this.deltaAnimId = requestAnimationFrame(render);
    };
    this.deltaAnimId = requestAnimationFrame(render);
  }

  _stopDeltaLoop() {
    if (this.deltaAnimId) {
      cancelAnimationFrame(this.deltaAnimId);
      this.deltaAnimId = null;
    }
  }

  _renderDeltaFrame() {
    if (!this.compDeltaCtx) return;

    const w = this.calcCanvasOrig.width || 640;
    const h = this.calcCanvasOrig.height || 360;

    const vOrig = this.compVideoOrig;
    const vProt = this.compVideoProt;

    if (!vOrig.videoWidth || !vProt.videoWidth) return;

    this.calcCtxOrig.drawImage(vOrig, 0, 0, w, h);
    this.calcCtxProt.drawImage(vProt, 0, 0, w, h);

    const origData = this.calcCtxOrig.getImageData(0, 0, w, h);
    const protData = this.calcCtxProt.getImageData(0, 0, w, h);
    const deltaData = this.compDeltaCtx.createImageData(w, h);

    const src = origData.data;
    const prt = protData.data;
    const dst = deltaData.data;
    const len = src.length;

    // Amplified difference centered at 128 neutral gray
    for (let i = 0; i < len; i += 4) {
      dst[i]     = Math.max(0, Math.min(255, 128 + (prt[i] - src[i]) * 10));
      dst[i + 1] = Math.max(0, Math.min(255, 128 + (prt[i + 1] - src[i + 1]) * 10));
      dst[i + 2] = Math.max(0, Math.min(255, 128 + (prt[i + 2] - src[i + 2]) * 10));
      dst[i + 3] = 255;
    }

    this.compDeltaCtx.putImageData(deltaData, 0, 0);
  }

  _initEvents() {
    // Mode Buttons
    this.btnModeSplit.addEventListener('click', () => this.setMode('split'));
    this.btnModeSide.addEventListener('click', () => this.setMode('side'));
    this.btnModeDelta.addEventListener('click', () => this.setMode('delta'));

    // Playback Controls
    this.btnPlay.addEventListener('click', () => this.togglePlay());
    this.btnRestart.addEventListener('click', () => this.restart());

    // Timeupdate sync checks
    this.compVideoOrig.addEventListener('timeupdate', () => this._syncCheck());
    this.sideVideoOrig.addEventListener('timeupdate', () => this._syncCheck());

    // Scrubber
    this.scrubber.addEventListener('input', (e) => {
      this.isDraggingScrubber = true;
      this.seekToPercent(parseFloat(e.target.value));
    });
    this.scrubber.addEventListener('change', () => {
      this.isDraggingScrubber = false;
    });

    // Split Handle Dragging (Mouse & Touch via PointerEvents)
    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const rect = this.splitView.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const pos = ((clientX - rect.left) / rect.width) * 100;
      this.setSplitPercent(pos);
    };

    const onPointerUp = () => {
      this.isDragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    this.splitHandle.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.splitHandle.setPointerCapture(e.pointerId);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      e.preventDefault();
    });

    // Keyboard support on split handle
    this.splitHandle.addEventListener('keydown', (e) => {
      let delta = 0;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        delta = -5;
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        delta = 5;
      } else if (e.key === 'Home') {
        this.setSplitPercent(0);
        e.preventDefault();
        return;
      } else if (e.key === 'End') {
        this.setSplitPercent(100);
        e.preventDefault();
        return;
      }

      if (delta !== 0) {
        this.setSplitPercent(this.splitPercent + delta);
        e.preventDefault();
      }
    });

    // Spacebar shortcut on container for play/pause
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && (e.target === document.body || e.target === this.splitHandle || e.target === this.scrubber)) {
        // Toggle play only if completed state is currently active
        const completedCard = document.getElementById('state-completed');
        if (completedCard && !completedCard.classList.contains('hidden')) {
          e.preventDefault();
          this.togglePlay();
        }
      }
    });
  }

  destroy() {
    this.pause();
    this._stopDeltaLoop();
    [this.compVideoOrig, this.compVideoProt, this.sideVideoOrig, this.sideVideoProt].forEach(v => {
      if (v) {
        v.src = '';
        v.load();
      }
    });
  }
}

window.VideoComparator = VideoComparator;
