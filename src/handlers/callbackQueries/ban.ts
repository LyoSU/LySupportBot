import { Bot } from "grammy";
import { MyContext } from "../../types";

async function banUser(ctx: MyContext) {
  const user = await ctx.database.Users.findOne({ telegram_id: ctx.match[1] });

  if (!user) {
    return ctx.reply("User not found");
  }

  const topic = await ctx.database.Topics.findOne({
    bot: ctx.session.bot,
    user: user,
  });

  if (!topic) {
    return ctx.reply("Topic not found");
  }

  topic.is_blocked = true;

  await topic.save();

  await ctx.answerCallbackQuery("User banned");

  return ctx.reply(
    `User banned by <a href="tg://user?id=${ctx.from.id}">${ctx.from.first_name}</a>`,
    {
      message_thread_id: topic.thread_id,
    }
  );
}

async function setup(bot: Bot<MyContext>) {
  bot.callbackQuery(/ban:(\d+)/, banUser);
}

export default { setup };
