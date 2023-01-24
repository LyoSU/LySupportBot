import { NextFunction } from "grammy";
import { MyContext } from "../types";
import models from "./models";

function middleware(ctx: MyContext, next: NextFunction) {
  ctx.database = {
    Users: models.Users,
    Topics: models.Topics,
    Messages: models.Messages,
  };

  return next();
}

export default { middleware };
