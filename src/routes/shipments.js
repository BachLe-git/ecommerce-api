import { Router } from "express";
import { prisma } from "../db.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { orderIdSchema, shipmentCreateSchema, shipmentStatusSchema } from "../validators.js";

const router = Router();

router.get(
  "/orders/:oid",
  authenticate,
  validate(orderIdSchema),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { oid: req.validated.params.oid },
      select: { uid: true },
    });
    if (!order) {
      throw new HttpError(404, "Order not found.");
    }
    if (req.user.role !== "admin" && order.uid !== req.user.uid) {
      throw new HttpError(403, "You cannot access another user's shipment.");
    }
    const shipments = await prisma.shipment.findMany({
      where: { oid: req.validated.params.oid },
      orderBy: { shipid: "asc" },
    });
    res.json({ data: shipments });
  }),
);

router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validate(shipmentCreateSchema),
  asyncHandler(async (req, res) => {
    const shipment = await prisma.shipment.create({ data: req.validated.body });
    res.status(201).json({ data: shipment });
  }),
);

router.patch(
  "/:shipid/status",
  authenticate,
  requireRole("admin"),
  validate(shipmentStatusSchema),
  asyncHandler(async (req, res) => {
    const shipment = await prisma.shipment.update({
      where: { shipid: req.validated.params.shipid },
      data: { status: req.validated.body.status },
    });
    res.json({ data: shipment });
  }),
);

export default router;
