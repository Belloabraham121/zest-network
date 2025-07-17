import { Router } from "express";
import { webhooksController } from "../controllers/webhooks.controller";

const router = Router();

router.post("/webhook", async (req, res) => {
  await webhooksController.handleWhatsAppWebhook(req, res);
});

router.get("/health", async (req, res) => {
  await webhooksController.healthCheck(req, res);
});

router.get("/webhook", (req, res) => {
  const challenge = req.query["hub.challenge"];
  if (challenge) {
    res.status(200).send(challenge);
  } else {
    res.status(200).send("WhatsApp webhook endpoint is active");
  }
});

export default router;
