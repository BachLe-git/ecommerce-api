import { env } from "../config.js";

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === "P2002") {
    return res.status(409).json({ error: "A record with this value already exists." });
  }
  if (error.code === "P2003" || error.code === "P2025") {
    return res.status(409).json({ error: "The requested record conflicts with existing data." });
  }
  if (error.code === "P2034") {
    return res.status(409).json({ error: "Concurrent update conflict. Please retry the request." });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) {
    console.error(error);
  }
  return res.status(status).json({
    error: status >= 500 && env.NODE_ENV === "production" ? "Internal server error." : error.message,
  });
}
