import { NextFunction } from "grammy";
import { Bot, Bots } from "../database/models/bots";
import { MyContext } from "../types";

export const botUpdateMiddleware = async (
  ctx: MyContext,
  next: NextFunction
) => {
  const { me } = ctx;

  let params: Partial<Bot> = {
    telegram_id: me.id,
    name: me.first_name,
    username: me.username,
    last_activity_at: new Date(),
  };
  try {
    const bot = await Bots.findOneAndUpdate(
      { telegram_id: me.id },
      { $set: params },
      { upsert: true, new: true }
    );

    ctx.session.bot = bot;
  } catch (error) {
    console.error("Error user", error);
    ctx.session.bot = null;
  }

  return next();
};
