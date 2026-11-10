import type { Locale } from "./config";
import LiceumLogoUk from "../assets/liceum-logo-uk.svg";
import LiceumLogoEn from "../assets/liceum-logo-en.svg";
import LiceumLogoVstupUk from "../assets/liceum-logo-vstup-uk.svg";
import LiceumLogoVstupEn from "../assets/liceum-logo-vstup-en.svg";

/** Localized brand logos. Replace the SVGs in src/assets with the localized artwork. */
export const liceumLogo: Record<Locale, typeof LiceumLogoUk> = {
    uk: LiceumLogoUk,
    en: LiceumLogoEn,
};

export const liceumLogoVstup: Record<Locale, typeof LiceumLogoVstupUk> = {
    uk: LiceumLogoVstupUk,
    en: LiceumLogoVstupEn,
};
