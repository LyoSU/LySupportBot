import { Bot, session } from "grammy";
import { logger } from "../utils";
import { MyContext, SessionData } from "../types";
import { hydrateContext } from "@grammyjs/hydrate";
import { MongoDBAdapter, ISession } from "@grammyjs/storage-mongodb";
import { conversations } from "@grammyjs/conversations";
import { dbConnection } from "../database/connection";

import loggingUpdates from "./logging";
import { i18n } from "./i18n";
import { userUpdateMiddleware } from "./user-update";
import { botUpdateMiddleware } from "./bot-update";

async function setup(bot: Bot<MyContext>) {
  bot.use(loggingUpdates);
  bot.use(hydrateContext());

  function initial(): SessionData {
    return {
      user: null,
      bot: null,
      state: {
        contactData: null,
        startParam: null,
        blocksChain: [],
        lastBlock: null,
      },
      conversation: {},
    };
  }

  try {
    const connection = await dbConnection.connect();
    const sessions = connection.collection<ISession>("sessions");

    bot.use(
      session({
        initial,
        storage: new MongoDBAdapter<SessionData>({ collection: sessions }),
        getSessionKey(ctx): string | undefined {
          if (!ctx.from?.id) return undefined;
          return `${ctx.me.id}:${ctx.from.id}`;
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
  } catch (error) {
    logger.error("Failed to setup bot middlewares:", error);
    throw error;
  }
}

export default { setup };
