import { prop, getModelForClass } from "@typegoose/typegoose";

export class Message {
  @prop({ required: true, index: true })
  public from: {
    chat_id: number;
    message_id: number;
  };

  @prop({ required: true, index: true })
  public to: {
    chat_id: number;
    message_id: number;
  };
}
export const Messages = getModelForClass(Message);
