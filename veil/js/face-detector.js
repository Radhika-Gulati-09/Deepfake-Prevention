/**
 * Veil — Fast Face Localization & Temporal Smoother
 * 
 * Provides face localization to concentrate perturbations onto facial keypoints.
 * Uses native FaceDetector when supported, and an ultra-fast skin-chrominance
 * (YCbCr) tracker fallback.
 * 
 * OPTIMIZATIONS:
 * 1. Skips detection on intermediate frames (runs every 6 frames) and interpolates.
 * 2. Directly uses pre-extracted frame ImageData to avoid redundant GPU readbacks.
 * 3. Temporal smoothing via Exponential Moving Average (alpha = 0.22) prevents jitter.
 */

class FaceTracker {
  constructor() {
    this.hasNativeDetector = ('FaceDetector' in window);
    this.nativeDetector = null;
    if (this.hasNativeDetector) {
      try {
        this.nativeDetector = new window.FaceDetector({
          maxDetectedFaces: 1,
          fastMode: true
        });
      } catch (e) {
        this.hasNativeDetector = false;
      }
    }

    // Smoothed state (normalized coordinates [0..1])
    this.smoothedFace = {
      cx: 0.5,
      cy: 0.42,
      rx: 0.22,
      ry: 0.28,
      detected: false
    };

    this.alpha = 0.25;
    this.frameCount = 0;
    this.detectInterval = 6; // Detect every 6 frames, interpolate in between
    this.framesSinceDetection = 0;
  }

  /**
   * Detect face in the current frame
   * @param {ImageData|HTMLCanvasElement} source - Pre-extracted ImageData or canvas
   * @param {number} width - Frame width
   * @param {number} height - Frame height
   * @returns {Promise<Object>} Smoothed face bounds { cx, cy, rx, ry, detected, method }
   */
  async detect(source, width, height) {
    this.frameCount++;

    // Only run detection every N frames to save CPU cycles
    const shouldRunDetection = (this.frameCount % this.detectInterval === 1) || !this.smoothedFace.detected;

    if (!shouldRunDetection) {
      return { ...this.smoothedFace };
    }

    let rawFace = null;

    if (this.hasNativeDetector && this.nativeDetector && source instanceof HTMLCanvasElement) {
      try {
        const faces = await this.nativeDetector.detect(source);
        if (faces && faces.length > 0) {
          const b = faces[0].boundingBox;
          rawFace = {
            cx: (b.x + b.width / 2) / width,
            cy: (b.y + b.height / 2) / height,
            rx: (b.width / 2) / width * 1.15,
            ry: (b.height / 2) / height * 1.25,
            method: 'native-face-detector'
          };
        }
      } catch (err) {}
    }

    // Fallback: Ultra-fast chrominance saliency tracker
    if (!rawFace) {
      rawFace = this._detectChrominanceSaliency(source, width, height);
    }

    // Exponential Moving Average filter
    if (rawFace && rawFace.detected) {
      this.framesSinceDetection = 0;
      this.smoothedFace.cx += this.alpha * (rawFace.cx - this.smoothedFace.cx);
      this.smoothedFace.cy += this.alpha * (rawFace.cy - this.smoothedFace.cy);
      this.smoothedFace.rx += this.alpha * (rawFace.rx - this.smoothedFace.rx);
      this.smoothedFace.ry += this.alpha * (rawFace.ry - this.smoothedFace.ry);
      this.smoothedFace.detected = true;
      this.smoothedFace.method = rawFace.method;
    } else {
      this.framesSinceDetection++;
      if (this.framesSinceDetection > 15) {
        // Soft drift toward center
        this.smoothedFace.cx += 0.05 * (0.5 - this.smoothedFace.cx);
        this.smoothedFace.cy += 0.05 * (0.42 - this.smoothedFace.cy);
        this.smoothedFace.rx += 0.05 * (0.25 - this.smoothedFace.rx);
        this.smoothedFace.ry += 0.05 * (0.32 - this.smoothedFace.ry);
        this.smoothedFace.detected = false;
        this.smoothedFace.method = 'spatial-center-fallback';
      }
    }

    return { ...this.smoothedFace };
  }

  /**
   * High-speed skin chrominance centroid localization
   */
  _detectChrominanceSaliency(source, width, height) {
    let imgData;
    if (source instanceof ImageData) {
      imgData = source;
    } else if (source && source.getContext) {
      imgData = source.getContext('2d').getImageData(0, 0, width, height);
    } else {
      return { cx: 0.5, cy: 0.42, rx: 0.25, ry: 0.32, detected: false, method: 'default-heuristic' };
    }

    const data = imgData.data;
    const step = 12; // 12x stride makes this run in under 0.3ms
    let sumX = 0, sumY = 0, count = 0;
    let minX = width, maxX = 0, minY = height, maxY = 0;

    for (let y = 0; y < height; y += step) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x += step) {
        const idx = rowOffset + x * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Kovac / Chai skin chrominance model
        const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b;

        if (cb >= 85 && cb <= 135 && cr >= 135 && cr <= 180) {
          sumX += x;
          sumY += y;
          count++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const minSkinSamples = ((width / step) * (height / step)) * 0.015;
    if (count > minSkinSamples) {
      return {
        cx: (sumX / count) / width,
        cy: (sumY / count) / height,
        rx: Math.max(0.18, Math.min(0.38, ((maxX - minX) / width) * 0.65)),
        ry: Math.max(0.2, Math.min(0.45, ((maxY - minY) / height) * 0.75)),
        detected: true,
        method: 'chrominance-saliency'
      };
    }

    return {
      cx: 0.5,
      cy: 0.42,
      rx: 0.25,
      ry: 0.32,
      detected: false,
      method: 'spatial-center-fallback'
    };
  }

  reset() {
    this.smoothedFace = {
      cx: 0.5,
      cy: 0.42,
      rx: 0.22,
      ry: 0.28,
      detected: false
    };
    this.frameCount = 0;
    this.framesSinceDetection = 0;
  }
}

window.FaceTracker = FaceTracker;
