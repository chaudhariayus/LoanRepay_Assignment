import { formatDate, formatINR } from "@/lib/format";

export default function PaymentHistory({ payments }) {
  if (!payments.length) return null;

  return (
    <section>
      <h2>Payments received</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Paid on</th>
              <th className="num">Amount</th>
              <th>Allocated to</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatDate(p.paidOn)}</td>
                <td className="num">{formatINR(p.amount)}</td>
                <td className="small">
                  {p.allocations
                    .map((a) => `#${a.seq}: ${formatINR(a.interest)} interest + ${formatINR(a.principal)} principal`)
                    .join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
