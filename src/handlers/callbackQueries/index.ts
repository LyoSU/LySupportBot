import { Bot } from "grammy";
import { MyContext } from "../../types";
import { logger } from "../../utils";
import ban from "./ban";

async function setup(bot: Bot<MyContext>) {
  await ban.setup(bot);
}

export default { setup };
