import { Bot, Keyboard, NextFunction } from "grammy";
import { MyContext } from "../../types";
import { isPrivate } from "../../filters/";
import db from "../../database/models";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendBlock(ctx: MyContext, block: any) {
  ctx.session.state.blocksChain ??= [];
  ctx.session.state.blocksChain.push(block._id);

  ctx.session.state.lastBlock = block._id;

  let replyMarkup = null;

  if (block.message.keyboard.length > 0) {
    const keyboard = new Keyboard();

    for (const row of block.message.keyboard) {
      keyboard.row();

      for (const button of row) {
        keyboard.add(button.name);
      }
    }

    replyMarkup = keyboard.oneTime().resized();
  } else {
    ctx.session.state.contactData = new Date();

    const keyboard = new Keyboard()
      .add(ctx.t("contact_button"))
      .row()
      .add(ctx.t("block_back_button"));

    replyMarkup = keyboard.oneTime().resized();
  }

  if (block.message.type === "text") {
    await ctx.reply(block.message.data.text, {
      parse_mode: undefined,
      entities: block.message.data.entities,
      reply_markup: replyMarkup ? replyMarkup : { remove_keyboard: true },
    });
  } else if (block.message.type === "photo") {
    await ctx.replyWithPhoto(block.message.data.media, {
      parse_mode: undefined,
      caption: block.message.data.caption,
      caption_entities: block.message.data.caption_entities,
      reply_markup: replyMarkup ? replyMarkup : { remove_keyboard: true },
    });
  } else {
    await ctx.replyWithDocument(block.message.data.media, {
      parse_mode: undefined,
      caption: block.message.data.caption,
      caption_entities: block.message.data.caption_entities,
      reply_markup: replyMarkup ? replyMarkup : { remove_keyboard: true },
    });
  }
}

async function conversationBlock(ctx: MyContext, next: NextFunction) {
  if (ctx.session.state.contactData) {
    return next();
  }

  const bot = await db.Bots.findOne({ telegram_id: ctx.me.id });

  let block = null;

  if (ctx.session.state.lastBlock) {
    const lastBlock = await db.Blocks.findById(ctx.session.state.lastBlock);

    if (lastBlock) {
      for (const row of lastBlock.message.keyboard ?? []) {
        for (const button of row) {
          if (button.name === ctx.message?.text) {
            block = await db.Blocks.findById(button.block);
          }
        }
      }
    }
  }

  if (!block) {
    if (!bot?.settings?.mainBlock) {
      return next();
    }

    block = await db.Blocks.findById(bot.settings.mainBlock);

    if (!block) {
      return next();
    }
  }

  return sendBlock(ctx, block);
}

async function contactButton(ctx: MyContext) {
  ctx.session.state.contactData = new Date();

  await ctx.reply(ctx.t("send_message"), {
    reply_markup: {
      remove_keyboard: true,
    },
  });
}

async function backBlock(ctx: MyContext) {
  const bot = await db.Bots.findOne({ telegram_id: ctx.me.id });

  const block = await db.Blocks.findById(bot?.settings?.mainBlock);

  if (!block) {
    return;
  }

  ctx.session.state.contactData = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx.session.state.lastBlock = block._id as any;

  return sendBlock(ctx, block);
}

async function setup(bot: Bot<MyContext>) {
  bot
    .filter(isPrivate)
    .filter((ctx) => ctx.message?.text === ctx.t("contact_button"))
    .use(contactButton);

  bot
    .filter(isPrivate)
    .filter((ctx) => ctx.message?.text === ctx.t("block_back_button"))
    .use(backBlock);

  bot.filter(isPrivate).use(conversationBlock);
}

export default { setup };
