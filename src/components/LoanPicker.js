import { formatDate, formatINR, isPositive } from "@/lib/format";

function loanStatus(loan) {
  if (isPositive(loan.position.overdue.amount)) return { label: "Overdue", tone: "danger" };
  if (!isPositive(loan.position.totalOutstanding)) return { label: "Closed", tone: "neutral" };
  return { label: "On track", tone: "success" };
}

export default function LoanPicker({ loans, selectedId, onSelect }) {
  return (
    <nav className="loan-picker" aria-label="Loans">
      {loans.map((loan) => {
        const status = loanStatus(loan);
        const selected = loan.id === selectedId;
        return (
          <button
            key={loan.id}
            type="button"
            className={`loan-chip ${selected ? "is-selected" : ""}`}
            aria-pressed={selected}
            onClick={() => onSelect(loan.id)}
          >
            <span className="loan-chip-top">
              <span className="loan-chip-amount">{formatINR(loan.principal).replace(/\.00$/, "")}</span>
              <span className={`pill pill-${status.tone}`}>{status.label}</span>
            </span>
            <span className="loan-chip-meta">
              {loan.annualRatePercent.replace(/\.00$/, "")}% · {loan.tenureMonths} months
            </span>
            <span className="loan-chip-meta">from {formatDate(loan.disbursementDate)}</span>
          </button>
        );
      })}
    </nav>
  );
}
