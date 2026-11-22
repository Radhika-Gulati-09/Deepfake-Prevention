/**
 * Veil — Main Application Controller
 * 
 * Manages user journey states:
 * - State 1: Upload / Dropzone
 * - State 2: Video Selected & Ready to Configure
 * - State 3: Active Processing with Live Monitor
 * - State 4: Completed with Synchronized Comparison & Download
 * 
 * Handles local in-browser file validation, audio checking, progress tracking,
 * cancellation, accessible announcements, and memory cleanup.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const srAnnouncements = document.getElementById('sr-announcements');
  const compatBanner = document.getElementById('compat-banner');
  const compatTitle = document.getElementById('compat-title');
  const compatMessage = document.getElementById('compat-message');

  // State Containers
  const stateUpload = document.getElementById('state-upload');
  const stateReady = document.getElementById('state-ready');
  const stateProcessing = document.getElementById('state-processing');
  const stateCompleted = document.getElementById('state-completed');

  // State 1 Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnBrowse = document.getElementById('btn-browse');
  const btnGenerateSample = document.getElementById('btn-generate-sample');
  const btnQuickSample = document.getElementById('btn-quick-sample');

  // State 2 Elements
  const infoFilename = document.getElementById('info-filename');
  const infoFilesize = document.getElementById('info-filesize');
  const infoDuration = document.getElementById('info-duration');
  const infoDimensions = document.getElementById('info-dimensions');
  const infoAudio = document.getElementById('info-audio');
  const btnChangeVideo = document.getElementById('btn-change-video');
  const sourceVideoPreview = document.getElementById('source-video-preview');

  // Configuration Inputs
  const presetButtons = document.querySelectorAll('.segment-btn');
  const inputStrength = document.getElementById('input-strength');
  const strengthValDisplay = document.getElementById('strength-val-display');
  const selectPattern = document.getElementById('select-pattern');
  const checkFaceTargeting = document.getElementById('check-face-targeting');
  const checkPreserveSkin = document.getElementById('check-preserve-skin');
  const checkIncludeAudio = document.getElementById('check-include-audio');
  const audioOptionStatus = document.getElementById('audio-option-status');
  const selectResolution = document.getElementById('select-resolution');
  const btnStartProcessing = document.getElementById('btn-start-processing');

  // State 3 Elements
  const processProgressBar = document.getElementById('process-progress-bar');
  const processPercent = document.getElementById('process-percent');
  const processStats = document.getElementById('process-stats');
  const processEta = document.getElementById('process-eta');
  const liveCanvas = document.getElementById('processing-canvas');
  const deltaCanvas = document.getElementById('delta-canvas');
  const btnCancelProcessing = document.getElementById('btn-cancel-processing');

  // State 4 Elements
  const completedStatTime = document.getElementById('completed-stat-time');
  const completedStatSize = document.getElementById('completed-stat-size');
  const completedStatCodec = document.getElementById('completed-stat-codec');
  const btnDownloadVideo = document.getElementById('btn-download-video');
  const downloadFormatText = document.getElementById('download-format-text');
  const btnReprocess = document.getElementById('btn-reprocess');
  const btnResetSession = document.getElementById('btn-reset-session');

  // Reset Dialog
  const dialogReset = document.getElementById('dialog-confirm-reset');
  const btnDialogCancel = document.getElementById('btn-dialog-cancel');
  const btnDialogConfirm = document.getElementById('btn-dialog-confirm');

  // --- Core Services ---
  const processor = new window.VideoProcessor();
  const comparator = new window.VideoComparator();

  // --- Session State Tracking ---
  let currentFile = null;
  let originalVideoUrl = null;
  let protectedVideoBlob = null;
  let protectedVideoUrl = null;
  let processingStartTime = 0;
  let lastAnnouncePercent = 0;

  // --- Accessibility Live Announcer ---
  function announce(message) {
    if (srAnnouncements) {
      srAnnouncements.textContent = message;
    }
  }

  // --- Check Initial Browser Capabilities ---
  function verifyBrowserSupport() {
    const missing = [];
    if (!('MediaRecorder' in window)) missing.push('MediaRecorder API');
    if (!('HTMLCanvasElement' in window)) missing.push('HTML5 Canvas');
    if (!('AudioContext' in window || 'webkitAudioContext' in window)) missing.push('Web Audio API');

    if (missing.length > 0) {
      compatTitle.textContent = 'Limited Browser Video Capabilities Detected';
      compatMessage.textContent = `Your browser lacks full support for: ${missing.join(', ')}. Some processing or audio multiplexing features may be degraded. For best performance, use the latest Chrome, Edge, Firefox, or Safari.`;
      compatBanner.classList.remove('hidden');
    }
  }
  verifyBrowserSupport();

  // --- State Transitions ---
  function showState(state) {
    [stateUpload, stateReady, stateProcessing, stateCompleted].forEach(card => {
      card.classList.add('hidden');
      card.classList.remove('active');
    });

    if (state === 'upload') {
      stateUpload.classList.remove('hidden');
      stateUpload.classList.add('active');
    } else if (state === 'ready') {
      stateReady.classList.remove('hidden');
      stateReady.classList.add('active');
    } else if (state === 'processing') {
      stateProcessing.classList.remove('hidden');
      stateProcessing.classList.add('active');
    } else if (state === 'completed') {
      stateCompleted.classList.remove('hidden');
      stateCompleted.classList.add('active');
    }
  }

  // --- Helpers: Formatting ---
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // --- Video File Loading & Validation ---
  async function handleFileSelected(file) {
    if (!file) return;

    // Validate mime / extension
    const validExtensions = ['.mp4', '.webm', '.mov', '.m4v'];
    const nameLower = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => nameLower.endsWith(ext));
    const isVideoMime = file.type.startsWith('video/') || hasValidExt;

    if (!isVideoMime) {
      alert('Unsupported file format. Please upload an MP4, WebM, or MOV video file.');
      return;
    }

    // Size check
    if (file.size > 200 * 1024 * 1024) {
      const proceed = confirm(`Notice: This video is ${formatBytes(file.size)}. Processing large videos directly in browser memory can exceed browser RAM limits. Would you like to proceed anyway?`);
      if (!proceed) return;
    }

    // Revoke previous URLs
    cleanTemporaryUrls();

    currentFile = file;
    originalVideoUrl = URL.createObjectURL(file);

    // Display metadata
    infoFilename.textContent = file.name;
    infoFilesize.textContent = `Size: ${formatBytes(file.size)}`;
    infoAudio.textContent = 'Audio: Checking...';

    sourceVideoPreview.src = originalVideoUrl;
    sourceVideoPreview.load();

    sourceVideoPreview.onloadedmetadata = async () => {
      const dur = sourceVideoPreview.duration;
      const w = sourceVideoPreview.videoWidth || 640;
      const h = sourceVideoPreview.videoHeight || 360;

      // Adaptively format aspect ratio for portrait or landscape videos
      document.documentElement.style.setProperty('--video-aspect', `${w} / ${h}`);
      if (h > w) {
        document.documentElement.classList.add('is-portrait-video');
      } else {
        document.documentElement.classList.remove('is-portrait-video');
      }

      infoDuration.textContent = `Duration: ${formatTime(dur)}`;
      infoDimensions.textContent = `Resolution: ${w} × ${h} ${h > w ? '(Portrait)' : '(Landscape)'}`;

      if (dur > 90) {
        infoDuration.textContent += ' (Long clip: processing may take time)';
      }

      // Check audio
      const hasAudio = await processor.checkAudioPresence(originalVideoUrl);
      if (hasAudio) {
        infoAudio.textContent = 'Audio: Detected';
        checkIncludeAudio.disabled = false;
        checkIncludeAudio.checked = true;
        audioOptionStatus.textContent = 'Muxes original audio stream into the protected output video.';
      } else {
        infoAudio.textContent = 'Audio: None / Incompatible';
        checkIncludeAudio.disabled = true;
        checkIncludeAudio.checked = false;
        audioOptionStatus.textContent = 'No active audio track found in source file.';
      }

      showState('ready');
      announce(`Video loaded: ${file.name}, duration ${formatTime(dur)}, resolution ${w} by ${h}.`);
    };

    sourceVideoPreview.onerror = () => {
      alert('Unable to decode video. The file may be corrupted or use a codec unsupported by your browser.');
      showState('upload');
    };
  }

  // --- Dropzone & Browse Events ---
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-active');
  });

  ['dragleave', 'dragend'].forEach(type => {
    dropzone.addEventListener(type, () => {
      dropzone.classList.remove('drag-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-active');
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  dropzone.addEventListener('click', (e) => {
    if (e.target !== btnGenerateSample) {
      fileInput.click();
    }
  });

  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  btnChangeVideo.addEventListener('click', () => {
    showState('upload');
  });

  // --- Sample Video Generation ---
  async function triggerSampleGeneration() {
    const originalText = btnGenerateSample.textContent;
    btnGenerateSample.disabled = true;
    btnGenerateSample.textContent = 'Generating 30fps clip...';
    btnQuickSample.disabled = true;
    announce('Generating synthetic face clip in browser memory...');

    try {
      const sampleFile = await window.SampleVideoGenerator.generateSampleFile(3);
      await handleFileSelected(sampleFile);
    } catch (err) {
      alert('Could not generate sample video: ' + err.message);
    } finally {
      btnGenerateSample.disabled = false;
      btnGenerateSample.textContent = originalText;
      btnQuickSample.disabled = false;
    }
  }

  btnGenerateSample.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerSampleGeneration();
  });
  btnQuickSample.addEventListener('click', triggerSampleGeneration);

  // --- Perturbation Parameter Controls ---
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      presetButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');

      const preset = btn.dataset.preset;
      let val = 2.5;
      if (preset === 'pristine') val = 1.5;
      if (preset === 'balanced') val = 2.5;
      if (preset === 'friction') val = 4.5;

      inputStrength.value = val;
      strengthValDisplay.textContent = `${val}% ${val <= 2.5 ? '(High Fidelity)' : '(Prominent)'}`;
    });
  });

  inputStrength.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    strengthValDisplay.textContent = `${val}% ${val <= 2.5 ? '(High Fidelity)' : '(Prominent)'}`;

    // Deselect presets if custom slider value doesn't match
    presetButtons.forEach(btn => {
      const p = btn.dataset.preset;
      const match = (p === 'pristine' && val === 1.5) ||
                    (p === 'balanced' && val === 2.5) ||
                    (p === 'friction' && val === 4.5);
      if (match) {
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
      }
    });
  });

  // --- Processing Trigger ---
  btnStartProcessing.addEventListener('click', async () => {
    if (!originalVideoUrl) return;

    const options = {
      strength: parseFloat(inputStrength.value) || 2.5,
      pattern: selectPattern.value,
      targetFace: checkFaceTargeting.checked,
      preserveSkin: checkPreserveSkin ? checkPreserveSkin.checked : true,
      includeAudio: checkIncludeAudio.checked && !checkIncludeAudio.disabled,
      resolution: selectResolution ? selectResolution.value : 'native'
    };

    showState('processing');
    announce('Processing video with Veil perturbations. Please keep this tab active.');

    // Reset progress UI
    processProgressBar.style.width = '0%';
    processPercent.textContent = '0%';
    processStats.textContent = 'Initializing pipeline...';
    processEta.textContent = 'Estimating remaining time...';
    lastAnnouncePercent = 0;
    processingStartTime = performance.now();

    try {
      const resultBlob = await processor.processVideo({
        videoUrl: originalVideoUrl,
        options: options,
        liveCanvas: liveCanvas,
        deltaCanvas: deltaCanvas,
        onProgress: (p) => {
          processProgressBar.style.width = `${p.percent}%`;
          processProgressBar.setAttribute('aria-valuenow', p.percent);
          processPercent.textContent = `${p.percent}%`;
          processStats.textContent = `Frame ${p.currentFrame} / ~${p.totalFrames} • ${p.fps} fps`;
          processEta.textContent = p.eta > 0 ? `~${p.eta}s remaining` : 'Finalizing encode...';

          // Accessible screen reader announcements every 25%
          if (p.percent >= lastAnnouncePercent + 25) {
            lastAnnouncePercent = Math.floor(p.percent / 25) * 25;
            announce(`Processing: ${p.percent}% complete.`);
          }
        }
      });

      // Handle successful finish
      const totalElapsedSec = ((performance.now() - processingStartTime) / 1000).toFixed(1);
      handleProcessingComplete(resultBlob, totalElapsedSec);

    } catch (err) {
      if (err.message && err.message.includes('cancelled')) {
        announce('Processing was cancelled.');
        showState('ready');
      } else {
        alert('Processing encountered an error: ' + err.message);
        announce('Processing failed: ' + err.message);
        showState('ready');
      }
    }
  });

  btnCancelProcessing.addEventListener('click', () => {
    processor.cancel();
  });

  // --- Processing Completed Handler ---
  function handleProcessingComplete(blob, elapsedSec) {
    protectedVideoBlob = blob;
    if (protectedVideoUrl) {
      URL.revokeObjectURL(protectedVideoUrl);
    }
    protectedVideoUrl = URL.createObjectURL(blob);

    // Update Completed Banner Metrics
    completedStatTime.textContent = `Processed in ${elapsedSec}s`;
    completedStatSize.textContent = `Output Size: ${formatBytes(blob.size)}`;

    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    completedStatCodec.textContent = `Format: ${blob.type.toUpperCase() || 'WEBM'}`;

    // Configure Download Button
    const baseName = currentFile ? currentFile.name.replace(/\.[^/.]+$/, '') : 'video';
    const downloadFilename = `${baseName}_veil_protected.${ext}`;
    btnDownloadVideo.href = protectedVideoUrl;
    btnDownloadVideo.download = downloadFilename;
    downloadFormatText.textContent = `Ready for download: ${downloadFilename} (${formatBytes(blob.size)})`;

    // Load videos into synchronized comparator
    comparator.loadVideos(originalVideoUrl, protectedVideoUrl);

    showState('completed');
    announce(`Perturbation complete in ${elapsedSec} seconds. Synchronized before and after comparison ready.`);
  }

  // --- Session Reset & Cleanup ---
  btnReprocess.addEventListener('click', () => {
    comparator.pause();
    showState('ready');
  });

  btnResetSession.addEventListener('click', () => {
    if (dialogReset) {
      dialogReset.showModal();
    } else {
      resetSession();
    }
  });

  if (btnDialogCancel) {
    btnDialogCancel.addEventListener('click', () => {
      dialogReset.close();
    });
  }

  if (btnDialogConfirm) {
    btnDialogConfirm.addEventListener('click', () => {
      dialogReset.close();
      resetSession();
    });
  }

  function cleanTemporaryUrls() {
    if (originalVideoUrl) {
      URL.revokeObjectURL(originalVideoUrl);
      originalVideoUrl = null;
    }
    if (protectedVideoUrl) {
      URL.revokeObjectURL(protectedVideoUrl);
      protectedVideoUrl = null;
    }
    protectedVideoBlob = null;
  }

  function resetSession() {
    comparator.destroy();
    cleanTemporaryUrls();

    currentFile = null;
    sourceVideoPreview.src = '';
    fileInput.value = '';

    showState('upload');
    announce('Session cleared. All temporary files and memory buffers were released.');
  }

  // Revoke URLs on page unload
  window.addEventListener('beforeunload', () => {
    cleanTemporaryUrls();
  });
});
