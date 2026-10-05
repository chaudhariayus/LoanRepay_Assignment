import { formatDate, formatINR, isPositive } from "@/lib/format";

export default function PositionSummary({ loan, position }) {
  const { overdue, nextDue } = position;
  const hasOverdue = isPositive(overdue.amount);

  return (
    <section>
      <p className="muted small">Position as of {formatDate(position.asOf)} (IST)</p>
      <div className="cards">
        <div className="card stat">
          <span className="stat-label">Outstanding principal</span>
          <span className="stat-value">{formatINR(position.outstandingPrincipal)}</span>
          <span className="muted small">of {formatINR(loan.principal)}</span>
        </div>

        <div className="card stat">
          <span className="stat-label">Next due</span>
          {nextDue ? (
            <>
              <span className="stat-value">{formatINR(nextDue.amount)}</span>
              <span className="muted small">
                Instalment {nextDue.seq} on {formatDate(nextDue.dueDate)}
              </span>
            </>
          ) : (
            <span className="stat-value">—</span>
          )}
        </div>

        <div className={`card stat ${hasOverdue ? "stat-overdue" : ""}`}>
          <span className="stat-label">Overdue</span>
          <span className="stat-value">{formatINR(overdue.amount)}</span>
          <span className="small">
            {hasOverdue
              ? `${overdue.instalmentCount} instalment${overdue.instalmentCount > 1 ? "s" : ""} · ${overdue.daysPastDue} days past due`
              : "Nothing overdue"}
          </span>
        </div>

        <div className="card stat">
          <span className="stat-label">Total outstanding</span>
          <span className="stat-value">{formatINR(position.totalOutstanding)}</span>
          <span className="muted small">principal + scheduled interest</span>
        </div>
      </div>
    </section>
  );
}
