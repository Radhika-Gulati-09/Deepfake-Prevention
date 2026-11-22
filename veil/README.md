# Veil (Research Prototype)

> **"Add a layer of friction before your video travels."**  
> *Experiment with subtle, temporally consistent video perturbations designed to interfere with some face-manipulation workflows. Results vary by model, resolution, and platform recompression.*

---

## 1. Executive Summary & Purpose

**Veil** is an open browser-based video defense prototype. It investigates client-side, temporally coherent mathematical perturbations applied to face video frames before sharing.

### Research Honesty & Realistic Expectations
- **Experimental Prototype:** Veil is an exploratory defense prototype. It is **not** a guaranteed defense against deepfakes, diffusion reenactment, or generative AI synthesis.
- **No Universal Immunity:** Defensive video perturbations are an active area of adversarial machine learning research. A perturbation that confuses one feature extractor (e.g. ArcFace or MobileFaceNet) may have negligible effect on another architecture.
- **Platform Recompression Degradation:** Social media platforms (YouTube, Twitter/X, TikTok, Instagram) recompress user videos using aggressive quantization, downscaling, and chroma subsampling. These lossy video codecs act as low-pass filters that can wash out or weaken subtle high-frequency perturbations.
- **No "Green Pixel AI Shield":** We explicitly reject pseudoscientific claims that shifting green pixels defeats AI. True adversarial friction requires multi-scale spatio-temporal phase modulation.
- **Not a Detector:** Veil does not scan or detect whether incoming videos are synthetic; it is purely a prospective defensive transformation tool.

---

## 2. Core Features & User Journey

1. **Zero-Server Client-Side Privacy:**
   - 100% of processing runs locally in browser memory using HTML5 Canvas, Web Audio API, and MediaRecorder.
   - Video bytes and biometrics are never transmitted, stored, or logged on any remote server.
2. **Instant Synthetic Test Clip Generator:**
   - Evaluators don't need to hunt for an MP4 video. A single click on *"Try Sample Video"* generates a realistic, procedurally animated face portrait (with eye blinks, speech mouth articulation, and head sway) at 30 fps in memory.
3. **High-Fidelity & Pristine Video Quality Preservation:**
   - **Native Resolution Preservation:** Retains 100% of your camera's original resolution (up to Full HD 1080p+ and portrait 1080x1920) without forced downscaling.
   - **Ultra-High Bitrate Encoding:** Encodes at up to 24 Mbps (compared to standard 2-4 Mbps web rates), completely eliminating compression artifacts, blur, and macroblocking.
   - **Luminance-Neutral Modulation (ΔY ≈ 0):** Balances channel perturbations ($0.299 \Delta R + 0.587 \Delta G + 0.114 \Delta B = 0$) so human eyes perceive zero brightness distortion or flicker while disrupting convolutional feature tensors.
   - **Perceptual Skin Preservation:** Automatically attenuates noise across flat, smooth skin areas (cheeks/forehead) to eliminate graininess, focusing defensive phase friction on facial contours, eyes, nose, and lips.
4. **Temporally Coherent Mathematical Perturbations:**
   - Eliminates frame-to-frame strobe and flicker by anchoring spatial phase patterns to a continuous temporal carrier wave.
   - Supports 3 perturbation profiles:
     - **Spatio-Temporal Coherent Wave (Recommended):** Dual orthogonal harmonics targeting feature extractor latent maps.
     - **Chromatic Lattice Phase-Shift:** Quadrature chrominance displacement with luminance balance.
     - **Multi-Scale Adversarial Texture:** Multi-octave sinusoidal harmonics targeting convolutional receptive fields.
5. **Adaptive Facial Saliency Blending:**
   - Employs browser `FaceDetector` (with automatic fallback to skin-chrominance YCbCr and facial gradient tracking).
   - Features an Exponential Moving Average (EMA) filter ($\alpha = 0.22$) to prevent bounding box jitter.
   - Applies smooth Raised-Cosine/Gaussian radial feathering to avoid rectangular seams.
5. **Audio Preservation:**
   - Synchronously extracts and multiplexes the source audio track through Web Audio API into the recorded canvas stream.
6. **Synchronized Before / After Comparator:**
   - Draggable split-view curtain slider with touch, mouse, and keyboard arrow controls.
   - Side-by-side comparative playback.
   - Live 10× difference map visualizer ($|Protected - Original| \times 10 + 128$) to inspect perturbation amplitude and frequency distribution.
7. **Complete Session Control & Memory Revocation:**
   - Real-time progress bar with frame counter, FPS, and ETA.
   - Instant cancellation support.
   - One-click session cleanup to revoke all `blob:` URLs and garbage-collect video buffers.

---

## 3. Architecture & File Structure

```
veil/
├── index.html              # Semantic, accessible HTML5 layout with ARIA live regions
├── css/
│   └── styles.css          # Deep ink/navy theme, mint accents, responsive layouts
├── js/
│   ├── app.js              # State machine controller, upload UX, memory cleanup
│   ├── processor.js        # Video decoding, Web Audio muxing, MediaRecorder pipeline
│   ├── perturbation-engine.js # Continuous spatio-temporal mathematical algorithms
│   ├── face-detector.js    # Face localization, YCbCr tracker & EMA temporal smoother
│   ├── comparator.js       # Synchronized video playback & interactive split slider
│   └── sample-generator.js # In-browser procedural face video synthesizer
└── README.md               # Architecture documentation & research disclosures
```

---

## 4. How to Run

Because Veil is built on modern web standards (ES6 modules, Canvas, MediaRecorder, Web Audio), you can run it using any standard static file server:

### Option A: Open directly in your browser
Simply open `index.html` in Chrome, Edge, Firefox, or Safari:
```
file:///C:/Users/radhi/.gemini/antigravity/scratch/veil/index.html
```

### Option B: Using Python (if available on system)
```bash
cd C:\Users\radhi\.gemini\antigravity\scratch\veil
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Option C: Using Node / npx (if available on system)
```bash
cd C:\Users\radhi\.gemini\antigravity\scratch\veil
npx serve .
```

### Option D: VS Code Live Server
Right-click `index.html` in VS Code and select **"Open with Live Server"**.

---

## 5. Technical Limitations & Browser Notes

- **Browser Video Codecs:** Encoded output format depends on the browser's MediaRecorder implementation. Modern Chromium/Edge browsers encode to `video/webm;codecs=vp9,opus` or `video/mp4`.
- **Memory Consumption:** Extremely large videos (> 200MB or > 2 minutes) held in uncompressed canvas memory can test browser tab RAM limits. Short portrait clips (5–60 seconds) are optimal.
- **Audio Routing:** In strict browser security environments, videos loaded without appropriate CORS headers or without an active audio track will fall back smoothly to video-only mode with user notification.
