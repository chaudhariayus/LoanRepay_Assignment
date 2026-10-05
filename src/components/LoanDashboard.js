"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { formatDate, formatINR, isPositive } from "@/lib/format";
import PaymentForm from "./PaymentForm";
import PaymentHistory from "./PaymentHistory";
import PositionSummary from "./PositionSummary";
import ScheduleTable from "./ScheduleTable";

function loanLabel(loan) {
  const overdue = isPositive(loan.position.overdue.amount) ? " · OVERDUE" : "";
  return `${formatINR(loan.principal)} · ${loan.annualRatePercent}% · ${loan.tenureMonths} months · from ${formatDate(loan.disbursementDate)}${overdue}`;
}

export default function LoanDashboard({ user, onSignOut }) {
  const [loans, setLoans] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  // Bumped after each payment; both effects below refetch when it changes, so
  // the table, position and picker update in place without a page reload.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let stale = false;
    apiFetch(user, "/api/loans")
      .then((data) => {
        if (stale) return;
        setLoans(data);
        setSelectedId((current) => current ?? data[0]?.id ?? null);
      })
      .catch((err) => !stale && setError(err.message));
    return () => {
      stale = true;
    };
  }, [user, version]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let stale = false; // ignore a slow response for a loan no longer selected
    apiFetch(user, `/api/loans/${selectedId}`)
      .then((data) => !stale && setDetail(data))
      .catch((err) => !stale && setError(err.message));
    return () => {
      stale = true;
    };
  }, [user, selectedId, version]);

  const handlePaid = useCallback(() => setVersion((v) => v + 1), []);

  const current = detail?.loan.id === selectedId ? detail : null;

  return (
    <div className="page">
      <header className="topbar">
        <strong>Vitto Loan Repayment</strong>
        <span className="topbar-user">
          <span className="muted small">{user.email}</span>
          <button className="secondary" onClick={onSignOut}>
            Sign out
          </button>
        </span>
      </header>

      <main className="content">
        {error && <p className="error" role="alert">{error}</p>}

        {loans === null && !error && <p className="muted">Loading loans…</p>}
        {loans?.length === 0 && <p className="muted">No loans yet. Create one with POST /api/loans or run the seed script.</p>}

        {loans?.length > 0 && (
          <label className="picker">
            Loan
            <select value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
              {loans.map((loan) => (
                <option key={loan.id} value={loan.id}>
                  {loanLabel(loan)}
                </option>
              ))}
            </select>
          </label>
        )}

        {selectedId && !current && !error && <p className="muted">Loading loan…</p>}

        {current && (
          <>
            <p className="muted small">
              EMI {formatINR(current.loan.emi)} · Loan ID <code>{current.loan.id}</code>
            </p>
            <PositionSummary loan={current.loan} position={current.position} />
            <PaymentForm
              key={current.loan.id}
              user={user}
              loan={current.loan}
              position={current.position}
              onPaid={handlePaid}
            />
            <ScheduleTable schedule={current.schedule} />
            <PaymentHistory payments={current.payments} />
          </>
        )}
      </main>
    </div>
  );
}
