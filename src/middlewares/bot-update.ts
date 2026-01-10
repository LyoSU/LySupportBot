import { NextFunction } from "grammy";
import { Bot, Bots } from "../database/models/bots";
import { MyContext } from "../types";
import { generateWebhookSecret, logger } from "../utils";

export const botUpdateMiddleware = async (
  ctx: MyContext,
  next: NextFunction,
) => {
  // Skip for updates without from (chat_boost, removed_chat_boost, message_reaction_count)
  // These updates are anonymous and don't have session
  if (!ctx.from) {
    return next();
  }

  const { me } = ctx;

  const params: Partial<Bot> = {
    telegram_id: me.id,
    name: me.first_name,
    username: me.username,
    last_activity_at: new Date(),
  };

  try {
    // First check if bot exists and has a webhookSecret
    let bot = await Bots.findOne({ telegram_id: me.id });

    if (!bot) {
      // New bot - generate webhookSecret on creation
      params.webhookSecret = generateWebhookSecret();
      bot = await Bots.findOneAndUpdate(
        { telegram_id: me.id },
        { $set: params },
        { upsert: true, new: true },
      );
    } else if (!bot.webhookSecret) {
      // Existing bot without webhookSecret - generate one for migration
      params.webhookSecret = generateWebhookSecret();
      bot = await Bots.findOneAndUpdate(
        { telegram_id: me.id },
        { $set: params },
        { new: true },
      );
    } else {
      // Existing bot with webhookSecret - just update other fields
      bot = await Bots.findOneAndUpdate(
        { telegram_id: me.id },
        { $set: params },
        { new: true },
      );
    }

    ctx.session.bot = bot;
  } catch (error) {
    logger.error("Error updating bot:", error);
    ctx.session.bot = null;
  }

  return next();
};
