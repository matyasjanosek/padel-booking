const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(req, res, next) {
  const { email, password, name } = req.body;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Enter your name" });
  }

  req.body.email = email.trim();
  req.body.name = name.trim();
  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (typeof email !== "string" || email.trim().length === 0) {
    return res.status(400).json({ error: "Enter your email address" });
  }
  if (typeof password !== "string" || password.length === 0) {
    return res.status(400).json({ error: "Enter your password" });
  }

  req.body.email = email.trim();
  next();
}
