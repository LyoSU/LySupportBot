import { transports, format, createLogger, Logger } from "winston";

const logger: Logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transports: [
    new transports.Console({
      format: format.simple(),
    }),
  ],
  exitOnError: true,
});

export default logger;
