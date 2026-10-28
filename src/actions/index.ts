import { applicantLink, deleteApplications, deleteDraft, deleteForm, saveDraft, submitForm, submitFormEdit } from "./form";
import { logout } from "./auth";
import { deleteCampaign, submitCampaignEdit } from "./campaign";
import { deleteProfile, submitProfileEdit } from "./profile";
import { deleteNews, submitNewsEdit } from "./news";

export const server = {
    submitForm: submitForm,
    saveDraft: saveDraft,
    deleteDraft: deleteDraft,
    submitFormEdit: submitFormEdit,
    submitCampaignEdit: submitCampaignEdit,
    submitProfileEdit: submitProfileEdit,
    submitNewsEdit: submitNewsEdit,
    applicantLink: applicantLink,
    deleteForm: deleteForm,
    deleteApplications: deleteApplications,
    deleteCampaign: deleteCampaign,
    deleteProfile: deleteProfile,
    deleteNews: deleteNews,
    logout: logout
};