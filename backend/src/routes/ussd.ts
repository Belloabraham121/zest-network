import { Router } from "express";

const router = Router();

router.post("/webhook", async (req, res) => {
  console.log("USSD webhook received:", req.body);

  res.status(200).json({
    message: "USSD webhook received",
    status: "success",
    note: "USSD functionality not yet implemented",
  });
});

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "ussd-webhook",
    timestamp: new Date().toISOString(),
    note: "USSD functionality not yet implemented",
  });
});

router.get("/webhook", (req, res) => {
  res.status(200).send("USSD webhook endpoint is active (placeholder)");
});

export default router;
