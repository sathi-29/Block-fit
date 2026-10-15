export function renderLanding() {
  return `
    <section class="hero" id="overview">
      <div class="hero-copy">
        <p class="eyebrow accent">AI-powered movement & rehab</p>
        <h2>Move better. Train with intention.</h2>
        <p class="lead">
          BlockFit is a movement companion for people building strength, improving consistency, and following rehab routines with clearer feedback.
        </p>
        <div class="hero-strap">
          <span>For everyday fitness and rehabilitation users</span>
          <span>Built for clearer reps, smoother form, and honest progress</span>
        </div>
        <div class="cta-row">
          <a class="primary-btn large" href="#/register">Create account</a>
          <a class="ghost-btn large" href="#/login">Log in</a>
        </div>
        <div class="mini-stats" aria-label="Key product stats">
          <div><strong>What</strong><span>AI movement coaching</span></div>
          <div><strong>Who</strong><span>Fitness + rehab users</span></div>
          <div><strong>Why</strong><span>Better form and consistency</span></div>
        </div>
      </div>
      <div class="hero-panel">
        <div class="studio-panel" aria-label="Movement overview panel">
          <div class="studio-label-row">
            <span class="status-dot"></span>
            <span>Live form capture</span>
          </div>
          <div class="studio-figure">
            <div class="figure-silhouette"></div>
          </div>
          <div class="studio-metrics">
            <div>
              <span>Movement</span>
              <strong>Squat</strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>High</strong>
            </div>
            <div>
              <span>Mode</span>
              <strong>Fitness + rehab</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="editorial-grid" aria-labelledby="how-it-works">
      <article class="editorial-panel">
        <p class="eyebrow accent">First session</p>
        <h3 id="how-it-works">From movement check to safer training in three steps.</h3>
        <ol class="step-list">
          <li>
            <span>01</span>
            <div>
              <strong>Choose a movement</strong>
              <p>Pick from a focused V1 list built for reliable tracking and clear feedback.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Check visibility</strong>
              <p>Keep your body within frame and let the system measure form in real time.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Review progress</strong>
              <p>Measure form, reps, and consistency over time without overstating clinical claims.</p>
            </div>
          </li>
        </ol>
      </article>

      <aside class="editorial-panel contrast">
        <p class="eyebrow">Why it feels different</p>
        <h3>Less noise. More signal.</h3>
        <ul class="feature-list">
          <li>Calm, intentional product language</li>
          <li>Movement guidance with clear trust boundaries</li>
          <li>Progress data with privacy-first defaults</li>
        </ul>
      </aside>
    </section>

    <section class="stats-grid condensed">
      <article class="metric-card"><p>Mode</p><h3>Fitness + rehab</h3><span class="trend positive">Movement guidance for both</span></article>
      <article class="metric-card"><p>V1 exercises</p><h3>Eight selected</h3><span class="trend positive">Focused and reviewable</span></article>
      <article class="metric-card"><p>Safety</p><h3>Confidence checks</h3><span class="trend positive">Low-confidence tracking is flagged</span></article>
      <article class="metric-card"><p>Privacy</p><h3>On-device analysis</h3><span class="trend positive">Structured summaries only</span></article>
    </section>
  `;
}
