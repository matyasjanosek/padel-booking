import { useEffect, useState } from "react";
import { fetchAdminCoupons, createCoupon, setCouponActive } from "../api/adminCoupons.js";

const EMPTY_FORM = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  validFrom: "",
  validUntil: "",
  maxUses: "",
};

function discountLabel(coupon) {
  return coupon.discountType === "percentage"
    ? `${coupon.discountValue}%`
    : `${coupon.discountValue} CZK`;
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchAdminCoupons()
      .then(setCoupons)
      .catch((err) => setLoadError(err.message));
  }, []);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setCreating(true);
    setFormError("");
    try {
      // datetime-local has no timezone of its own, new Date() reads it in
      // the browser's local time, exactly as the admin entered it.
      const created = await createCoupon({
        ...form,
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
      });
      setCoupons((current) => [...current, created]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(coupon) {
    setTogglingId(coupon.id);
    try {
      const updated = await setCouponActive(coupon.id, !coupon.isActive);
      setCoupons((current) => current.map((c) => (c.id === coupon.id ? updated : c)));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="px-5 py-12 md:max-w-page md:pl-24 md:pr-10 md:py-16">
      <h1 className="mb-4 text-4xl tracking-tight md:text-5xl">Coupons</h1>
      <p className="mb-8 max-w-[60ch] text-text-muted">
        Create discount codes members can apply when booking, and deactivate or reactivate one as
        needed.
      </p>

      <form
        onSubmit={handleCreate}
        className="mb-10 flex max-w-xl flex-col gap-4 rounded-lg border border-border p-5"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="coupon-code-input">
            Code
          </label>
          <input
            id="coupon-code-input"
            type="text"
            value={form.code}
            onChange={(event) => updateForm("code", event.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
            required
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="coupon-discount-type">
              Discount type
            </label>
            <select
              id="coupon-discount-type"
              value={form.discountType}
              onChange={(event) => updateForm("discountType", event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount (CZK)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="coupon-discount-value">
              Discount value
            </label>
            <input
              id="coupon-discount-value"
              type="number"
              step="0.01"
              min="0"
              value={form.discountValue}
              onChange={(event) => updateForm("discountValue", event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="coupon-max-uses">
              Usage limit
            </label>
            <input
              id="coupon-max-uses"
              type="number"
              step="1"
              min="1"
              value={form.maxUses}
              onChange={(event) => updateForm("maxUses", event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="coupon-valid-from">
              Valid from
            </label>
            <input
              id="coupon-valid-from"
              type="datetime-local"
              value={form.validFrom}
              onChange={(event) => updateForm("validFrom", event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="coupon-valid-until">
              Valid until
            </label>
            <input
              id="coupon-valid-until"
              type="datetime-local"
              value={form.validUntil}
              onChange={(event) => updateForm("validUntil", event.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
        </div>

        {formError && <p className="text-sm text-danger">{formError}</p>}

        <button
          type="submit"
          disabled={creating}
          className="mt-1 inline-block self-start rounded-full border border-accent bg-accent px-6 py-2.5 font-medium text-bg transition-opacity duration-200 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create coupon"}
        </button>
      </form>

      {loadError && <p className="mb-4 text-sm text-danger">{loadError}</p>}

      {coupons === null ? (
        <p className="text-text-muted">Loading coupons...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-sm text-text-muted">
                <th className="py-2 pr-3 font-normal">Code</th>
                <th className="py-2 pr-3 font-normal">Discount</th>
                <th className="py-2 pr-3 font-normal">Valid</th>
                <th className="py-2 pr-3 font-normal">Used</th>
                <th className="py-2 pr-3 font-normal">Status</th>
                <th className="py-2 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-border/60">
                  <td className="py-3 pr-3 text-text">{coupon.code}</td>
                  <td className="py-3 pr-3 text-text">{discountLabel(coupon)}</td>
                  <td className="py-3 pr-3 text-text-muted">
                    {new Date(coupon.validFrom).toLocaleDateString()} to{" "}
                    {new Date(coupon.validUntil).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-3 text-text-muted">
                    {coupon.timesUsed} / {coupon.maxUses}
                  </td>
                  <td className="py-3 pr-3 text-text-muted">
                    {coupon.isActive ? "Active" : "Inactive"}
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(coupon)}
                      disabled={togglingId === coupon.id}
                      className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text transition-colors duration-200 hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {togglingId === coupon.id
                        ? "Saving..."
                        : coupon.isActive
                          ? "Deactivate"
                          : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
