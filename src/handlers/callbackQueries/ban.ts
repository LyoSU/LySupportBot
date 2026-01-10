import { Bot } from "grammy";
import { MyContext } from "../../types";
import db from "../../database/models";
import { escapeHtml } from "../../utils";

/**
 * Checks if the current user is an admin or creator of the chat where the action is being performed.
 * Also verifies the action is happening in the correct admin group (ctx.session.bot.chat_id).
 */
async function isGroupAdmin(ctx: MyContext): Promise<boolean> {
  if (!ctx.from || !ctx.chat || !ctx.session.bot) return false;

  // Verify the callback/command is coming from the correct admin group
  if (ctx.chat.id !== ctx.session.bot.chat_id) {
    return false;
  }

  try {
    const member = await ctx.getChatMember(ctx.from.id);
    return ["creator", "administrator"].includes(member.status);
  } catch {
    return false;
  }
}

async function banUser(ctx: MyContext) {
  if (!ctx.session.bot || !ctx.from) {
    return;
  }

  // Authorization check: verify user is an admin of the support group
  if (!(await isGroupAdmin(ctx))) {
    if (ctx.callbackQuery) {
      return ctx.answerCallbackQuery("You must be an admin to ban users");
    }
    return ctx.reply("You must be an admin of the support group to ban users");
  }

  let topic: any;

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
      thread_id: ctx.message?.message_thread_id,
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
              callback_data: `unban:${ctx.match![1]}`,
            },
          ],
        ],
      },
    });
  }

  return ctx.reply(
    `User banned by <a href="tg://user?id=${ctx.from.id}">${escapeHtml(
      ctx.from.first_name,
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
    },
  );
}

async function unbanUser(ctx: MyContext) {
  if (!ctx.session.bot || !ctx.from || !ctx.match) {
    return;
  }

  // Authorization check: verify user is an admin of the support group
  if (!(await isGroupAdmin(ctx))) {
    if (ctx.callbackQuery) {
      return ctx.answerCallbackQuery("You must be an admin to unban users");
    }
    return ctx.reply(
      "You must be an admin of the support group to unban users",
    );
  }

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
      ctx.from.first_name,
    )}</a>`,
    {
      message_thread_id: topic.thread_id,
    },
  );
}

async function setup(bot: Bot<MyContext>) {
  bot.callbackQuery(/^ban:(\d+)/, banUser);
  bot.callbackQuery(/^unban:(\d+)/, unbanUser);
  // Filter commands to only work in the admin group (ctx.session.bot.chat_id)
  bot.command("ban", (ctx, next) => {
    if (ctx.session.bot && ctx.chat?.id === ctx.session.bot.chat_id) {
      return banUser(ctx);
    }
    return next();
  });
  bot.command("unban", (ctx, next) => {
    if (ctx.session.bot && ctx.chat?.id === ctx.session.bot.chat_id) {
      return unbanUser(ctx);
    }
    return next();
  });
}

export default { setup };
