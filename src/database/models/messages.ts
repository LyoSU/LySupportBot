import { prop, getModelForClass } from "@typegoose/typegoose";

interface MessageRef {
  chat_id: number;
  message_id: number;
}

export class Message {
  @prop({ required: true, index: true })
  public from!: MessageRef;

  @prop({ required: true, index: true })
  public to!: MessageRef;

  @prop({ default: Date.now, expires: 2592000 }) // 30 days TTL
  public createdAt?: Date;
}

export const Messages = getModelForClass(Message);
