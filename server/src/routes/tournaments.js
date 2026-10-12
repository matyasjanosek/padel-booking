import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  validateCreateTournament,
  validateRegisterPlayer,
} from "../middleware/validateTournament.js";
import { createTournament, registerPlayer, removePlayer } from "../services/tournaments.js";
import { generateNextRound } from "../services/tournamentRounds.js";

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

tournamentsRouter.delete(
  "/tournaments/:id/players/:playerId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const tournamentId = Number(req.params.id);
    const playerId = Number(req.params.playerId);
    if (
      !Number.isInteger(tournamentId) ||
      tournamentId <= 0 ||
      !Number.isInteger(playerId) ||
      playerId <= 0
    ) {
      return res.status(400).json({ error: "Invalid tournament or player id" });
    }

    try {
      const result = await removePlayer(tournamentId, playerId);
      if (result.outcome === "not_found") {
        return res.status(404).json({ error: "Player not found in this tournament" });
      }
      if (result.outcome === "not_draft") {
        return res
          .status(409)
          .json({ error: "Players can only be removed while the tournament is a draft" });
      }
      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Could not remove the player" });
    }
  },
);

tournamentsRouter.post("/tournaments/:id/rounds", requireAuth, requireAdmin, async (req, res) => {
  const tournamentId = Number(req.params.id);
  if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
    return res.status(400).json({ error: "Invalid tournament id" });
  }

  try {
    const result = await generateNextRound(tournamentId);
    if (result.outcome === "not_found") {
      return res.status(404).json({ error: "Tournament not found" });
    }
    if (result.outcome === "unsupported_format") {
      return res
        .status(400)
        .json({ error: "Only Mexicano tournaments support round generation right now" });
    }
    if (result.outcome === "previous_round_incomplete") {
      return res
        .status(409)
        .json({ error: "Every match in the current round needs a score first" });
    }
    if (result.outcome === "tournament_complete") {
      return res
        .status(409)
        .json({ error: "This tournament has already generated all its rounds" });
    }
    if (result.outcome === "not_enough_players") {
      return res.status(409).json({ error: "At least 4 players are needed to generate a round" });
    }
    if (result.outcome === "no_courts_available") {
      return res.status(409).json({ error: "No active courts are available" });
    }
    res.status(201).json({
      round: result.round,
      matches: result.matches,
      sitOutPlayerIds: result.sitOutPlayerIds,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not generate the round" });
  }
});
