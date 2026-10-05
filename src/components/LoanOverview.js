import { formatDate, formatINR } from "@/lib/format";

// Percentage is for the progress bar only (display), so a float is fine here.
function repaidPercent(loan, position) {
  const principal = Number(loan.principal);
  const outstanding = Number(position.outstandingPrincipal);
  return principal > 0 ? Math.round(((principal - outstanding) / principal) * 100) : 0;
}

export default function LoanOverview({ loan, position, schedule }) {
  const percent = repaidPercent(loan, position);
  const paidCount = schedule.filter((row) => row.status === "PAID").length;

  return (
    <section className="card overview">
      <div className="overview-head">
        <div>
          <p className="eyebrow">Loan amount</p>
          <p className="overview-amount">{formatINR(loan.principal)}</p>
          <p className="muted small mono">ID {loan.id}</p>
        </div>
        <dl className="overview-terms">
          <div>
            <dt>EMI</dt>
            <dd>{formatINR(loan.emi)}</dd>
          </div>
          <div>
            <dt>Interest</dt>
            <dd>{loan.annualRatePercent}% p.a.</dd>
          </div>
          <div>
            <dt>Tenure</dt>
            <dd>{loan.tenureMonths} months</dd>
          </div>
          <div>
            <dt>Disbursed</dt>
            <dd>{formatDate(loan.disbursementDate)}</dd>
          </div>
        </dl>
      </div>

      <div className="progress-row">
        <div className="progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <span className="small">
          <strong>{percent}%</strong> principal repaid · {paidCount} of {schedule.length} instalments paid
        </span>
      </div>
    </section>
  );
}
