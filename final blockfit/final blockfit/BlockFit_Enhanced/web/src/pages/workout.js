import { createPoseLandmarker, detectFrame } from '../pose/poseDetector.js';
import { evaluatePoseConfidence, getMovementFeedback } from '../pose/movementAnalysis.js';
import { drawSkeleton, clearCanvas } from '../ui/overlay.js';
import { SquatAnalyzer } from '../exercises/squat.js';
import { PushUpAnalyzer } from '../exercises/pushup.js';
import { BicepCurlAnalyzer } from '../exercises/bicepCurl.js';
import { PlankAnalyzer } from '../exercises/plank.js';
import { LungeAnalyzer } from '../exercises/lunge.js';
import { api } from '../api.js';
import { getUser } from '../auth.js';
import { track } from '../analytics.js';
import { summarizeExercise } from '../coach.js';
import { V1_EXERCISES } from '../../../shared/exerciseCatalog.mjs';

const ANALYZERS = {
  squat: SquatAnalyzer,
  pushup: PushUpAnalyzer,
  curl: BicepCurlAnalyzer,
  lunge: LungeAnalyzer,
  plank: PlankAnalyzer,
};

function renderExerciseOptions() {
  return V1_EXERCISES.map((exercise) => `
    <option value="${exercise.id}" ${exercise.analysis === 'pending' ? 'disabled' : ''}>
      ${exercise.name}${exercise.analysis === 'pending' ? ' · analysis pending' : ''}
    </option>
  `).join('');
}

export function renderWorkout() {
  return {
    html: `
      <section class="workout-layout">
        <article class="card stage-card">
          <div class="stage-header">
            <div>
              <p class="eyebrow accent">Movement session</p>
              <h2>Train in real time.</h2>
            </div>
          </div>
          <div class="video-wrap">
            <video id="video" playsinline autoplay muted></video>
            <canvas id="overlay"></canvas>
            <div class="hud">
              <div class="hud-stat"><span>Reps</span><strong id="repCount">0</strong></div>
              <div class="hud-stat"><span>Phase</span><strong id="phaseLabel">—</strong></div>
              <div class="hud-stat"><span>Form</span><strong id="formScore">—</strong></div>
            </div>
            <div class="camera-hint" id="cameraHint"></div>
            <div class="feedback-banner" id="feedbackBanner">Choose an exercise and start the camera.</div>
          </div>
          <div class="controls">
            <label class="control">
              <span>Exercise</span>
              <select id="exerciseSelect">
                ${renderExerciseOptions()}
              </select>
            </label>
            <div class="control-buttons">
              <button id="startBtn" class="primary-btn" type="button">Start camera</button>
              <button id="finishBtn" class="ghost-btn" type="button" disabled>Finish set</button>
              <button id="resetBtn" class="ghost-btn" type="button">Reset</button>
            </div>
          </div>
        </article>
        <aside class="card workout-side">
          <div class="panel-header"><div><p class="eyebrow">This set</p><h3 id="sessionStatus">Ready</h3></div></div>
          <div class="mini-stats summary-strip">
            <div><strong id="goodReps">0</strong><span>Valid</span></div>
            <div><strong id="badReps">0</strong><span>Needs work</span></div>
            <div><strong id="avgForm">—</strong><span>Average</span></div>
          </div>
          <section class="coach-summary" aria-live="polite">
            <p class="eyebrow accent">Personal coach</p>
            <h4 id="coachHeadline">Finish a set to get personal feedback.</h4>
            <p class="muted" id="coachAdvice">Your summary will use your form score and the cues observed during this session.</p>
          </section>
          <ul class="rep-log" id="repLog"></ul>
          <p class="muted" id="saveStatus"></p>
        </aside>
      </section>
    `,
    mount(root) {
      return mountWorkout(root);
    },
  };
}

function phaseDisplay(analyzerClass, phase) {
  if (phase === 'TOP') return analyzerClass.topLabel || 'Top';
  if (phase === 'BOTTOM') return analyzerClass.bottomLabel || 'Bottom';
  if (phase === 'DESCENDING') return 'Descending';
  if (phase === 'ASCENDING') return 'Ascending';
  return '—';
}

function mountWorkout(root) {
  const video = root.querySelector('#video');
  const canvas = root.querySelector('#overlay');
  const ctx = canvas.getContext('2d');
  const exerciseSelect = root.querySelector('#exerciseSelect');
  const startBtn = root.querySelector('#startBtn');
  const finishBtn = root.querySelector('#finishBtn');
  const resetBtn = root.querySelector('#resetBtn');
  const feedbackBannerEl = root.querySelector('#feedbackBanner');
  const cameraHintEl = root.querySelector('#cameraHint');
  const sessionStatusEl = root.querySelector('#sessionStatus');
  const saveStatusEl = root.querySelector('#saveStatus');
  const coachHeadlineEl = root.querySelector('#coachHeadline');
  const coachAdviceEl = root.querySelector('#coachAdvice');

  let currentAnalyzerClass = ANALYZERS[exerciseSelect.value];
  let analyzer = new currentAnalyzerClass();
  let landmarker = null;
  let stream = null;
  let rafId = null;
  let isRunning = false;
  let sessionReps = [];
  let goodRepsCount = 0;
  let badRepsCount = 0;
  let startedAt = 0;
  let workoutNonce = null;

  const setFeedback = (message, isWarning) => {
    feedbackBannerEl.textContent = message;
    feedbackBannerEl.classList.toggle('is-warning', !!isWarning);
  };

  const setAnalyzer = (id) => {
    currentAnalyzerClass = ANALYZERS[id];
    analyzer = new currentAnalyzerClass();
    cameraHintEl.textContent = currentAnalyzerClass.cameraHint || 'Stand fully in frame.';
  };

  const resetSession = () => {
    analyzer = new currentAnalyzerClass();
    sessionReps = [];
    goodRepsCount = 0;
    badRepsCount = 0;
    root.querySelector('#repCount').textContent = '0';
    root.querySelector('#phaseLabel').textContent = '—';
    root.querySelector('#formScore').textContent = '—';
    root.querySelector('#goodReps').textContent = '0';
    root.querySelector('#badReps').textContent = '0';
    root.querySelector('#avgForm').textContent = '—';
    root.querySelector('#repLog').innerHTML = '';
    workoutNonce = null;
  };

  const recordRep = (repResult) => {
    sessionReps.push(repResult);
    const isGood = repResult.score >= 80;
    if (isGood) goodRepsCount += 1;
    else badRepsCount += 1;
    root.querySelector('#goodReps').textContent = String(goodRepsCount);
    root.querySelector('#badReps').textContent = String(badRepsCount);
    const avg = Math.round(sessionReps.reduce((sum, r) => sum + r.score, 0) / sessionReps.length);
    root.querySelector('#avgForm').textContent = `${avg}%`;
    root.querySelector('#formScore').textContent = `${avg}%`;
    const li = document.createElement('li');
    li.className = isGood ? '' : 'needs-work';
    li.textContent = `Rep ${sessionReps.length}: ${repResult.issueLabels?.join('; ') || 'Clean rep'} · ${repResult.score}%`;
    root.querySelector('#repLog').prepend(li);
  };

  const stopCamera = () => {
    isRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (canvas.width && canvas.height) clearCanvas(ctx, canvas.width, canvas.height);
    startBtn.textContent = 'Start camera';
    sessionStatusEl.textContent = 'Camera stopped';
  };

  const loop = () => {
    if (!isRunning) return;
    const landmarks = detectFrame(landmarker, video, performance.now());
    if (landmarks) {
      const poseAssessment = evaluatePoseConfidence(landmarks);
      if (poseAssessment.requiresReposition) {
        clearCanvas(ctx, canvas.width, canvas.height);
        setFeedback(getMovementFeedback(poseAssessment), true);
        root.querySelector('#phaseLabel').textContent = '—';
        rafId = requestAnimationFrame(loop);
        return;
      }
      const result = analyzer.update(landmarks);
      const goodForm = result.liveIssues.length === 0;
      drawSkeleton(ctx, landmarks, canvas.width, canvas.height, { goodForm });
      root.querySelector('#repCount').textContent = String(result.reps);
      root.querySelector('#phaseLabel').textContent = phaseDisplay(currentAnalyzerClass, result.phase);
      setFeedback(goodForm ? 'Good form — keep going.' : result.liveIssues[0], !goodForm);
      if (result.repCompleted) {
        for (const repResult of result.repResults || [result.repResult]) {
          if (repResult) recordRep(repResult);
        }
      }
    } else {
      analyzer.onFrameMissing();
      clearCanvas(ctx, canvas.width, canvas.height);
      setFeedback('Unable to reliably detect your movement. Please move farther from the camera.', true);
    }
    rafId = requestAnimationFrame(loop);
  };

  const startCamera = async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Loading AI model…';
    try {
      const noncePayload = await api('/workouts/nonce', { method: 'POST' });
      workoutNonce = noncePayload.nonce;
      track('camera_started', { exercise: exerciseSelect.value });
      if (!landmarker) landmarker = await createPoseLandmarker();
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      await video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      isRunning = true;
      startedAt = Date.now();
      startBtn.textContent = 'Stop camera';
      startBtn.disabled = false;
      finishBtn.disabled = false;
      sessionStatusEl.textContent = 'Camera live';
      setFeedback('Camera live — get into position and start your first rep.', false);
      rafId = requestAnimationFrame(loop);
    } catch (err) {
      stopCamera();
      setFeedback(`Could not start the camera (${err.message}).`, true);
      startBtn.textContent = 'Start camera';
      startBtn.disabled = false;
    }
  };

  const handleFinish = async () => {
    if (sessionReps.length === 0) {
      setFeedback('Complete at least one rep before finishing the set.', true);
      return;
    }
    stopCamera();
    finishBtn.disabled = true;
    const avgFormScore = Math.round(sessionReps.reduce((sum, r) => sum + r.score, 0) / sessionReps.length);
    const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const user = getUser();
    const workoutId = `wk_${Date.now()}`;
    const exerciseId = currentAnalyzerClass.id || exerciseSelect.value;
    const historyPromise = api('/workouts')
      .then(({ workouts = [] }) => workouts
        .filter((item) => item.exercise === exerciseId && item.workoutId !== workoutId)
        .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0] || null)
      .catch(() => null);
    const data = {
      exercise: currentAnalyzerClass.label,
      totalReps: sessionReps.length,
      goodReps: goodRepsCount,
      avgFormScore,
      duration: durationSeconds,
      athlete: user?.name || 'Athlete',
    };
    saveStatusEl.textContent = 'Saving workout…';
    const previousSession = await historyPromise;
    const coachSummary = summarizeExercise({
      exercise: currentAnalyzerClass.label,
      reps: sessionReps,
      previousSession,
    });
    coachHeadlineEl.textContent = coachSummary.headline;
    coachAdviceEl.textContent = coachSummary.advice;
    try {
      await api('/workouts', {
        method: 'POST',
        body: {
          exercise: exerciseId,
          validReps: goodRepsCount,
          invalidReps: badRepsCount,
          formScore: avgFormScore,
          performanceScore: avgFormScore,
          durationSeconds,
          confidence: 0.9,
          workoutId,
          verificationStatus: 'VERIFIED',
        },
        headers: { 'X-Workout-Nonce': workoutNonce },
      });
      saveStatusEl.textContent = 'Workout saved securely.';
      track('workout_session_created', { exercise: exerciseId, validReps: goodRepsCount });
      setFeedback(`Set recorded: ${data.totalReps} reps at ${avgFormScore}%.`, false);
      sessionStatusEl.textContent = 'Saved';
      api('/verification/register', {
        method: 'POST',
        body: {
          exercise: exerciseId,
          validReps: goodRepsCount,
          score: avgFormScore,
          workoutId,
          credentialStatus: 'VERIFIED',
        },
      }).catch(() => track('session_summary_record_failure'));
    } catch (error) {
      track('workout_save_failure', { message: error.message });
      saveStatusEl.textContent = error.message;
      setFeedback('Local set finished, but the server did not save it.', true);
    }
    resetSession();
  };

  startBtn.addEventListener('click', () => {
    if (isRunning) {
      stopCamera();
      finishBtn.disabled = sessionReps.length === 0;
    } else {
      startCamera();
    }
  });
  finishBtn.addEventListener('click', handleFinish);
  resetBtn.addEventListener('click', () => {
    stopCamera();
    resetSession();
    finishBtn.disabled = true;
    setFeedback('Choose an exercise and start the camera.', false);
  });
  exerciseSelect.addEventListener('change', () => {
    setAnalyzer(exerciseSelect.value);
    resetSession();
  });

  setAnalyzer(exerciseSelect.value);
  resetSession();

  return () => stopCamera();
}
