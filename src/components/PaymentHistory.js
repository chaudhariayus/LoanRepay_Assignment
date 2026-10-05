import { formatDate, formatINR } from "@/lib/format";

export default function PaymentHistory({ payments }) {
  return (
    <section className="card panel history-card">
      <h2>Payments received</h2>
      {payments.length === 0 ? (
        <p className="muted small">No payments yet.</p>
      ) : (
        <ul className="history">
          {[...payments].reverse().map((p) => (
            <li key={p.id}>
              <div className="history-top">
                <strong>{formatINR(p.amount)}</strong>
                <span className="muted small">{formatDate(p.paidOn)}</span>
              </div>
              <ul className="history-split">
                {p.allocations.map((a) => (
                  <li key={a.seq}>
                    #{a.seq} · {formatINR(a.interest)} interest + {formatINR(a.principal)} principal
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
