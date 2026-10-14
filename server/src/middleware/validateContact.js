const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(req, res, next) {
  const { name, email, message } = req.body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Enter your name" });
  }
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Enter a message" });
  }

  req.body.name = name.trim();
  req.body.email = email.trim();
  req.body.message = message.trim();
  next();
}
