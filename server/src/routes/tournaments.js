import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  validateCreateTournament,
  validateRegisterPlayer,
} from "../middleware/validateTournament.js";
import { createTournament, registerPlayer } from "../services/tournaments.js";

export const tournamentsRouter = Router();

tournamentsRouter.post(
  "/tournaments",
  requireAuth,
  requireAdmin,
  validateCreateTournament,
  async (req, res) => {
    try {
      const tournament = await createTournament(req.body);
      res.status(201).json(tournament);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not create the tournament" });
    }
  },
);

tournamentsRouter.post(
  "/tournaments/:id/players",
  requireAuth,
  requireAdmin,
  validateRegisterPlayer,
  async (req, res) => {
    const tournamentId = Number(req.params.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ error: "Invalid tournament id" });
    }

    try {
      const result = await registerPlayer(tournamentId, req.body);
      if (result.outcome === "tournament_not_found") {
        return res.status(404).json({ error: "Tournament not found" });
      }
      if (result.outcome === "user_not_found") {
        return res.status(404).json({ error: "User not found" });
      }
      if (result.outcome === "already_registered") {
        return res.status(409).json({ error: "This member is already registered" });
      }
      res.status(201).json(result.player);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not register the player" });
    }
  },
);
