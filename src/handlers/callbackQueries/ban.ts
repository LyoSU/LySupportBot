import { Bot } from "grammy";
import { MyContext } from "../../types";
import db from "../../database/models";

function escapeHtml(s: string) {
  s = s.replace(/&/g, "&amp;");
  s = s.replace(/</g, "&lt;");
  s = s.replace(/>/g, "&gt;");
  s = s.replace(/"/g, "&quot;");
  s = s.replace(/\'/g, "&#x27;");
  return s;
}

async function banUser(ctx: MyContext) {
  let topic

  if (ctx.match) {
    const user = await db.Users.findOne({ telegram_id: ctx.match[1] });

    if (!user) {
      return ctx.reply("User not found");
    }

    topic = await db.Topics.findOne({
      bot: ctx.session.bot,
      user: user,
    }).populate("user");
  } else if (ctx.message) {
    topic = await db.Topics.findOne({
      bot: ctx.session.bot,
      thread_id: ctx.message.message_thread_id,
    }).populate("user");
  }

  if (!topic) {
    return ctx.reply("Topic not found");
  }

  topic.is_blocked = true;

  await topic.save();

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery("User banned");

    await ctx.editMessageReplyMarkup({
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔓 Unban",
              callback_data: `unban:${ctx.match[1]}`,
            },
          ],
        ],
      },
    });

  }

  return ctx.reply(
    `User banned by <a href="tg://user?id=${ctx.from.id}">${escapeHtml(
      ctx.from.first_name
    )}</a>`,
    {
      message_thread_id: topic.thread_id,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔓 Unban",
              callback_data: `unban:${topic.user.telegram_id}`,
            },
          ],
        ],
      },
    }
  );
}

async function unbanUser(ctx: MyContext) {
  const user = await db.Users.findOne({ telegram_id: ctx.match[1] });

  if (!user) {
    return ctx.reply("User not found");
  }

  const topic = await db.Topics.findOne({
    bot: ctx.session.bot,
    user: user,
  });

  if (!topic) {
    return ctx.reply("Topic not found");
  }

  topic.is_blocked = false;

  await topic.save();

  await ctx.answerCallbackQuery("User unbanned");

  await ctx.editMessageReplyMarkup({
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚫 Ban",
            callback_data: `ban:${ctx.match[1]}`,
          },
        ],
      ],
    },
  });

  return ctx.reply(
    `User unbanned by <a href="tg://user?id=${ctx.from.id}">${escapeHtml(
      ctx.from.first_name
    )}</a>`,
    {
      message_thread_id: topic.thread_id,
    }
  );
}

async function setup(bot: Bot<MyContext>) {
  bot.callbackQuery(/^ban:(\d+)/, banUser);
  bot.callbackQuery(/^unban:(\d+)/, unbanUser);
  bot.command("ban", banUser);
  bot.command("unban", unbanUser);
}

export default { setup };
