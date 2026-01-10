import { ApiCallFn, Methods, Payload, RawApi } from "grammy/out/core/client";
import { AbortSignal } from "grammy/out/shim.node";
import { ApiResponse } from "@grammyjs/types";
import { logger } from "../utils";

async function loggingApiCalls(
  prev: ApiCallFn,
  method: Methods<RawApi>,
  payload: Payload<Methods<RawApi>, RawApi>,
  signal?: AbortSignal,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ApiResponse<any>> {
  logger.debug(`Called ${method} with payload ${JSON.stringify(payload)}`);
  return prev(method, payload, signal);
}

export default loggingApiCalls;
