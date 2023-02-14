import { Bot, session } from "grammy";
import { logger } from "../utils";
import { MyContext, SessionData } from "../types";
import { hydrateContext } from "@grammyjs/hydrate";
import { MongoDBAdapter, ISession } from "@grammyjs/storage-mongodb";
import { MongoClient } from "mongodb";
import { conversations } from "@grammyjs/conversations";

import loggingUpdates from "./logging";
import { i18n } from "./i18n";
import { userUpdateMiddleware } from "./user-update";
import { botUpdateMiddleware } from "./bot-update";

async function setup(bot: Bot<MyContext>) {
  bot.use(loggingUpdates);
  bot.use(hydrateContext());

  function initial(): SessionData {
    return {
      user: undefined,
      bot: undefined,
      state: {},
      data: {},
      conversation: {},
    };
  }

  const client = new MongoClient(process.env.MONGO_URI);
  const db = client.db();

  client.on("error", (err) => {
    logger.error("MongoDB connection error: ", err);

    setTimeout(() => process.exit(1), 2000);
  });

  const sessions = db.collection<ISession>("sessions");

  bot.use(
    session({
      initial,
      storage: new MongoDBAdapter({ collection: sessions }) as any,
      getSessionKey(ctx: MyContext): string | undefined {
        return `${ctx.me.id}:${ctx.from?.id}`;
      },
    })
  );

  bot.use(botUpdateMiddleware);
  bot.use(userUpdateMiddleware);
  bot.use((ctx, next) => {
    ctx.session.conversation = ctx.session.conversation || {};
    return next();
  });

  bot.use(conversations());

  bot.use(i18n());
}

export default { setup };
