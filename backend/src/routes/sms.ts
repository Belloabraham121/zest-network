import { Router } from "express";
import { webhooksController } from "../controllers/webhooks.controller";
// Temporarily disabled webhook security for testing
// import {
//   validateContentType,
//   validateUserAgent,
//   validateTwilioIP,
//   webhookRateLimit,
//   validateTwilioWebhook,
// } from "../middleware/webhook-security.middleware";

const router = Router();

// Temporarily disabled security middleware for SMS webhook testing
router.post("/webhook", async (req, res) => {
  await webhooksController.handleSMSWebhook(req, res);
});

// router.post(
//   "/webhook",
//   validateContentType,
//   validateUserAgent,
//   // validateTwilioIP, // Optional - uncomment for IP whitelisting
//   webhookRateLimit,
//   validateTwilioWebhook,
//   async (req, res) => {
//     await webhooksController.handleSMSWebhook(req, res);
//   }
// );

router.get("/health", async (req, res) => {
  await webhooksController.healthCheck(req, res);
});

router.get("/webhook", (req, res) => {
  const challenge = req.query["hub.challenge"];
  if (challenge) {
    res.status(200).send(challenge);
  } else {
    res.status(200).send("SMS webhook endpoint is active");
  }
});

export default router;
