"use client";

import { useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { formatINR, isPositive, todayISTString } from "@/lib/format";

// Suggest what the borrower most likely owes now: overdue first, else next due.
function suggestedAmount(position) {
  if (isPositive(position.overdue.amount)) return position.overdue.amount;
  return position.nextDue?.amount ?? "";
}

export default function PaymentForm({ user, loan, position, onPaid }) {
  const today = todayISTString();
  const [amount, setAmount] = useState(() => suggestedAmount(position));
  const [paidOn, setPaidOn] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { kind: "success" | "error", message, details }

  // One Idempotency-Key per payment attempt. It is kept if the request fails
  // on the network (so a retry cannot be applied twice) and cleared once the
  // server has answered or the user edits the payment.
  const keyRef = useRef(null);

  function edit(setter) {
    return (event) => {
      keyRef.current = null;
      setter(event.target.value);
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    keyRef.current ??= crypto.randomUUID();
    setSubmitting(true);
    setResult(null);

    try {
      const data = await apiFetch(user, `/api/loans/${loan.id}/payments`, {
        method: "POST",
        headers: { "idempotency-key": keyRef.current },
        body: { amount: amount.trim(), paidOn },
      });
      keyRef.current = null;
      const seqs = data.payment.allocations.map((a) => a.seq).join(", ");
      setResult({
        kind: "success",
        message: data.replayed
          ? "This payment was already recorded, so it was not applied again."
          : `Recorded ${formatINR(data.payment.amount)}, allocated to instalment${data.payment.allocations.length > 1 ? "s" : ""} ${seqs}.`,
      });
      setAmount("");
      onPaid();
    } catch (err) {
      if (err instanceof ApiError) keyRef.current = null;
      setResult({
        kind: "error",
        message: err instanceof ApiError ? err.message : "Network error. Your payment was not confirmed; submit again to retry safely.",
        details: err instanceof ApiError ? err.details : null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const quickFills = [
    isPositive(position.overdue.amount) && { label: "Overdue", amount: position.overdue.amount },
    position.nextDue && { label: `Instalment ${position.nextDue.seq}`, amount: position.nextDue.amount },
  ].filter(Boolean);

  return (
    <section className="card pay-card">
      <h2>Record a payment</h2>
      <p className="muted small">Applied to the oldest unpaid instalment first, interest before principal.</p>

      {quickFills.length > 0 && (
        <div className="quick-fill">
          {quickFills.map((q) => (
            <button
              key={q.label}
              type="button"
              className={`chip ${amount === q.amount ? "is-active" : ""}`}
              onClick={() => {
                keyRef.current = null;
                setAmount(q.amount);
              }}
            >
              {q.label} · {formatINR(q.amount)}
            </button>
          ))}
        </div>
      )}

      <form className="pay-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Amount</span>
          <span className="input-prefix">
            <span aria-hidden="true">₹</span>
            <input inputMode="decimal" placeholder="9985.00" required value={amount} onChange={edit(setAmount)} />
          </span>
        </label>
        <label className="field">
          <span>Paid on</span>
          <input
            type="date"
            required
            min={loan.disbursementDate}
            max={today}
            value={paidOn}
            onChange={edit(setPaidOn)}
          />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Recording…" : "Record payment"}
        </button>
      </form>

      {result && (
        <div className={`alert ${result.kind === "success" ? "alert-success" : "alert-error"}`} role="status">
          {result.message}
          {result.details && (
            <ul>
              {Object.entries(result.details).map(([field, message]) => (
                <li key={field}>
                  {field}: {typeof message === "string" ? message : JSON.stringify(message)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
