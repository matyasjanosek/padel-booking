import { Router } from "express";
import { validateContact } from "../middleware/validateContact.js";
import { rateLimitContact } from "../middleware/rateLimitContact.js";
import { sendContactMessage } from "../services/contactEmail.js";

export const contactRouter = Router();

contactRouter.post("/contact", rateLimitContact, validateContact, async (req, res) => {
  try {
    await sendContactMessage(req.body);
    res.status(200).json({ sent: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not send your message. Try again later." });
  }
});
