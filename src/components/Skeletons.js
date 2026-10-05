// Loading placeholders shaped like the real panels, so the layout does not
// jump when data arrives.

function Bone({ w = "100%", h = 12, r, className = "" }) {
  return <span className={`bone ${className}`} style={{ width: w, height: h, borderRadius: r }} />;
}

export function LoanListSkeleton({ count = 5 }) {
  return (
    <div className="loan-picker" aria-busy="true" aria-label="Loading loans">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="loan-chip sk-chip">
          <span className="loan-chip-top">
            <Bone w="45%" h={16} />
            <Bone w={58} h={18} r={999} />
          </span>
          <Bone w="55%" h={11} />
          <Bone w="65%" h={11} />
        </div>
      ))}
    </div>
  );
}

export function LoanDetailSkeleton() {
  return (
    <>
      <section className="card overview">
        <div className="sk-stack">
          <Bone w={90} h={10} />
          <Bone w={210} h={26} />
          <Bone w={240} h={10} />
        </div>
        <div className="overview-terms">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="sk-stack">
              <Bone w={48} h={10} />
              <Bone w={84} h={16} />
            </div>
          ))}
        </div>
        <div className="progress-row">
          <Bone h={8} r={999} />
          <Bone w={220} h={12} />
        </div>
      </section>

      <section className="position">
        <div className="section-head">
          <Bone w={130} h={16} />
          <Bone w={120} h={12} />
        </div>
        <div className="stats">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card stat">
              <Bone w="45%" h={10} />
              <Bone w="70%" h={22} />
              <Bone w="60%" h={11} />
            </div>
          ))}
        </div>
      </section>

      <section className="card card-flush schedule-card">
        <div className="section-head padded">
          <Bone w={170} h={16} />
          <Bone w={130} h={12} />
        </div>
        <div className="table-wrap">
          <div className="sk-table">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="sk-row">
                <Bone w={18} />
                <Bone w="14%" />
                <Bone w="12%" />
                <Bone w="11%" />
                <Bone w="12%" />
                <Bone w="11%" />
                <Bone w="11%" />
                <Bone w={64} h={18} r={999} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function SidePanelSkeleton() {
  return (
    <>
      <section className="card pay-card" aria-busy="true" aria-label="Loading payment form">
        <Bone w={150} h={16} />
        <Bone w="90%" h={11} />
        <div className="quick-fill">
          <Bone w={150} h={30} r={999} />
        </div>
        <Bone w={60} h={11} />
        <Bone h={42} r={10} />
        <Bone w={60} h={11} />
        <Bone h={42} r={10} />
        <Bone h={44} r={10} />
      </section>
      <section className="card panel history-card" aria-busy="true" aria-label="Loading payments">
        <Bone w={160} h={16} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk-stack sk-history">
            <span className="sk-split">
              <Bone w={90} h={16} />
              <Bone w={80} h={12} />
            </span>
            <Bone w="85%" h={11} />
          </div>
        ))}
      </section>
    </>
  );
}

// Shown while Firebase restores the saved session on first load.
export function AppSplash() {
  return (
    <main className="splash" aria-busy="true" aria-label="Loading">
      <span className="brand-mark splash-mark" aria-hidden="true">
        V
      </span>
      <span className="splash-bar">
        <span />
      </span>
    </main>
  );
}
