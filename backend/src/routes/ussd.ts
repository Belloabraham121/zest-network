import { Router } from "express";

// TODO: ✅ Task 14: Setup USSD webhook routes (placeholder for future implementation)

const router = Router();

// ✅ Task 14: USSD webhook endpoint (placeholder)
// This endpoint will handle USSD requests in the future
router.post("/webhook", async (req, res) => {
  console.log("USSD webhook received:", req.body);
  
  // Placeholder response for USSD
  res.status(200).json({
    message: "USSD webhook received",
    status: "success",
    note: "USSD functionality not yet implemented"
  });
});

// Health check for USSD service
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "ussd-webhook",
    timestamp: new Date().toISOString(),
    note: "USSD functionality not yet implemented"
  });
});

// Webhook verification
router.get("/webhook", (req, res) => {
  res.status(200).send("USSD webhook endpoint is active (placeholder)");
});

export default router;