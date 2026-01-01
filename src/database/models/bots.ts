import { prop, getModelForClass, Ref } from "@typegoose/typegoose";
import { User } from "./users";

export class Bot {
  @prop({ required: true, unique: true, index: true })
  public telegram_id!: number;

  @prop()
  public username?: string;

  @prop()
  public name?: string;

  @prop()
  public token?: string;

  @prop({ ref: () => User, required: true, index: true })
  public owner: Ref<User>;

  @prop()
  public chat_id?: number;

  @prop()
  public is_active?: boolean;

  @prop()
  public settings?: any;

  @prop()
  public last_activity_at?: Date;
}

export const Bots = getModelForClass(Bot, {
  schemaOptions: {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
});
