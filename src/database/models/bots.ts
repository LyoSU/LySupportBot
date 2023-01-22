import { prop, getModelForClass } from "@typegoose/typegoose";

export class Bot {
  @prop({ required: true, unique: true, index: true })
  public telegram_id!: number;

  @prop()
  public username?: string;

  @prop()
  public name?: string;

  @prop()
  public token?: string;

  @prop()
  public chat_id?: number;

  @prop()
  public is_active?: boolean;

  @prop()
  public settings?: any;
}

export const Bots = getModelForClass(Bot, {
  schemaOptions: {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
});
