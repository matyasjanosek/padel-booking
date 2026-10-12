const FORMATS = ["americano", "mexicano", "round_robin"];

export function validateCreateTournament(req, res, next) {
  const { name, format, pointsPerMatch, courtCount } = req.body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Enter a tournament name" });
  }
  if (!FORMATS.includes(format)) {
    return res.status(400).json({ error: "Enter a valid format" });
  }

  const pointsPerMatchNumber = Number(pointsPerMatch);
  if (!Number.isInteger(pointsPerMatchNumber) || pointsPerMatchNumber <= 0) {
    return res.status(400).json({ error: "Enter a valid number of points per match" });
  }
  const courtCountNumber = Number(courtCount);
  if (!Number.isInteger(courtCountNumber) || courtCountNumber <= 0) {
    return res.status(400).json({ error: "Enter a valid number of courts" });
  }

  req.body.pointsPerMatch = pointsPerMatchNumber;
  req.body.courtCount = courtCountNumber;
  next();
}

// Exactly one of userId (a member) or displayName (a guest) must be given.
export function validateRegisterPlayer(req, res, next) {
  const { userId, displayName } = req.body;
  const hasUserId = userId !== undefined && userId !== null && userId !== "";
  const hasDisplayName = typeof displayName === "string" && displayName.trim().length > 0;

  if (hasUserId === hasDisplayName) {
    return res.status(400).json({
      error: "Provide either a member's user id or a guest's display name, not both",
    });
  }

  if (hasUserId) {
    const userIdNumber = Number(userId);
    if (!Number.isInteger(userIdNumber) || userIdNumber <= 0) {
      return res.status(400).json({ error: "Enter a valid user id" });
    }
    req.body.userId = userIdNumber;
  }

  next();
}
