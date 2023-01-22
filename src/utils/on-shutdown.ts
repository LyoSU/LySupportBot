import { Bot } from "grammy"
import { MyContext } from "../types"
import logger from "./logger"

async function onStutdown(bot: Bot<MyContext>): Promise<void> {
  logger.warn("Stopping bot...")

  await bot.stop()
}

export default onStutdown
