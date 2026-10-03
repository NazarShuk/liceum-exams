import { defineAction } from "astro:actions";
import { submitForm } from "./form";
import { login, logout} from "./auth";

export const server = {
    submitForm: submitForm,
    login: login,
    logout: logout
}