const ROLES = ["member", "admin"];

export function validateChangeRole(req, res, next) {
  const { role } = req.body;
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: "Enter a valid role" });
  }
  next();
}
