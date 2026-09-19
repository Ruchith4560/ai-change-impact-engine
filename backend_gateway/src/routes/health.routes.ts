import { Router, Request, Response } from "express";
import { intelligenceClient } from "../services/intelligenceClient.js";

export const healthRouter = Router();

healthRouter.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "AI Change Impact Engine - API Gateway",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/health/ready", async (req: Request, res: Response) => {
  try {
    const intelligenceHealth = await intelligenceClient.checkHealth();
    res.json({
      status: "ready",
      gateway: "ok",
      intelligenceService: intelligenceHealth,
    });
  } catch (err: unknown) {
    res.status(503).json({
      status: "degraded",
      gateway: "ok",
      intelligenceService: "unavailable",
      error: err instanceof Error ? err.message : "Service error",
    });
  }
});
