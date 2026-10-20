import { Router } from "express";
import { validateGateCode } from "../services/gateAccess.js";
import { rateLimitGate, recordFailedGateAttempt } from "../middleware/rateLimitGate.js";

export const gateRouter = Router();

gateRouter.post("/gate/validate", rateLimitGate, async (req, res) => {
  const { code } = req.body;
  if (typeof code !== "string" || code.length === 0) {
    return res.status(400).json({ error: "Enter a gate code" });
  }

  try {
    const result = await validateGateCode(code);
    if (!result.granted) {
      recordFailedGateAttempt(req.ip);
      console.error(`Gate code rejected from ${req.ip}: ${code}`);
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not validate the gate code" });
  }
});
