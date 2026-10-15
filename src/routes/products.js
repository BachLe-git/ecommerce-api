import { Router } from "express";
import { prisma } from "../db.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { productCreateSchema, productIdSchema, productUpdateSchema } from "../validators.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const products = await prisma.product.findMany({ orderBy: { pid: "asc" } });
    res.json({ data: products });
  }),
);

router.get(
  "/:pid",
  validate(productIdSchema),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { pid: req.validated.params.pid } });
    if (!product) {
      throw new HttpError(404, "Product not found.");
    }
    res.json({ data: product });
  }),
);

router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validate(productCreateSchema),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.create({ data: req.validated.body });
    res.status(201).json({ data: product });
  }),
);

router.patch(
  "/:pid",
  authenticate,
  requireRole("admin"),
  validate(productUpdateSchema),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.update({
      where: { pid: req.validated.params.pid },
      data: req.validated.body,
    });
    res.json({ data: product });
  }),
);

router.delete(
  "/:pid",
  authenticate,
  requireRole("admin"),
  validate(productIdSchema),
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { pid: req.validated.params.pid } });
    res.status(204).end();
  }),
);

export default router;
