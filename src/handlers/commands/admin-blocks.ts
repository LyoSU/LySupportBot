import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { MyContext } from "../../types";
import { isGroup } from "../../filters/";
import { type Conversation, createConversation } from "@grammyjs/conversations";
import db from "../../database/models";

async function sendBlock(ctx: MyContext, block: any) {
  const keyboard = new InlineKeyboard();

  for (const row in block.message.keyboard) {
    const buttons = block.message.keyboard[row];

    keyboard.row();

    for (const column in buttons) {
      const button = buttons[column];

      keyboard.add({
        text: button.name,
        callback_data: `block:${button.block}`,
      });
    }
  }

  keyboard
    .row()
    .add({
      text: ctx.t("block_add_button"),
      callback_data: `add_block:${block._id}:-1:-1`,
    })
    .row()
    .add({
      text: ctx.t("block_edit_data_button"),
      callback_data: `edit_block_data:${block._id}`,
    })
    .add({
      text: ctx.t("block_edit_name_button"),
      callback_data: `edit_block_name:${block._id}`,
    })
    .row()
    .add({
      text: ctx.t("block_delete_button"),
      callback_data: `delete_block:${block._id}`,
    });

  if (block.message.type === "text") {
    await ctx.reply(block.message.data.text, {
      parse_mode: undefined,
      entities: block.message.data.entities,
      reply_markup: keyboard,
    });
  } else if (block.message.type === "photo") {
    await ctx.replyWithPhoto(block.message.data.media, {
      parse_mode: undefined,
      caption: block.message.data.caption,
      caption_entities: block.message.data.caption_entities,
      reply_markup: keyboard,
    });
  } else {
    await ctx.replyWithDocument(block.message.data.media, {
      parse_mode: undefined,
      caption: block.message.data.caption,
      caption_entities: block.message.data.caption_entities,
      reply_markup: keyboard,
    });
  }
}

async function mainBlock(ctx: MyContext) {
  if (!ctx.session.bot) {
    return;
  }

  const mainBlock = await db.Blocks.findById(
    ctx.session.bot?.settings?.mainBlock
  );

  if (!mainBlock) {
    const keyboard = new InlineKeyboard();

    keyboard.add({
      text: ctx.t("block_add_button"),
      callback_data: "add_block:main:0:0",
    });

    return ctx.reply(ctx.t("no_blocks"), {
      reply_markup: keyboard,
    });
  }

  return sendBlock(ctx, mainBlock);
}

type MyConversation = Conversation<MyContext, MyContext>;

async function createBlock(conversation: MyConversation, ctx: MyContext) {
  if (!ctx.session.bot || !ctx.from || !ctx.match) {
    return;
  }

  let name = null as string | null;

  if (ctx.match[1] === "main") {
    name = "main";
  } else {
    await ctx.reply(ctx.t("send_block_name"));

    const textCtx = await conversation.waitFor(":text");

    name = textCtx.message?.text ?? null;
  }

  await ctx.reply(ctx.t("send_block_message"));

  let messageCtx = null as any;

  let type: "text" | "animation" | "document" | "audio" | "photo" | "video" | undefined = undefined;

  do {
    messageCtx = await conversation.waitFor("message");

    if (messageCtx.message.text) {
      type = "text";
    } else if (messageCtx.message.animation) {
      type = "animation";
    } else if (messageCtx.message.document) {
      type = "document";
    } else if (messageCtx.message.audio) {
      type = "audio";
    } else if (messageCtx.message.photo) {
      type = "photo";
    } else if (messageCtx.message.video) {
      type = "video";
    } else {
      ctx.reply(ctx.t("type_not_supported"));
    }
  } while (!type);

  const { message } = messageCtx;

  const user = await db.Users.findOne({ telegram_id: ctx.from.id });
  const bot = await db.Bots.findOne({ telegram_id: ctx.me.id });

  if (!bot) {
    return ctx.reply(ctx.t("no_bot"));
  }

  let media = null as string | null;

  if (type === "text") {
    media = null;
  } else if (type === "photo") {
    media = message.photo[0].file_id;
  } else {
    media = message[type].file_id;
  }

  const block = await db.Blocks.create({
    name: name,
    link: null,
    creator: user,
    bot: bot,
    message: {
      type,
      data: {
        text: message?.text,
        media,
        entities: message?.entities,
        caption: message?.caption,
        caption_entities: message?.caption_entities,
      },
    },
  });

  if (ctx.match[1] === "main") {
    bot.settings = {
      ...bot.settings,
      mainBlock: block._id as any,
    };
    await bot.save();
  } else {
    const parentBlock = await db.Blocks.findOne({ _id: ctx.match[1], bot: ctx.session.bot._id });

    if (!parentBlock) {
      return ctx.reply(ctx.t("no_block"));
    }

    parentBlock.message.keyboard?.map((row: any) =>
      row.map((button: any) => {
        console.log(button);
      })
    );

    parentBlock.message.keyboard ??= [];

    let column = parseInt(ctx.match![2]);

    if (column < 0) {
      column = parentBlock.message.keyboard.length;
    }

    (parentBlock.message.keyboard as any[])[column] ??= [];

    let row = parseInt(ctx.match![3]);

    if (row < 0) {
      row = (parentBlock.message.keyboard as any[])[column].length;
    }

    (parentBlock.message.keyboard as any[])[column][row] = {
      name: name,
      block: block._id,
    };

    parentBlock.markModified("message.keyboard");

    (parentBlock.blocks as any[]).push(block._id);

    await parentBlock.save();
  }

  await ctx.reply(ctx.t("block_created"));

  return sendBlock(ctx, block);
}

async function deleteBlockWithChildren(blockId: string, maxDepth = 10): Promise<void> {
  const toDelete: string[] = [blockId];
  const visited = new Set<string>();
  let depth = 0;

  while (toDelete.length > 0 && depth < maxDepth) {
    const currentId = toDelete.shift()!;
    if (visited.has(currentId)) continue; // Circular reference protection
    visited.add(currentId);

    const block = await db.Blocks.findById(currentId);
    if (block) {
      // Add children to queue
      for (const childId of block.blocks || []) {
        if (!visited.has(childId.toString())) {
          toDelete.push(childId.toString());
        }
      }
      await db.Blocks.deleteOne({ _id: block._id });
    }
    depth++;
  }

  if (toDelete.length > 0) {
    console.warn(`Block deletion stopped at depth ${maxDepth}, ${toDelete.length} blocks remaining`);
  }
}

async function deleteBlock(ctx: MyContext) {
  if (!ctx.session.bot || !ctx.match) {
    return;
  }

  const block = await db.Blocks.findOne({ _id: ctx.match[1], bot: ctx.session.bot._id });

  if (!block) {
    return ctx.answerCallbackQuery(ctx.t("no_block"));
  }

  const parentBlock = await db.Blocks.findOne({
    blocks: block._id,
  });

  if (parentBlock) {
    parentBlock.blocks = (parentBlock.blocks as any[]).filter(
      (block: any) => block.toString() !== ctx.match![1]
    );

    let keyboard = parentBlock.message.keyboard as any[] | undefined;

    keyboard = keyboard?.filter((row: any) => {
      return (
        row.filter((button: any) => button.block?.toString() !== ctx.match![1])
          .length > 0
      );
    });

    keyboard = keyboard?.filter((row: any) => row.length > 0);

    parentBlock.message.keyboard = keyboard;

    parentBlock.markModified("message.keyboard");

    await parentBlock.save();

    await deleteBlockWithChildren(block._id.toString());
  }

  await db.Blocks.deleteOne({ _id: ctx.match[1] });

  if (block.name === "main") {
    await db.Bots.updateOne(
      { telegram_id: ctx.me.id },
      {
        $unset: {
          "settings.mainBlock": "",
        },
      }
    );
  }

  await ctx.answerCallbackQuery(ctx.t("block_deleted"));

  await ctx.deleteMessage().catch(() => { });
}

async function editBlockName(conversation: MyConversation, ctx: MyContext) {
  if (!ctx.session.bot || !ctx.match) {
    return;
  }

  // Verify the block belongs to this bot before starting the conversation
  const existingBlock = await db.Blocks.findOne({ _id: ctx.match[1], bot: ctx.session.bot._id });
  if (!existingBlock) {
    return ctx.reply(ctx.t("no_block"));
  }

  await ctx.reply(ctx.t("send_block_name"));

  const textCtx = await conversation.waitFor(":text");
  const message = textCtx.message;

  const block = await db.Blocks.findOne({ _id: ctx.match[1], bot: ctx.session.bot._id });

  if (!block) {
    return ctx.reply(ctx.t("no_block"));
  }

  block.name = message?.text ?? "";

  await block.save();

  const parentBlocks = await db.Blocks.find({
    blocks: block._id,
  });

  for (const parentBlock of parentBlocks) {
    const keyboard = parentBlock.message.keyboard as any[] | undefined;
    if (keyboard) {
      for (let row = 0; row < keyboard.length; row++) {
        for (let column = 0; column < keyboard[row].length; column++) {
          if (
            keyboard[row][column].block?.toString() ===
            ctx.match![1]
          ) {
            keyboard[row][column].name = message?.text ?? "";
          }
        }
      }
    }

    parentBlock.markModified("message.keyboard");

    await parentBlock.save();
  }

  await ctx.reply(ctx.t("block_name_edited"));

  return sendBlock(ctx, block);
}

async function editBlockData(conversation: MyConversation, ctx: MyContext) {
  if (!ctx.session.bot || !ctx.match) {
    return;
  }

  // Verify the block belongs to this bot before starting the conversation
  const existingBlock = await db.Blocks.findOne({ _id: ctx.match[1], bot: ctx.session.bot._id });
  if (!existingBlock) {
    return ctx.reply(ctx.t("no_block"));
  }

  await ctx.reply(ctx.t("send_block_message"));

  let messageCtx = null as any;

  let type: "text" | "animation" | "document" | "audio" | "photo" | "video" | undefined = undefined;

  do {
    messageCtx = await conversation.waitFor("message");

    if (messageCtx.message.text) {
      type = "text";
    } else if (messageCtx.message.animation) {
      type = "animation";
    } else if (messageCtx.message.document) {
      type = "document";
    } else if (messageCtx.message.audio) {
      type = "audio";
    } else if (messageCtx.message.photo) {
      type = "photo";
    } else if (messageCtx.message.video) {
      type = "video";
    } else {
      await ctx.reply(ctx.t("unsupported_media_type"));
    }
  } while (!type);

  const { message } = messageCtx;

  let media = null as string | null;

  if (type === "text") {
    media = null;
  } else if (type === "photo") {
    media = message.photo[0].file_id;
  } else {
    media = message[type].file_id;
  }

  const block = await db.Blocks.findOne({ _id: ctx.match[1], bot: ctx.session.bot._id });

  if (!block) {
    return ctx.reply(ctx.t("no_block"));
  }

  block.message.type = type;
  block.message.data = {
    text: message?.text,
    media,
    entities: message?.entities,
    caption: message?.caption,
    caption_entities: message?.caption_entities,
  };

  await block.save();

  await ctx.reply(ctx.t("block_data_edited"));

  return sendBlock(ctx, block);
}

async function setup(bot: Bot<MyContext>) {
  const groupAdmin = bot.filter(isGroup).filter(async (ctx) => {
    if (!ctx.session.bot || ctx.session.bot.chat_id !== ctx.chat.id) {
      return false;
    }

    // Verify the user is an administrator
    if (!ctx.from) return false;
    try {
      const member = await ctx.getChatMember(ctx.from.id);
      return ['creator', 'administrator'].includes(member.status);
    } catch {
      return false;
    }
  });

  groupAdmin.use(createConversation(createBlock));
  groupAdmin.use(createConversation(editBlockData));
  groupAdmin.use(createConversation(editBlockName));

  groupAdmin.command("blocks", mainBlock);
  groupAdmin.callbackQuery(/^block:([a-f0-9]{24})$/, async (ctx) => {
    const block = await db.Blocks.findOne({ _id: ctx.match![1], bot: ctx.session.bot!._id });

    if (!block) {
      return ctx.answerCallbackQuery(ctx.t("no_block"));
    }

    return sendBlock(ctx, block);
  });
  groupAdmin.callbackQuery(/^delete_block:([a-f0-9]{24})$/, deleteBlock);
  groupAdmin.callbackQuery(
    /^add_block:(main|[a-f0-9]{24}):(-?[0-9]\d*):(-?[0-9]\d*)$/,
    async (ctx) => {
      await ctx.conversation.enter("createBlock");
    }
  );

  groupAdmin.callbackQuery(/^edit_block_data:([a-f0-9]{24})$/, async (ctx) => {
    await ctx.conversation.enter("editBlockData");
  });

  groupAdmin.callbackQuery(/^edit_block_name:([a-f0-9]{24})$/, async (ctx) => {
    await ctx.conversation.enter("editBlockName");
  });
}

export default { setup };
