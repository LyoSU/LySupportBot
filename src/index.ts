import dotenv from "dotenv";

// Configure environment variables
dotenv.config({ path: `${__dirname}/../.env` });

import { Bot, BotError } from "grammy";
import { MyContext, MyApi } from "./types";
import express from "express";
import rateLimit from "express-rate-limit";
import {
  allowedUpdates,
  logger,
  setup,
  errorHandler,
  onlyTelegram,
  getClientIp,
  generateWebhookSecret,
} from "./utils";
import { dbConnection } from "./database/connection";
import db from "./database/models";
import { timingSafeEqual } from "crypto";

const domain = String(process.env.DOMAIN);
const port = Number(process.env.PORT);
const botToken = String(process.env.BOT_TOKEN);

// Initialize Express app
const app = express();

// Only trust first proxy (e.g., Cloudflare)
// This ensures req.ip is set correctly from X-Forwarded-For
app.set("trust proxy", 1);

// Middleware
app.use(onlyTelegram);
app.use(express.json());

// Rate limiting configuration
const limiter = rateLimit({
  keyGenerator: (req) => {
    // Use webhook secret from header as key if available, otherwise use client IP
    // Fallback to query token for backward compatibility during migration
    const secretToken = req.headers["x-telegram-bot-api-secret-token"];
    if (secretToken) {
      return secretToken.toString();
    }
    const token = req.query.token;
    if (token) {
      return token.toString();
    }
    return getClientIp(req) || "unknown";
  },
  windowMs: 1000,
  max: 40,
});

/**
 * Securely compare two strings using timing-safe comparison
 * to prevent timing attacks
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function handleBotRequest(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  // Primary authentication: X-Telegram-Bot-Api-Secret-Token header (secure method)
  const secretToken = req.headers["x-telegram-bot-api-secret-token"] as
    | string
    | undefined;

  // Fallback authentication: query token (deprecated, for backward compatibility during migration)
  const queryToken = req.query.token as string | undefined;

  let bot;

  if (secretToken) {
    // Secure authentication via webhook secret header
    bot = await db.Bots.findOne({ webhookSecret: secretToken });

    if (!bot) {
      logger.warn("Invalid webhook secret token received");
      res.status(401).send("Unauthorized");
      return;
    }

    // Verify using timing-safe comparison if bot has a webhookSecret
    if (bot.webhookSecret && !secureCompare(secretToken, bot.webhookSecret)) {
      logger.warn("Webhook secret mismatch");
      res.status(401).send("Unauthorized");
      return;
    }
  } else if (queryToken) {
    // DEPRECATED: Fallback to query token for backward compatibility
    // This path should be removed once all bots are migrated to use webhook secrets
    logger.warn(
      "Bot using deprecated query token authentication - should migrate to webhook secret",
    );
    bot = await db.Bots.findOne({ token: queryToken });

    if (!bot) {
      res.status(401).send("Unauthorized");
      return;
    }
  } else {
    res.status(401).send("Unauthorized");
    return;
  }

  if (!bot.token) {
    logger.warn(`Bot ${bot.telegram_id} has no token`);
    res.status(401).send("Unauthorized");
    return;
  }

  const gramBot = new Bot<MyContext, MyApi>(bot.token);

  try {
    await setup(gramBot);

    if (!gramBot.botInfo) {
      logger.warn(`Bot ${bot.telegram_id} has no botInfo after setup`);
      res.status(401).send("Unauthorized");
      return;
    }

    await gramBot.handleUpdate(req.body);
    res.status(200).send("ok");
  } catch (error) {
    logger.error(`Error handling request for bot ${bot.telegram_id}:`, error);
    await errorHandler(error as BotError<MyContext>, res);
  }
}

async function setupWebhook(
  bot: Bot<MyContext, MyApi>,
  webhookSecret: string,
): Promise<void> {
  // Secure webhook URL - no longer includes token in query string
  // Cache busting timestamp ensures Telegram recognizes webhook changes
  const webhookUrl = `https://${domain}/webhook?_=${Date.now()}`;

  try {
    await bot.api.setWebhook(webhookUrl, {
      allowed_updates: allowedUpdates,
      // Telegram will send this secret in X-Telegram-Bot-Api-Secret-Token header
      secret_token: webhookSecret,
    });
    logger.info(`Webhook set to ${webhookUrl} with secret token`);
  } catch (error) {
    logger.error("Failed to set webhook:", error);
    process.exit(1);
  }
}

async function bootstrap() {
  try {
    await dbConnection.connect();
    logger.info("Connected to MongoDB");

    // Health check endpoint
    app.get("/health", (_req, res) => {
      res.status(200).send("ok");
    });

    // Apply rate limiting to webhook
    app.use("/webhook", limiter);

    // Handle bot webhook requests (POST only)
    app.post("/webhook", handleBotRequest);

    // Catch-all for other routes
    app.use((_req, res) => {
      res.status(404).send("Not Found");
    });

    // Start server
    app.listen(port, async () => {
      logger.info(`Server is running on port ${port}`);

      const mainBot = new Bot<MyContext, MyApi>(botToken);

      // Get bot info to find the telegram_id
      const botInfo = await mainBot.api.getMe();

      // Get or create webhook secret for the main bot
      let botRecord = await db.Bots.findOne({ telegram_id: botInfo.id });

      if (!botRecord) {
        // Create bot record with webhook secret
        const webhookSecret = generateWebhookSecret();
        botRecord = await db.Bots.create({
          telegram_id: botInfo.id,
          username: botInfo.username,
          name: botInfo.first_name,
          token: botToken,
          webhookSecret: webhookSecret,
          is_active: true,
        });
        logger.info(
          `Created new bot record for ${botInfo.username} with webhook secret`,
        );
      } else if (!botRecord.webhookSecret) {
        // Migrate existing bot to use webhook secret
        const webhookSecret = generateWebhookSecret();
        botRecord = await db.Bots.findOneAndUpdate(
          { telegram_id: botInfo.id },
          {
            $set: {
              webhookSecret: webhookSecret,
              token: botToken, // Ensure token is stored
            },
          },
          { new: true },
        );
        logger.info(`Migrated bot ${botInfo.username} to use webhook secret`);
      }

      await setupWebhook(mainBot, botRecord!.webhookSecret!);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch((error) => {
  logger.error("Unhandled error during startup:", error);
  process.exit(1);
});
