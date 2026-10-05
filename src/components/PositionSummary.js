import { formatDate, formatINR, isPositive } from "@/lib/format";

export default function PositionSummary({ position }) {
  const { overdue, nextDue } = position;
  const hasOverdue = isPositive(overdue.amount);

  return (
    <section className="position" aria-label="Current position">
      <div className="section-head">
        <h2>Current position</h2>
        <span className="muted small">as of {formatDate(position.asOf)} (IST)</span>
      </div>

      <div className="stats">
        <div className={`card stat ${hasOverdue ? "stat-danger" : "stat-success"}`}>
          <span className="stat-label">Overdue</span>
          <span className="stat-value">{formatINR(overdue.amount)}</span>
          <span className="stat-foot">
            {hasOverdue
              ? `${overdue.instalmentCount} instalment${overdue.instalmentCount > 1 ? "s" : ""} · ${overdue.daysPastDue} days past due`
              : "All dues cleared"}
          </span>
        </div>

        <div className="card stat stat-accent">
          <span className="stat-label">Next due</span>
          <span className="stat-value">{nextDue ? formatINR(nextDue.amount) : "—"}</span>
          <span className="stat-foot">
            {nextDue ? `Instalment ${nextDue.seq} · ${formatDate(nextDue.dueDate)}` : "No upcoming instalments"}
          </span>
        </div>

        <div className="card stat">
          <span className="stat-label">Outstanding principal</span>
          <span className="stat-value">{formatINR(position.outstandingPrincipal)}</span>
          <span className="stat-foot">still to be repaid</span>
        </div>

        <div className="card stat">
          <span className="stat-label">Total outstanding</span>
          <span className="stat-value">{formatINR(position.totalOutstanding)}</span>
          <span className="stat-foot">principal + scheduled interest</span>
        </div>
      </div>
    </section>
  );
}
