import { defineAction } from "astro:actions";
import { deleteForm, submitForm, submitFormEdit } from "./form";
import { logout } from "./auth";
import { deleteCampaign, submitCampaignEdit } from "./campaign";
import { deleteProfile, submitProfileEdit } from "./profile";

export const server = {
    submitForm: submitForm,
    submitFormEdit: submitFormEdit,
    submitCampaignEdit: submitCampaignEdit,
    submitProfileEdit: submitProfileEdit,
    deleteForm: deleteForm,
    deleteCampaign: deleteCampaign,
    deleteProfile: deleteProfile,
    logout: logout
};