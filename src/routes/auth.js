import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { env } from "../config.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { loginSchema, registerSchema } from "../validators.js";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.validated.body;
    const [role, membership] = await Promise.all([
      prisma.role.findUnique({where: { rolename: "normal" },}),
      prisma.membership.findUnique({ where: { mname: "basic" } }),
    ]);
    if (!role || !membership) {
      throw new Error("Required seed data is missing. Run the database seed command.");
    }

    const user = await prisma.user.create({
      data: {
        username,
        password: await bcrypt.hash(password, 12),
        roleid: role.roleid,
        mid: membership.mid,
      },
      select: { uid: true, username: true },
    });
    res.status(201).json({ data: user });
  }),
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { username, password } = req.validated.body;
    const user = await prisma.user.findUnique({
      where: { username },
      include: { role: { select: { rolename: true } } },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpError(401, "Invalid username or password.");
    }

    const token = jwt.sign({}, env.JWT_SECRET, {
      subject: String(user.uid),
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: "ecommerce-api",
      audience: "ecommerce-client",
    });
    res.json({
      data: {
        accessToken: token,
        tokenType: "Bearer",
        expiresIn: env.JWT_EXPIRES_IN,
        user: { uid: user.uid, username: user.username, role: user.role.rolename },
      },
    });
  }),
);

export default router;
