import { Bot, BotError } from "grammy";
import { MyContext, MyApi } from "./types";

import dotenv from "dotenv";
dotenv.config({ path: `${__dirname}/../.env` });

import express from "express";
import { webhookCallback } from "grammy";

import { allowedUpdates, logger, setup, errorHandler } from "./utils";
import { connectMongoose } from "./database/connection";

const domain = String(process.env.DOMAIN);
const app = express();

async function start() {
  await connectMongoose();

  app.use(express.json());
  app.use(async (req, res) => {
    const token = req.query.token;

    if (!token) {
      res.status(401).send("Unauthorized");
      return;
    }

    const bot = new Bot<MyContext, MyApi>(token);

    await setup(bot);

    return webhookCallback(bot, "express")(req, res).catch((error: BotError<MyContext>) => {
      errorHandler(error);
      res.status(200).send("error handled");
    });
  });

  app.listen(Number(process.env.PORT), async () => {
    const bot = new Bot<MyContext, MyApi>(String(process.env.BOT_TOKEN));

    await bot.api.setWebhook(
      `https://${domain}/?token=${String(process.env.BOT_TOKEN)}`,
      {
        allowed_updates: allowedUpdates,
      }
    );
  });
}

start();
