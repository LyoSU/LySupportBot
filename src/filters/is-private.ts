import { Chat } from "@grammyjs/types"
import { MyContext } from "../types"

export function isPrivate(
  ctx: MyContext
): ctx is MyContext & { chat: Chat.PrivateChat } {
  return ctx.chat?.type === "private"
}
