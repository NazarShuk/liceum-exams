import { defineAction } from "astro:actions";
import { submitForm } from "./form";
import { logout } from "./auth";

export const server = {
    submitForm: submitForm,
    logout: logout
}