import dotenv from "dotenv";

// Configure environment variables
dotenv.config({ path: `${__dirname}/../.env` });

import { Bot, BotError } from "grammy";
import { MyContext, MyApi } from "./types";
import express from "express";
import rateLimit from "express-rate-limit";
import { webhookCallback } from "grammy";
import { allowedUpdates, logger, setup, errorHandler, onlyTelegram } from "./utils";
import { dbConnection } from "./database/connection";
import db from "./database/models";

const domain = String(process.env.DOMAIN);
const port = Number(process.env.PORT);
const botToken = String(process.env.BOT_TOKEN);

// Initialize Express app
const app = express();

app.use((req, res, next) => {
  console.log('Request received:', req.method, req.url);
  next();
});

// Middleware
app.use(onlyTelegram);
app.use(express.json());

// Rate limiting configuration
const limiter = rateLimit({
  keyGenerator: (req) => {
    return (
      req.query.token ||
      req.headers["cf-connecting-ip"] ||
      req.headers["x-real-ip"] ||
      req.ip ||
      req.connection.remoteAddress ||
      "unknown"
    ).toString();
  },
  windowMs: 1000,
  max: 40,
});

async function handleBotRequest(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const token = req.query.token as string;

  if (!token) {
    res.status(401).send("Unauthorized");
    return;
  }

  const bot = await db.Bots.findOne({ token });

  if (!bot) {
    res.status(401).send("Unauthorized");
    return;
  }

  const gramBot = new Bot<MyContext, MyApi>(token);

  try {
    await setup(gramBot);

    if (!gramBot.botInfo) {
      res.status(401).send("Unauthorized");
      return;
    }

    await webhookCallback(gramBot, "express")(req, res);
  } catch (error) {
    await errorHandler(error as BotError<MyContext>, res);
  }
}

async function setupWebhook(bot: Bot<MyContext, MyApi>): Promise<void> {
  const webhookUrl = `https://${domain}/?token=${botToken}&${Date.now()}`;

  try {
    await bot.api.setWebhook(webhookUrl, {
      allowed_updates: allowedUpdates,
    });
    logger.info(`Webhook set to ${webhookUrl}`);
  } catch (error) {
    logger.error('Failed to set webhook:', error);
    process.exit(1);
  }
}

async function bootstrap() {
  try {
    await dbConnection.connect();
    logger.info('Connected to MongoDB');

    // Apply rate limiting
    app.use(limiter);

    // Handle bot requests
    app.use(handleBotRequest);

    // Start server
    app.listen(port, async () => {
      logger.info(`Server is running on port ${port}`);

      const mainBot = new Bot<MyContext, MyApi>(botToken);
      await setupWebhook(mainBot);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch((error) => {
  logger.error('Unhandled error during startup:', error);
  process.exit(1);
});