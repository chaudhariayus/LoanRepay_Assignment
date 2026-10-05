"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import Brand from "./Brand";
import LoanOverview from "./LoanOverview";
import LoanPicker from "./LoanPicker";
import PaymentForm from "./PaymentForm";
import PaymentHistory from "./PaymentHistory";
import PositionSummary from "./PositionSummary";
import ScheduleTable from "./ScheduleTable";
import { LoanDetailSkeleton, LoanListSkeleton, SidePanelSkeleton } from "./Skeletons";

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
  // Skeletons until the selected loan's data is on screen.
  const loadingDetail = !error && !current && (loans === null || Boolean(selectedId));

  // Desktop: a fixed, full-height three-column workspace where only the loan
  // list, the schedule table and the payment history scroll internally.
  // Narrow screens fall back to a normal scrolling page (see globals.css).
  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <div className="topbar-user">
          <span className="avatar" aria-hidden="true">
            {(user.email ?? "?").charAt(0).toUpperCase()}
          </span>
          <span className="topbar-email">{user.email}</span>
          <button className="btn btn-ghost" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="card panel loans-panel" aria-label="Loans">
          <div className="panel-head">
            <h2>Loans</h2>
            {loans && <span className="muted small">{loans.length}</span>}
          </div>
          {loans === null && !error && <LoanListSkeleton />}
          {loans?.length === 0 && (
            <p className="muted small">No loans yet. Create one with POST /api/loans or run npm run db:seed.</p>
          )}
          {loans?.length > 0 && <LoanPicker loans={loans} selectedId={selectedId} onSelect={setSelectedId} />}
        </aside>

        <main className="center-col" aria-busy={loadingDetail}>
          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          {loadingDetail && <LoanDetailSkeleton />}
          {current && (
            <>
              <LoanOverview loan={current.loan} position={current.position} schedule={current.schedule} />
              <PositionSummary position={current.position} />
              <ScheduleTable schedule={current.schedule} />
            </>
          )}
        </main>

        <aside className="side" aria-label="Payments">
          {loadingDetail && <SidePanelSkeleton />}
          {current && (
            <>
              <PaymentForm
                key={current.loan.id}
                user={user}
                loan={current.loan}
                position={current.position}
                onPaid={handlePaid}
              />
              <PaymentHistory payments={current.payments} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
