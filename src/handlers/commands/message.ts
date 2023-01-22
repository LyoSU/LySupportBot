import { Bot } from "grammy";
import { Chat } from "@grammyjs/types";
import { MyContext } from "../../types";
import { isGroup, isPrivate } from "../../filters/";

async function createTopic(ctx: MyContext) {
  const chatId = ctx.session.bot?.chat_id;

  const name = ctx.from.last_name
    ? ctx.from.first_name + " " + ctx.from.last_name
    : ctx.from.first_name;

  const telegramTopic = await ctx.api
    .createForumTopic(chatId, name)
    .catch((error) => {
      if (error.description.includes("not enough rights")) {
        ctx.api.sendMessage(chatId, ctx.t("not_enough_rights"));
      }

      return error;
    });

  if (telegramTopic instanceof Error) {
    return;
  }

  const mainMessage = await ctx.api.sendMessage(
    chatId,
    `
  <b>🧑 user:</b> <a href="tg://user?id=${ctx.from.id}">${name}</a>

  <b>🌎 language:</b> ${ctx.from.language_code}
    `,
    {
      message_thread_id: telegramTopic.message_thread_id,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚫 Ban",
              callback_data: `ban:${ctx.from.id}`,
            },
          ],
        ],
      },
    }
  );

  await ctx.api.pinChatMessage(chatId, mainMessage.message_id, {
    disable_notification: true,
  });

  await ctx.database.Topics.deleteMany({
    bot: ctx.session.bot,
    user: ctx.session.user,
  });

  return ctx.database.Topics.create({
    bot: ctx.session.bot,
    thread_id: telegramTopic.message_thread_id,
    user: ctx.session.user,
    pin_message_id: mainMessage.message_id,
  });
}

async function anyPrivateMessage(ctx: MyContext & { chat: Chat.PrivateChat }) {
  const chatId = ctx.session.bot?.chat_id;

  if (!chatId) {
    return ctx.reply("Chat not configured");
  }

  let topic = await ctx.database.Topics.findOne({
    bot: ctx.session.bot,
    user: ctx.session.user,
  });

  if (!topic) {
    topic = await createTopic(ctx);
  }

  if (topic.is_blocked) {
    return ctx.reply("You are banned");
  }

  await ctx.api
    .copyMessage(chatId, ctx.chat.id, ctx.message.message_id, {
      message_thread_id: topic.thread_id,
    })
    .catch(async (error) => {
      if (error.description.includes("thread not found")) {
        topic = await createTopic(ctx);

        return ctx.api.copyMessage(
          chatId,
          ctx.chat.id,
          ctx.message.message_id,
          {
            message_thread_id: topic.thread_id,
          }
        );
      }

      return error;
    });
}

async function anyGroupMessage(ctx: MyContext & { chat: Chat.GroupChat }) {
  if (
    !ctx.message.is_topic_message ||
    !ctx.message.from ||
    ctx.message.from.is_bot
  ) {
    return;
  }

  const topic = await ctx.database.Topics.findOne({
    bot: ctx.session.bot,
    thread_id: ctx.message.message_thread_id,
  }).populate("user");

  if (!topic) {
    return;
  }

  await ctx.api.copyMessage(
    topic.user.telegram_id,
    ctx.chat.id,
    ctx.message.message_id
  );
}

async function setup(bot: Bot<MyContext>) {
  bot.filter(isPrivate).on("message", anyPrivateMessage);
  bot.filter(isGroup).on("message", anyGroupMessage);
}

export default { setup };
