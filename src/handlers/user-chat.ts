import { Bot, NextFunction } from "grammy";
import { Chat } from "@grammyjs/types";
import { MyContext } from "../types";
import { isPrivate } from "../filters/";

async function userChat(ctx: MyContext & { chat: Chat.PrivateChat }) {
  const topic = await ctx.database.Topics.findOne({
    bot: ctx.session.bot,
    user: ctx.session.user,
  }).populate("bot");

  if (!topic) {
    return;
  }

  const forumTopicIconStickers = await ctx.api.getForumTopicIconStickers();

  const emoji =
    ctx.myChatMember.new_chat_member?.status === "member" ? "" : "☕️";

  const stickerEmoji = forumTopicIconStickers.find((sticker) => {
    return sticker.emoji === emoji;
  });

  await ctx.api
    .editForumTopic(topic.bot.chat_id, topic.thread_id, {
      icon_custom_emoji_id: stickerEmoji ? stickerEmoji.custom_emoji_id : "",
    })
    .catch(console.error);
}

async function deleteSystemMessages(ctx: MyContext, next: NextFunction) {
  if (ctx.message?.from?.is_bot && ctx.message?.forum_topic_edited) {
    await ctx.deleteMessage();
  }

  return next();
}

async function setup(bot: Bot<MyContext>) {
  bot.filter(isPrivate).on("my_chat_member", userChat);
  bot.use(deleteSystemMessages);
}

export default { setup };
