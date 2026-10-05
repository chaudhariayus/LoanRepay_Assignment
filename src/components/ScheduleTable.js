import { formatDate, formatINR } from "@/lib/format";

const STATUS = {
  PAID: { label: "Paid", tone: "success" },
  PARTIALLY_PAID: { label: "Part paid", tone: "warning" },
  DUE: { label: "Upcoming", tone: "neutral" },
  OVERDUE: { label: "Overdue", tone: "danger" },
};

export default function ScheduleTable({ schedule }) {
  return (
    <section className="card card-flush schedule-card">
      <div className="section-head padded">
        <h2>Repayment schedule</h2>
        <span className="muted small">{schedule.length} monthly instalments</span>
      </div>
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
            {schedule.map((row) => {
              const status = STATUS[row.status];
              return (
                <tr key={row.seq} className={`row-${status.tone}`}>
                  <td className="muted">{row.seq}</td>
                  <td>{formatDate(row.dueDate)}</td>
                  <td className="num">{formatINR(row.principalDue)}</td>
                  <td className="num">{formatINR(row.interestDue)}</td>
                  <td className="num strong">{formatINR(row.totalDue)}</td>
                  <td className="num">{formatINR(row.amountPaid)}</td>
                  <td className="num">{formatINR(row.remaining)}</td>
                  <td>
                    <span className={`pill pill-${status.tone}`}>{status.label}</span>
                    {row.settledOn && <span className="settled">on {formatDate(row.settledOn)}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
