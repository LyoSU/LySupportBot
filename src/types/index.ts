import { Context as BaseContext, Api, SessionFlavor } from "grammy";
import { HydrateFlavor, HydrateApiFlavor } from "@grammyjs/hydrate";
import { FluentContextFlavor } from "@grammyjs/fluent";
import { type ConversationFlavor } from "@grammyjs/conversations";
import mongoose from "mongoose";
import { MessageReactionUpdated } from "@grammyjs/types";
import { DocumentType } from "@typegoose/typegoose";
import { User } from "../database/models/users";
import { Bot, BotSettings } from "../database/models/bots";

// Session state interface based on usage in handlers
interface SessionState {
  contactData: Date | null;
  startParam: string | null;
  blocksChain: string[];
  lastBlock: string | null;
}

interface SessionData {
  user: DocumentType<User> | null;
  bot: DocumentType<Bot> | null;
  state: SessionState;
  conversation: Record<string, unknown>;
}

interface DatabaseFlavor {
  database: Record<string, mongoose.Model<unknown>>;
}

interface ReactionContext {
  reaction?: MessageReactionUpdated;
}

type MyContext = BaseContext &
  HydrateFlavor<BaseContext> &
  SessionFlavor<SessionData> &
  FluentContextFlavor &
  ConversationFlavor<BaseContext> &
  DatabaseFlavor &
  ReactionContext;

type MyApi = HydrateApiFlavor<Api>;

export { MyContext, MyApi, SessionData, SessionState, BotSettings };
