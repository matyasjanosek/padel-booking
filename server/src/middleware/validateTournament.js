const FORMATS = ["americano", "mexicano", "round_robin"];

export function validateCreateTournament(req, res, next) {
  const { name, format, pointsPerMatch, courtCount, roundCount } = req.body;

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
  // How many rounds the tournament runs for is decided here, up front, not
  // left open-ended. Unlike round robin, Mexicano has no schedule to
  // exhaust, so "keep generating until done" has no natural end on its own;
  // a fixed count also lets a later TV display show "round 3 of 6".
  const roundCountNumber = Number(roundCount);
  if (!Number.isInteger(roundCountNumber) || roundCountNumber <= 0) {
    return res.status(400).json({ error: "Enter a valid number of rounds" });
  }

  req.body.pointsPerMatch = pointsPerMatchNumber;
  req.body.courtCount = courtCountNumber;
  req.body.roundCount = roundCountNumber;
  next();
}

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

export function validateScore(req, res, next) {
  const { scoreA, scoreB } = req.body;
  const scoreANumber = Number(scoreA);
  const scoreBNumber = Number(scoreB);

  if (!Number.isInteger(scoreANumber) || scoreANumber < 0) {
    return res.status(400).json({ error: "Enter a valid score for team A" });
  }
  if (!Number.isInteger(scoreBNumber) || scoreBNumber < 0) {
    return res.status(400).json({ error: "Enter a valid score for team B" });
  }

  req.body.scoreA = scoreANumber;
  req.body.scoreB = scoreBNumber;
  next();
}
