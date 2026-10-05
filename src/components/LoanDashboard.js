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
        <div className="topbar-inner">
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
        </div>
      </header>

      <main className="content">
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        {loans === null && !error && <div className="skeleton" aria-label="Loading loans" />}
        {loans?.length === 0 && (
          <div className="card empty">
            <h2>No loans yet</h2>
            <p className="muted">Create one with POST /api/loans or run npm run db:seed.</p>
          </div>
        )}

        {loans?.length > 0 && <LoanPicker loans={loans} selectedId={selectedId} onSelect={setSelectedId} />}

        {selectedId && !current && !error && <div className="skeleton tall" aria-label="Loading loan" />}

        {current && (
          <>
            <LoanOverview loan={current.loan} position={current.position} schedule={current.schedule} />
            <PositionSummary position={current.position} />
            <div className="layout">
              <aside className="side">
                <PaymentForm
                  key={current.loan.id}
                  user={user}
                  loan={current.loan}
                  position={current.position}
                  onPaid={handlePaid}
                />
                <PaymentHistory payments={current.payments} />
              </aside>
              <div className="main-col">
                <ScheduleTable schedule={current.schedule} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
