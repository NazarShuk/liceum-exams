import type { Locale } from "@i18n/config";
import { translate } from "@i18n/index";

export function getContacts(locale: Locale) {
    return [
        {
            icon: "location_on",
            label: translate(locale, "contacts.address"),
            value: translate(locale, "contacts.addressValue"),
            href: null,
        },
        {
            icon: "mail",
            label: translate(locale, "contacts.email"),
            value: "liceum@ztu.edu.ua",
            href: "mailto:liceum@ztu.edu.ua",
        },
        {
            icon: "call",
            label: translate(locale, "contacts.phone"),
            value: "+380509856415",
            href: "tel:+380509856415",
        },
        {
            icon: "account_circle",
            label: translate(locale, "contacts.director"),
            value: translate(locale, "contacts.directorValue"),
            href: null,
        },
    ];
}
