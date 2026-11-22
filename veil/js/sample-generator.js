/**
 * Veil — Interactive Synthetic Face Video Generator
 * 
 * Allows researchers and evaluators to test the entire video protection
 * pipeline immediately without needing to supply an external video file.
 * Generates an animated procedural face with natural head sway, eye blinks,
 * and speech dynamics rendered at 30 fps, accompanied by a synchronized audio tone.
 */

class SampleVideoGenerator {
  /**
   * Generates a realistic synthetic face video clip
   * @param {number} durationSeconds - Duration of sample (default 4 seconds)
   * @returns {Promise<File>} A standard File object with video/webm or video/mp4 MIME
   */
  static async generateSampleFile(durationSeconds = 3) {
    const width = 640;
    const height = 360;
    const fps = 30;
    const totalFrames = durationSeconds * fps;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Create an AudioContext tone for sound track
    let audioTrack = null;
    let audioCtx = null;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const dest = audioCtx.createMediaStreamDestination();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // gentle warm tone
        // Subtle ambient modulation
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

        osc.connect(gain);
        gain.connect(dest);
        osc.start();

        const tracks = dest.stream.getAudioTracks();
        if (tracks.length > 0) {
          audioTrack = tracks[0];
        }
      }
    } catch (e) {
      console.warn('Veil: Sample audio generation warning:', e);
    }

    const canvasStream = canvas.captureStream(fps);
    if (audioTrack) {
      canvasStream.addTrack(audioTrack);
    }

    const mimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
      ? 'video/webm;codecs=vp9'
      : (MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4');

    const recorder = new MediaRecorder(canvasStream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const completionPromise = new Promise((resolve) => {
      recorder.onstop = () => {
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close();
        }
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        const file = new File([blob], 'sample_face_portrait.webm', { type: mimeType.split(';')[0] });
        resolve(file);
      };
    });

    recorder.start();

    // Render frames
    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / fps;
      this._drawProceduralFaceFrame(ctx, width, height, t);
      // Wait one frame duration
      await new Promise(r => setTimeout(r, 1000 / fps));
    }

    recorder.stop();
    return await completionPromise;
  }

  /**
   * Draws a procedurally animated portrait head with realistic skin tones,
   * facial features, eye blinks, subtle speech mouth movement, and soft lighting.
   */
  static _drawProceduralFaceFrame(ctx, width, height, t) {
    // 1. Studio background with soft gradient
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.45, 40, width * 0.5, height * 0.5, width * 0.7);
    bgGrad.addColorStop(0, '#1a2238');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Natural head movement (subtle breathing & sway)
    const headSwayX = Math.sin(t * 1.8) * 6;
    const headSwayY = Math.cos(t * 2.2) * 4;
    const headTilt = Math.sin(t * 1.4) * 0.03;

    ctx.save();
    ctx.translate(width * 0.5 + headSwayX, height * 0.48 + headSwayY);
    ctx.rotate(headTilt);

    // 2. Shoulders & Torso
    ctx.fillStyle = '#1c2438';
    ctx.beginPath();
    ctx.ellipse(0, 150, 140, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shirt collar
    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.moveTo(-45, 110);
    ctx.lineTo(0, 145);
    ctx.lineTo(45, 110);
    ctx.lineTo(0, 120);
    ctx.closePath();
    ctx.fill();

    // 3. Neck
    ctx.fillStyle = '#d49b78';
    ctx.beginPath();
    ctx.rect(-34, 40, 68, 80);
    ctx.fill();

    // 4. Head / Face shape
    // Skin gradient
    const skinGrad = ctx.createRadialGradient(15, -20, 20, 0, 0, 110);
    skinGrad.addColorStop(0, '#f2be9b');
    skinGrad.addColorStop(0.7, '#e0a982');
    skinGrad.addColorStop(1, '#c58b64');
    ctx.fillStyle = skinGrad;

    ctx.beginPath();
    // Smooth oval head
    ctx.ellipse(0, -10, 82, 108, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Hair
    ctx.fillStyle = '#221915';
    ctx.beginPath();
    ctx.arc(0, -35, 90, Math.PI * 0.82, Math.PI * 2.18);
    ctx.bezierCurveTo(70, -85, -70, -85, -80, -20);
    ctx.fill();

    // 6. Eyebrows
    ctx.strokeStyle = '#2d221c';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    // Left eyebrow
    ctx.beginPath();
    ctx.moveTo(-52, -32);
    ctx.quadraticCurveTo(-34, -40 + Math.sin(t * 3) * 2, -16, -34);
    ctx.stroke();
    // Right eyebrow
    ctx.beginPath();
    ctx.moveTo(16, -34);
    ctx.quadraticCurveTo(34, -40 + Math.sin(t * 3) * 2, 52, -32);
    ctx.stroke();

    // 7. Eyes & Blink animation
    // Blink every ~2.5 seconds
    const blinkCycle = (t % 2.5);
    const isBlinking = blinkCycle > 2.38;

    const drawEye = (x, y) => {
      ctx.save();
      ctx.translate(x, y);

      if (isBlinking) {
        // Closed eye line
        ctx.strokeStyle = '#3e2d23';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.quadraticCurveTo(0, 3, 14, 0);
        ctx.stroke();
      } else {
        // Eye white
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iris
        ctx.fillStyle = '#2c4a3e'; // hazel/green-grey
        ctx.beginPath();
        ctx.arc(0 + Math.sin(t * 2) * 1.5, 0, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#0a0f0d';
        ctx.beginPath();
        ctx.arc(0 + Math.sin(t * 2) * 1.5, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Glint reflection
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(2, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Upper eyelid contour
        ctx.strokeStyle = '#4a3728';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 8, 0, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      ctx.restore();
    };

    drawEye(-35, -20);
    drawEye(35, -20);

    // 8. Nose
    ctx.strokeStyle = '#b87c56';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(2, 8);
    ctx.quadraticCurveTo(8, 12, 1, 14);
    ctx.lineTo(-6, 14);
    ctx.stroke();

    // 9. Mouth with subtle speech movement
    const speech = Math.sin(t * 6) * 0.5 + 0.5;
    const mouthOpen = 2 + speech * 6;

    // Lips
    ctx.fillStyle = '#ba6658';
    ctx.beginPath();
    ctx.ellipse(0, 44, 22, mouthOpen + 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Oral cavity
    ctx.fillStyle = '#5c1e18';
    ctx.beginPath();
    ctx.ellipse(0, 44, 18, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();

    // Teeth highlight
    if (mouthOpen > 4) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-8, 41, 16, 2.5);
    }

    ctx.restore();

    // 10. Cinematic film grain overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 40; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      ctx.fillRect(rx, ry, 2, 2);
    }
  }
}

window.SampleVideoGenerator = SampleVideoGenerator;
