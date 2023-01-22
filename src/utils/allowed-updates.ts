import { Update } from "@grammyjs/types"

const allowedUpdates: ReadonlyArray<Exclude<keyof Update, "update_id">> = [
  "message",
  "inline_query",
  "chosen_inline_result",
  "callback_query",
  "shipping_query",
  "pre_checkout_query",
  "my_chat_member",
  "chat_member",
]

export default allowedUpdates
