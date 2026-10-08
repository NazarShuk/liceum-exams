import { defineAction } from "astro:actions";
import { submitForm, submitFormEdit } from "./form";
import { logout } from "./auth";
import { submitCampaignEdit } from "./campaign";

export const server = {
    submitForm: submitForm,
    submitFormEdit: submitFormEdit,
    submitCampaignEdit: submitCampaignEdit,
    logout: logout
}