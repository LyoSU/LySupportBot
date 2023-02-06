import { Context as BaseContext, Api, SessionFlavor } from "grammy";
import { HydrateFlavor, HydrateApiFlavor } from "@grammyjs/hydrate";
import { FluentContextFlavor } from "@grammyjs/fluent";
import { type ConversationFlavor } from "@grammyjs/conversations";
import mongoose from "mongoose";

interface SessionData {
  user: any;
  bot: any;
  state: { [key: string]: any };
  data: any;
  conversation: { [key: string]: any } | {};
}

interface DatabaseFlavor {
  database: { [key: string]: mongoose.Model<any, any> };
}

type MyContext = BaseContext &
  HydrateFlavor<BaseContext> &
  SessionFlavor<SessionData> &
  FluentContextFlavor &
  ConversationFlavor &
  DatabaseFlavor;
type MyApi = HydrateApiFlavor<Api>;

export { MyContext, MyApi, SessionData };
