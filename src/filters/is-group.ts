import { Chat } from "@grammyjs/types"
import { MyContext } from "../types"

export const isGroup = (
  ctx: MyContext
): ctx is MyContext & { chat: Chat.GroupChat | Chat.SupergroupChat } => {
  return ctx.chat?.type === "group" || ctx.chat?.type === "supergroup"
}
