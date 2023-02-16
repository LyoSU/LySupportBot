import { Bot, BotError } from "grammy";
import { MyContext, MyApi } from "./types";

import dotenv from "dotenv";
dotenv.config({ path: `${__dirname}/../.env` });

import express from "express";
import rateLimit from "express-rate-limit";
import { onlyTelegram } from "./utils";

import { webhookCallback } from "grammy";

import { allowedUpdates, logger, setup, errorHandler } from "./utils";
import { connectMongoose } from "./database/connection";

import db from "./database/models";

const domain = String(process.env.DOMAIN);
const app = express();

app.use(onlyTelegram);

app.use(express.json());

async function start() {
  await connectMongoose();

  app.use(
    rateLimit({
      keyGenerator: (req) => {
        const token =
          req.query.token ||
          req.headers["cf-connecting-ip"] ||
          req.headers["x-real-ip"] ||
          req.ip ||
          req.connection.remoteAddress ||
          "unknown";
        return token;
      },
      windowMs: 60 * 1000,
      max: 30,
    })
  );

  app.use(async (req: express.Request, res: express.Response) => {
    const token = req.query.token;

    if (!token) {
      res.status(401).send("Unauthorized");
      return;
    }

    const findBot = db.Bots.findOne({ token });

    if (!findBot) {
      res.status(401).send("Unauthorized");
      return;
    }

    const bot = new Bot<MyContext, MyApi>(token);

    await setup(bot);

    if (!bot.botInfo) {
      res.status(401).send("Unauthorized");
      return;
    }

    return webhookCallback(bot, "express")(req, res).catch(
      (error: BotError<MyContext>) => {
        return errorHandler(error, res);
      }
    );
  });

  app.listen(Number(process.env.PORT), async () => {
    const bot = new Bot<MyContext, MyApi>(String(process.env.BOT_TOKEN));

    await bot.api.setWebhook(
      `https://${domain}/?token=${String(process.env.BOT_TOKEN)}&` + Date.now(),
      {
        allowed_updates: allowedUpdates,
      }
    );
  });
}

start();
