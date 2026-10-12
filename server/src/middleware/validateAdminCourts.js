export function validateRenameCourt(req, res, next) {
  const { name } = req.body;
  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Enter a court name" });
  }
  next();
}
