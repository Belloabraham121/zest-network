import { Router } from "express";
import { tokensController } from "../controllers/tokens.controller";

const router = Router();

// Get all supported tokens
router.get("/", tokensController.getTokens.bind(tokensController));

// Add a new token
router.post("/", tokensController.addToken.bind(tokensController));

// Get specific token information
router.get("/:symbol", tokensController.getToken.bind(tokensController));

// Toggle token status (enable/disable)
router.patch("/:symbol/toggle", tokensController.toggleToken.bind(tokensController));

// Validate a token contract
router.post("/validate", tokensController.validateToken.bind(tokensController));

export default router;