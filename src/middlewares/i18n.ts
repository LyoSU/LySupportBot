import fs from "fs";
import { join, resolve } from "path";
import { Context, NextFunction } from "grammy";
import { MyContext } from "../types";
import { Fluent } from "@moebius/fluent";
import {
  useFluent,
  FluentContextFlavor,
  LocaleNegotiator,
} from "@grammyjs/fluent";

const appRoot = join(resolve(__dirname), "..", "..");
const appLocales = join(appRoot, "locales");

const fluent = new Fluent();
export const locales = fs
  .readdirSync(appLocales)
  .map((localeFilename) =>
    localeFilename.substring(0, localeFilename.indexOf(".ftl"))
  );
export const isMultipleLocales = locales.length > 1;

const loadLocales = async () => {
  const results = locales.map((localeCode) => {
    return fluent.addTranslation({
      locales: localeCode,
      filePath: join(appLocales, `${localeCode}.ftl`),
      bundleOptions: {
        useIsolating: false,
      },
    });
  });

  await Promise.all(results);

  return fluent;
};

loadLocales();

const localeNegotiator = (ctx: Context) =>
  // (ctx.chat && ctx.session.languageCode) || ctx.from?.language_code;
  ctx.from?.language_code;

export const i18n = () =>
  useFluent({
    fluent,
    localeNegotiator: localeNegotiator as LocaleNegotiator,
  });
