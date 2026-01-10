import { BotError, GrammyError, HttpError } from "grammy";
import { Response } from "express";
import { MyContext } from "../types";
import { logger } from ".";

async function errorHandler(err: BotError<MyContext>, res: Response) {
  const ctx: MyContext = err.ctx;
  // const timeout: number = Date.now() - ctx["_start"];
  // logger.error(
  //   `Process update [ID:${ctx.update.update_id}]: [failed] (in ${timeout}ms)`
  // );
  logger.error("Bot error:", err);

  const e = err.error;
  if (e instanceof BotError) {
    logger.error(`Error in bot: ${e.ctx}`);
  } else if (e instanceof GrammyError) {
    logger.error(`Error in request: ${e.description}`);
  } else if (e instanceof HttpError) {
    logger.error(`Could not contact Telegram: ${e}`);
  } else {
    logger.error("Unhandled error:", e);

    const safeUpdateInfo = ctx?.update
      ? {
          update_id: ctx.update.update_id,
          type: Object.keys(ctx.update).filter((k) => k !== "update_id")[0],
          chat_id: ctx.chat?.id,
          from_id: ctx.from?.id,
        }
      : null;
    logger.error(
      `Unknown error: ${e}, update: ${JSON.stringify(safeUpdateInfo)}`,
    );
  }

  try {
    if (ctx) {
      await ctx.reply(ctx.t("error")).catch((error) => {
        logger.error(`Error in error handler: ${error}`);
      });
    }

    return res.status(200).send("error handled");
  } catch (error) {
    logger.error(`Error in error handler: ${error}`);
  }

  return res.status(500).send("internal error, please try again later");
}

export default errorHandler;
