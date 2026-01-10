import { prop, getModelForClass, Ref } from "@typegoose/typegoose";
import { Bot } from "./bots";
import { User } from "./users";

class BlockKeyboard {
  @prop({ required: true })
  public name!: string;

  @prop()
  public url?: string;

  @prop({ ref: () => Block })
  public block?: Ref<Block>;
}

class BlockMessage {
  @prop({ required: true })
  public type!: string;

  @prop({ required: true })
  public data!: unknown;

  @prop()
  public preview?: string;

  @prop()
  public keyboard_type?: string;

  @prop()
  public keyboard?: BlockKeyboard[][];
}

export class Block {
  @prop({ ref: () => Bot, required: true, index: true })
  public bot!: Ref<Bot>;

  @prop({ ref: () => User, required: true, index: true })
  public creator!: Ref<User>;

  @prop({ required: true, index: true })
  public name!: string;

  @prop({ index: true })
  public link?: string;

  @prop({ required: true })
  public message!: BlockMessage;

  @prop({ ref: () => Block, index: true })
  public blocks?: Ref<Block>[];
}

export const Blocks = getModelForClass(Block, {
  schemaOptions: {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
});
