import { Router } from "express";
import { webhooksController } from "../controllers/webhooks.controller";

// TODO: ✅ Task 12: Setup SMS webhook routes

const router = Router();

// ✅ Task 12: SMS webhook endpoint
// This endpoint receives incoming SMS messages from Twilio
router.post("/webhook", async (req, res) => {
  await webhooksController.handleSMSWebhook(req, res);
});

// Health check for SMS service
router.get("/health", async (req, res) => {
  await webhooksController.healthCheck(req, res);
});

// Webhook verification for Twilio (optional)
router.get("/webhook", (req, res) => {
  // Twilio webhook verification
  const challenge = req.query["hub.challenge"];
  if (challenge) {
    res.status(200).send(challenge);
  } else {
    res.status(200).send("SMS webhook endpoint is active");
  }
});

export default router;