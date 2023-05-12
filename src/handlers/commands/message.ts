import { Bot } from "grammy";
import { Chat } from "@grammyjs/types";
import { MyContext } from "../../types";
import { isGroup, isPrivate } from "../../filters/";
import db from "../../database/models";
import { isDocument } from "@typegoose/typegoose";
import { OpenAIApi, Configuration } from "openai";

const openaiConfiguration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openaiConfiguration);

async function importanceRatingAI(text: string, retries = 0) {
  if (retries > 3) {
    return {
      ok: false,
      error: "OpenAI error",
    };
  }

  const aiResponse = await openai
    .createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            'You are a support agent. You need to determine the importance and category for the question the user is asking. Rate the importance as low, medium, high. The category can be one of: question, problem, other. need_more_details: true - when the user has not described their problem or question. Your answer should only be in this format, all fields must be present: {"ok":true,"importance": "medium", "category": "question", "need_more_details": false } and nothing else write. you must not write in plain text under any circumstances',
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_tokens: 128,
      presence_penalty: 0,
      frequency_penalty: 0,
      temperature: 0,
      top_p: 0,
    })
    .catch((err) => {
      console.error("OpenAI error:", err?.response?.statusText || err.message);
    });

  // retry if failed
  if (
    !aiResponse ||
    !aiResponse.data ||
    !aiResponse.data.choices ||
    !aiResponse.data.choices[0]
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * (retries * 2)));
    return importanceRatingAI(text, retries + 1);
  }

  const aiResponseText = aiResponse.data.choices[0].message.content;

  if (!aiResponseText) {
    return importanceRatingAI(text, retries + 1);
  }

  let aiResponseJson: { ok: any; importance: any; category: any };
  try {
    aiResponseJson = JSON.parse(aiResponseText.match(/{.*}/)?.[0] || "");
  } catch (err) {
    return importanceRatingAI(text, retries + 1);
  }

  if (
    !aiResponseJson ||
    !aiResponseJson.ok ||
    !aiResponseJson.importance ||
    !aiResponseJson.category
  ) {
    return importanceRatingAI(text, retries + 1);
  }

  return aiResponseJson;
}

function escapeHtml(s: string) {
  s = s.replace(/&/g, "&amp;");
  s = s.replace(/</g, "&lt;");
  s = s.replace(/>/g, "&gt;");
  s = s.replace(/"/g, "&quot;");
  s = s.replace(/\'/g, "&#x27;");
  return s;
}

const topicIconColors = [
  7322096, 16766590, 13338331, 9367192, 16749490, 16478047,
] as const;

async function createTopic(ctx: MyContext) {
  const chatId = ctx.session.bot?.chat_id;

  let name = ctx.from.last_name
    ? ctx.from.first_name + " " + ctx.from.last_name
    : ctx.from.first_name;

  name = escapeHtml(name);

  let topicTitle = name;
  const iconColor = topicIconColors[ctx.from.id % topicIconColors.length];

  let aiRating = "" as string;

  if (ctx.session.bot.settings.ai) {
    const aiResponse = await importanceRatingAI(
      ctx?.message?.text || ctx?.message?.caption || "[no text]"
    ).catch((err) => {
      console.error("OpenAI error:", err?.response?.statusText || err.message);
    });

    if (aiResponse?.ok) {
      aiRating = `\n<b>🤖 AI rating:</b> ${aiResponse.importance} (${aiResponse.category})`;

      if (aiResponse.importance === "medium") {
        topicTitle = `🔸 ${topicTitle}`;
      } else if (aiResponse.importance === "high") {
        topicTitle = `🔺 ${topicTitle}`;
      }

      if (aiResponse.need_more_details) {
        await ctx.reply(ctx.t("need_more_details"));
      }
    } else {
      aiRating = `\n<b>🤖 AI rating:</b> ${aiResponse?.error || "error"}`;
    }
  }

  const telegramTopic = await ctx.api
    .createForumTopic(chatId, topicTitle, {
      icon_color: iconColor,
    })
    .catch((error) => {
      if (error.description.includes("not enough rights")) {
        ctx.api.sendMessage(chatId, ctx.t("not_enough_rights"));
      }

      throw new Error(error);
    });

  if (telegramTopic instanceof Error) {
    return;
  }

  const chat = await ctx.api.getChat(ctx.from.id);

  const openChatText =
    chat.type === "private" && chat.has_private_forwards
      ? ""
      : ` [<a href="tg://user?id=${ctx.from.id}">open chat</a>]`;

  const usernameText = ctx.from.username ? ` (@${ctx.from?.username})` : "";

  const bio =
    chat.type === "private" && chat.bio
      ? `\n\n<b>📝 bio:</b>\n${escapeHtml(chat.bio)}`
      : "";

  const mainMessage = await ctx.api.sendMessage(
    chatId,
    `
🧑 <code>${name}</code>${usernameText}<i></i>

🆔 <code>${ctx.from.id}</code>${openChatText}${bio}

<b>🌐 language_code:</b> ${ctx.from.language_code}
${aiRating}
    `,
    {
      message_thread_id: telegramTopic.message_thread_id,
      disable_web_page_preview: true,
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

  await db.Topics.deleteMany({
    bot: ctx.session.bot,
    user: ctx.session.user,
  });

  return db.Topics.create({
    bot: ctx.session.bot,
    thread_id: telegramTopic.message_thread_id,
    user: ctx.session.user,
    pin_message_id: mainMessage.message_id,
  });
}

async function anyPrivateMessage(ctx: MyContext & { chat: Chat.PrivateChat }) {
  const chatId = ctx.session.bot?.chat_id;

  if (!chatId) {
    return ctx.reply(ctx.t("not_configured"));
  }

  let topic = await db.Topics.findOne({
    bot: ctx.session.bot,
    user: ctx.session.user,
  });

  if (!topic) {
    topic = await createTopic(ctx);
  }

  if (topic.is_blocked) {
    return ctx.reply("You are banned");
  }

  if (ctx.session.state.blocksChain && ctx.session.state.blocksChain.length) {
    const blocks = ctx.session.state.blocksChain;

    let blockChain = [];

    for (const id of blocks) {
      const block = await db.Blocks.findById(id);

      if (block) {
        blockChain.push(block.name);
      }
    }

    let messageText = ctx.t("blocked_chain", {
      chain: blockChain.join(" -> "),
    });

    if (ctx.session.bot.settings.ai) {
      const aiResponse = await importanceRatingAI(
        ctx?.message?.text || ctx?.message?.caption || "[no text]"
      ).catch((err) => {
        console.error(
          "OpenAI error:",
          err?.response?.statusText || err.message
        );
      });

      if (aiResponse?.ok) {
        messageText += `\n\n<b>🤖 AI rating:</b> ${aiResponse.importance} (${aiResponse.category})`;
      }
    }

    await ctx.api
      .sendMessage(chatId, messageText, {
        message_thread_id: topic.thread_id,
      })
      .catch(() => {})
      .finally(() => {
        ctx.session.state.blocksChain = [];
      });
  }

  let sendMethod = "copyMessage";

  if (ctx.message.forward_from) {
    sendMethod = "forwardMessage";
  }

  let replyTo = null;

  if (ctx.message.reply_to_message) {
    const type = ctx.message.reply_to_message.from.is_bot ? "to" : "from";

    const find = {
      [type]: {
        chat_id: ctx.chat.id,
        message_id: ctx.message.reply_to_message.message_id,
      },
    };

    const message = await db.Messages.findOne(find);

    if (message) {
      replyTo = message[type === "to" ? "from" : "to"].message_id;
    }
  }

  const result = await ctx.api[sendMethod](
    chatId,
    ctx.chat.id,
    ctx.message.message_id,
    {
      message_thread_id: topic.thread_id,
      reply_to_message_id: replyTo,
      allow_sending_without_reply: true,
    }
  ).catch(async (error) => {
    if (error.description.includes("thread not found")) {
      topic = await createTopic(ctx);

      return ctx.api[sendMethod](chatId, ctx.chat.id, ctx.message.message_id, {
        message_thread_id: topic.thread_id,
      });
    }

    throw new Error(error);
  });

  db.Messages.create({
    from: {
      chat_id: ctx.chat.id,
      message_id: ctx.message.message_id,
    },
    to: {
      chat_id: chatId,
      message_id: result.message_id,
    },
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
  const topic = await db.Topics.findOne({
    bot: ctx.session.bot,
    thread_id: ctx.message.message_thread_id,
  }).populate("user");

  if (!isDocument(topic) || !isDocument(topic.user)) {
    return;
  }

  if (ctx.message?.text?.startsWith("/")) {
    return ctx.reply(ctx.t("unknown_command"), {
      reply_to_message_id: ctx.message.message_id,
    });
  }

  let replyTo = null;

  if (ctx.message.reply_to_message) {
    const type = ctx.message.reply_to_message.from.is_bot ? "to" : "from";

    const find = {
      [type]: {
        chat_id: ctx.chat.id,
        message_id: ctx.message.reply_to_message.message_id,
      },
    };

    const message = await db.Messages.findOne(find);

    if (message) {
      replyTo = message[type === "to" ? "from" : "to"].message_id;
    }
  }

  const resultCopy = await ctx.api
    .copyMessage(topic.user.telegram_id, ctx.chat.id, ctx.message.message_id, {
      reply_to_message_id: replyTo,
      allow_sending_without_reply: true,
    })
    .catch(async (error) => {
      if (error.description.includes("blocked")) {
        return ctx.reply("User blocked the bot", {
          message_thread_id: ctx.message.message_thread_id,
        });
      } else if (error.description.includes("can't be copied")) {
        return;
      }

      throw new Error(error);
    });

  if (!resultCopy) {
    return ctx.reply("🚫 This message cannot be sent", {
      reply_to_message_id: ctx.message.message_id,
    });
  }

  await db.Messages.create({
    from: {
      chat_id: ctx.chat.id,
      message_id: ctx.message.message_id,
    },
    to: {
      chat_id: topic.user.telegram_id,
      message_id: resultCopy.message_id,
    },
  });

  return;
}

async function editMessage(ctx: MyContext) {
  const find = {
    from: {
      chat_id: ctx.editedMessage.chat.id,
      message_id: ctx.editedMessage.message_id,
    },
  };

  const message = await db.Messages.findOne(find);

  if (!message) {
    return ctx.reply(
      "🚫 Edit message not supported yet, send a new message instead",
      {
        reply_to_message_id: ctx.editedMessage.message_id,
      }
    );
  }

  if (ctx.editedMessage.text) {
    await ctx.api.editMessageText(
      message.to.chat_id,
      message.to.message_id,
      ctx.editedMessage.text,
      {
        entities: ctx.editedMessage.entities,
        parse_mode: null,
      }
    );
  } else {
    let type: "animation" | "document" | "audio" | "photo" | "video";

    if (ctx.editedMessage.animation) {
      type = "animation";
    } else if (ctx.editedMessage.document) {
      type = "document";
    } else if (ctx.editedMessage.audio) {
      type = "audio";
    } else if (ctx.editedMessage.photo) {
      type = "photo";
    } else if (ctx.editedMessage.video) {
      type = "video";
    } else {
      return ctx.reply(
        "🚫 Edit message not supported yet, send a new message instead",
        {
          reply_to_message_id: ctx.editedMessage.message_id,
        }
      );
    }

    let media: string;

    if (type === "photo") {
      media = ctx.editedMessage.photo[0].file_id;
    } else {
      media = ctx.editedMessage[type].file_id;
    }

    await ctx.api.editMessageMedia(message.to.chat_id, message.to.message_id, {
      type,
      media,
      caption: ctx.editedMessage.caption,
      parse_mode: null,
      caption_entities: ctx.editedMessage.caption_entities,
    });
  }
}

async function setup(bot: Bot<MyContext>) {
  bot.on("channel_post", (ctx) => {
    return ctx.leaveChat();
  });

  bot.filter(isPrivate).on("message", anyPrivateMessage);
  bot.filter(isGroup).on("message", anyGroupMessage);
  bot.on("edited_message", editMessage);
}

export default { setup };
