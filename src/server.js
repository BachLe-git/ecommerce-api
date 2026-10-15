import app from "./app.js";
import { env } from "./config.js";
import { prisma } from "./db.js";

const server = app.listen(env.PORT, () => {
  console.info(`E-commerce API listening on port ${env.PORT}.`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.info(`${signal} received; shutting down gracefully.`);

  server.close(async (error) => {
    if (error) {
      console.error("HTTP server shutdown failed:", error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
    process.exit();
  });

  setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
