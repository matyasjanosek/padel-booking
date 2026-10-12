async function parseJsonOrThrow(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || "Something went wrong");
  }
  return body;
}

export async function fetchAdminCoupons() {
  const res = await fetch("/api/admin/coupons");
  return parseJsonOrThrow(res);
}

export async function createCoupon(coupon) {
  const res = await fetch("/api/admin/coupons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coupon),
  });
  return parseJsonOrThrow(res);
}

export async function setCouponActive(id, isActive) {
  const res = await fetch(`/api/admin/coupons/${id}/${isActive ? "activate" : "deactivate"}`, {
    method: "POST",
  });
  return parseJsonOrThrow(res);
}
