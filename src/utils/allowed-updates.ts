import { Update } from "@grammyjs/types";

/**
 * Allowed updates for webhook configuration
 * Must be in sync with LySupportCreator's newbot.ts ALLOWED_UPDATES
 */
const allowedUpdates: ReadonlyArray<Exclude<keyof Update, "update_id">> = [
  "message",
  "edited_message",
  "channel_post",
  "edited_channel_post",
  "business_connection",
  "business_message",
  "edited_business_message",
  "deleted_business_messages",
  "message_reaction",
  "message_reaction_count",
  "inline_query",
  "chosen_inline_result",
  "callback_query",
  "shipping_query",
  "pre_checkout_query",
  "poll",
  "poll_answer",
  "my_chat_member",
  "chat_member",
  "chat_join_request",
  "chat_boost",
  "removed_chat_boost",
  "purchased_paid_media",
];

export default allowedUpdates;
