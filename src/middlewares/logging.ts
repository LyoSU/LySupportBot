import { NextFunction } from "grammy"
import { MyContext } from "../types"
import { logger } from "../utils"

async function logging(ctx: MyContext, next: NextFunction) {
  logger.debug(`Received update [ID:${ctx.update.update_id}]`)

  const _start = Date.now() // milliseconds
  ctx["_start"] = _start

  if (!!ctx?.message) {
    if (!!ctx.message.migrate_to_chat_id) {
      await onChatMigration(ctx)
    } else {
      await onMessage(ctx)
    }
  } else if (!!ctx?.callbackQuery) {
    await onCallbackQuery(ctx)
  } else if (!!ctx?.inlineQuery) {
    await onInlineQuery(ctx)
  } else if (!!ctx?.chosenInlineResult) {
    await onChosenInlineQuery(ctx)
  }

  await next() // make sure to `await`!

  const timeout = Date.now() - _start // milliseconds
  logger.debug(
    `Process update [ID:${ctx.update.update_id}]: [success] (in ${timeout} ms)`
  )
}

async function onMessage(ctx: MyContext) {
  logger.debug(
    `Received message [ID:${ctx.message.message_id}] in chat [${ctx.chat.type}:${ctx.chat.id}]
from user [ID:${ctx.from.id}]`
  )
}

async function onCallbackQuery(ctx: MyContext) {
  logger.debug(
    `Received callback query [ID:${ctx.callbackQuery.id}]
from user [ID:${ctx.from.id}]
for message [ID:${ctx.callbackQuery.message.message_id}]
in chat [${ctx.chat.type}:${ctx.chat.id}]
with data: ${ctx.callbackQuery.data})`
  )
}

async function onInlineQuery(ctx: MyContext) {
  logger.debug(
    `Received inline query [ID:${ctx.inlineQuery.id}]
from user [ID:${ctx.from.id}]`
  )
}

async function onChosenInlineQuery(ctx: MyContext) {
  logger.debug(
    `Received chosen inline result [Inline msg ID:${ctx.chosenInlineResult.inline_message_id}]
from user [ID:${ctx.from.id}]
result [ID:${ctx.chosenInlineResult.result_id}]`
  )
}

async function onChatMigration(ctx: MyContext) {
  logger.debug(
    `Recieved chat migration update
old chat id: ${ctx.chat.id}
new chat id: ${ctx.message.migrate_to_chat_id}`
  )
}

export default logging
