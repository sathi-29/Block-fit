import { DEMO_REHABILITATION_PLAN, V1_EXERCISES } from '../../../shared/exerciseCatalog.mjs';

export function renderRehabilitation() {
  const exerciseNames = new Map(V1_EXERCISES.map((exercise) => [exercise.id, exercise.name]));

  return {
    html: `
      <section class="hero compact">
        <div class="hero-copy">
          <p class="eyebrow accent">PHYSIOTHERAPY / REHABILITATION</p>
          <h2>Move through recovery with clear, measured progress.</h2>
          <p class="lead">
            BlockFit is a movement companion, not a diagnostic tool or a substitute for a physiotherapist's care.
          </p>
          <div class="cta-row">
            <a class="primary-btn large" href="#/workout">Open movement session</a>
            <a class="ghost-btn large" href="#/history">View progress</a>
          </div>
        </div>
      </section>

      <section class="content-grid">
        <article class="card workout-panel">
          <div class="panel-header">
            <div><p class="eyebrow">${DEMO_REHABILITATION_PLAN.label}</p><h3>${DEMO_REHABILITATION_PLAN.name}</h3></div>
          </div>
          <p class="muted">Example schedule only. Follow an exercise plan provided by your physiotherapist. BlockFit does not yet provide validated camera tracking for this rehabilitation program.</p>
          <div class="rehab-plan" role="table" aria-label="Example knee recovery program">
            <div class="rehab-plan-row rehab-plan-head" role="row">
              <span role="columnheader">Exercise</span><span role="columnheader">Sets</span><span role="columnheader">Reps</span>
            </div>
            ${DEMO_REHABILITATION_PLAN.exercises.map(({ exerciseId, sets, repetitions }) => `
              <div class="rehab-plan-row" role="row">
                <span role="cell">${exerciseNames.get(exerciseId) || 'Example movement'}</span><span role="cell">${sets}</span><span role="cell">${repetitions}</span>
              </div>
            `).join('')}
          </div>
        </article>

        <aside class="card feedback-panel">
          <div class="panel-header"><div><p class="eyebrow">MEASUREMENT STATUS</p><h3>What BlockFit tracks</h3></div></div>
          <ul class="rep-log">
            <li>Form scores and completed reps for supported exercises</li>
            <li>Progress comparisons between recorded sessions</li>
            <li>Joint range of motion: not yet measured</li>
            <li>Movement asymmetry: not yet measured</li>
          </ul>
          <p class="muted">Camera analysis runs on your device. BlockFit sends workout summaries, not camera video.</p>
        </aside>
      </section>
    `,
  };
}
