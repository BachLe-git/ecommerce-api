import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  }),
);

export default router;
