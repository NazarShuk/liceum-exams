import { en } from "./messages/en";
import { uk } from "./messages/uk";
import { type Locale, localeTag } from "./config";

export type MessageKey = keyof typeof uk;

const dictionaries: Record<Locale, Record<MessageKey, string>> = { uk, en };

/** Passes `{name}` placeholders from the dictionary into the translated string. */
export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
    const template = dictionaries[locale]?.[key] ?? uk[key] ?? key;
    if (!params) return template;

    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        Object.hasOwn(params, name) ? String(params[name]) : match,
    );
}

export type Translator = (key: MessageKey, params?: Record<string, string | number>) => string;

export function useTranslations(locale: Locale): Translator {
    return (key, params) => translate(locale, key, params);
}

export type PluralForms = Record<"one" | "few" | "many" | "other", string>;

const pluralRules = new Map<Locale, Intl.PluralRules>();

function pluralCategory(locale: Locale, count: number): keyof PluralForms {
    let rules = pluralRules.get(locale);
    if (!rules) {
        rules = new Intl.PluralRules(localeTag(locale));
        pluralRules.set(locale, rules);
    }
    const category = rules.select(count);
    return category === "zero" ? "other" : (category as keyof PluralForms);
}

/**
 * Translates a count with plural forms stored next to each other, e.g.
 * `profiles.one`, `profiles.few`, `profiles.many`, `profiles.other`.
 */
export function translatePlural(
    locale: Locale,
    count: number,
    prefix: string,
    params?: Record<string, string | number>,
): string {
    const category = pluralCategory(locale, count);
    const key = `${prefix}.${category}` as MessageKey;
    const fallback = `${prefix}.other` as MessageKey;
    return translate(locale, key in uk ? key : fallback, { count, ...params });
}

export function usePlural(locale: Locale) {
    return (count: number, prefix: string, params?: Record<string, string | number>) =>
        translatePlural(locale, count, prefix, params);
}

/**
 * Action input schemas are defined at module load, so their validation messages
 * use translation keys. Resolve those keys wherever the error is displayed.
 */
export function translateMessage(locale: Locale, message: string | undefined | null): string {
    if (!message) return "";
    if (message in uk) return translate(locale, message as MessageKey);
    return message;
}

export { en, uk };
export type { Locale };
