import { defineAction } from "astro:actions";
import { submitForm, submitFormEdit } from "./form";
import { logout } from "./auth";

export const server = {
    submitForm: submitForm,
    submitFormEdit: submitFormEdit,
    logout: logout
}