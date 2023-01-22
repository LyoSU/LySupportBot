import { Context as BaseContext, Api, SessionFlavor } from "grammy";
import { HydrateFlavor, HydrateApiFlavor } from "@grammyjs/hydrate";
import { FluentContextFlavor } from "@grammyjs/fluent";
import mongoose from "mongoose";

interface SessionData {
  user: any;
  bot: any;
  state: { [key: string]: any };
  data: any;
}

interface DatabaseFlavor {
  database: { [key: string]: mongoose.Model<any, any> };
}

type MyContext = BaseContext &
  HydrateFlavor<BaseContext> &
  SessionFlavor<SessionData> &
  FluentContextFlavor &
  DatabaseFlavor;
type MyApi = HydrateApiFlavor<Api>;

export { MyContext, MyApi, SessionData };
