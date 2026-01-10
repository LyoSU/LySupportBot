import { prop, getModelForClass, Ref, index } from "@typegoose/typegoose";
import { Bot } from "./bots";
import { User } from "./users";

@index({ bot: 1, user: 1 }, { unique: true })
export class Topic {
  @prop({ ref: () => Bot, required: true, index: true })
  public bot!: Ref<Bot>;

  @prop({ required: true, index: true })
  public thread_id!: number;

  @prop({ ref: () => User, required: true, index: true })
  public user!: Ref<User>;

  @prop()
  public pin_message_id?: number;

  @prop({ default: false })
  public is_blocked?: boolean;
}

export const Topics = getModelForClass(Topic, {
  schemaOptions: {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
});
