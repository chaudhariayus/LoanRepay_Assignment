import { formatDate, formatINR } from "@/lib/format";

const STATUS_LABEL = {
  PAID: "Paid",
  PARTIALLY_PAID: "Part paid",
  DUE: "Due",
  OVERDUE: "Overdue",
};

export default function ScheduleTable({ schedule }) {
  return (
    <section>
      <h2>Repayment schedule</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Due date</th>
              <th className="num">Principal</th>
              <th className="num">Interest</th>
              <th className="num">Total due</th>
              <th className="num">Paid</th>
              <th className="num">Remaining</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((row) => (
              <tr key={row.seq} className={`row-${row.status.toLowerCase()}`}>
                <td>{row.seq}</td>
                <td>{formatDate(row.dueDate)}</td>
                <td className="num">{formatINR(row.principalDue)}</td>
                <td className="num">{formatINR(row.interestDue)}</td>
                <td className="num">{formatINR(row.totalDue)}</td>
                <td className="num">{formatINR(row.amountPaid)}</td>
                <td className="num">{formatINR(row.remaining)}</td>
                <td>
                  <span className={`badge badge-${row.status.toLowerCase()}`}>{STATUS_LABEL[row.status]}</span>
                  {row.settledOn && <span className="muted small"> on {formatDate(row.settledOn)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
