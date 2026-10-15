import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { env } from "../config.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  const authorization = req.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "Authentication required.");
  }

  let payload;
  try {
    payload = jwt.verify(authorization.slice(7), env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "ecommerce-api",
      audience: "ecommerce-client",
    });
  } catch {
    throw new HttpError(401, "Invalid or expired access token.");
  }

  if (typeof payload !== "object" || typeof payload.sub !== "string") {
    throw new HttpError(401, "Invalid access token.");
  }

  const uid = Number(payload.sub);
  if (!Number.isSafeInteger(uid) || uid < 1) {
    throw new HttpError(401, "Invalid access token.");
  }

  const user = await prisma.user.findUnique({
    where: { uid },
    select: { uid: true, username: true, role: { select: { rolename: true } } },
  });
  if (!user) {
    throw new HttpError(401, "Account no longer exists.");
  }

  req.user = { ...user, role: user.role.rolename };
  next();
});

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new HttpError(403, "You do not have permission to perform this action."));
  }
  next();
};
