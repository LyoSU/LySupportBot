import { BotError, GrammyError, HttpError, Bot, Composer } from "grammy";
import { MyContext } from "../types";
import { logger } from ".";

async function errorHandler(err: BotError<MyContext>, res: any) {
  const ctx: MyContext = err.ctx;
  // const timeout: number = Date.now() - ctx["_start"];
  // logger.error(
  //   `Process update [ID:${ctx.update.update_id}]: [failed] (in ${timeout}ms)`
  // );
  const e = err.error;
  if (e instanceof BotError) {
    logger.error(`Error in bot: ${e.ctx}`);
  } else if (e instanceof GrammyError) {
    logger.error(`Error in request: ${e.description}`);
  } else if (e instanceof HttpError) {
    logger.error(`Could not contact Telegram: ${e}`);
  } else {
    console.error(e);

    logger.error(`Unknown error: ${e}`);
  }

  try {
    await ctx.reply(ctx.t("error"));

    res.status(200).send("error handled");
  } catch (error) {
    logger.error(`Error in reply: ${error}`);
  }
}

export default errorHandler;
