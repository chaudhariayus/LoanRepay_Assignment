export default function Brand({ subtitle = "Loan Repayment" }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        V
      </span>
      <span className="brand-text">
        <span className="brand-name">Vitto</span>
        <span className="brand-sub">{subtitle}</span>
      </span>
    </span>
  );
}
