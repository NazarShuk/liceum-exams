import {
    applicantLink,
    deleteApplications,
    deleteDraft,
    deleteForm,
    saveDraft,
    submitForm,
    submitFormEdit,
    updateApplication,
} from "./form";
import { logout } from "./auth";
import { updateUserRole } from "./user";
import { deleteCampaign, submitCampaignEdit } from "./campaign";
import { deleteProfile, submitProfileEdit } from "./profile";
import { deleteNews, submitNewsEdit } from "./news";
import {
    addApplicationsToGroup,
    createGroup,
    deleteGroup,
    removeApplicationsFromGroup,
    submitGroupEdit,
} from "./group";

export const server = {
    submitForm: submitForm,
    saveDraft: saveDraft,
    deleteDraft: deleteDraft,
    submitFormEdit: submitFormEdit,
    submitCampaignEdit: submitCampaignEdit,
    submitProfileEdit: submitProfileEdit,
    submitNewsEdit: submitNewsEdit,
    createGroup: createGroup,
    submitGroupEdit: submitGroupEdit,
    deleteGroup: deleteGroup,
    addApplicationsToGroup: addApplicationsToGroup,
    removeApplicationsFromGroup: removeApplicationsFromGroup,
    updateUserRole: updateUserRole,
    applicantLink: applicantLink,
    deleteForm: deleteForm,
    updateApplication: updateApplication,
    deleteApplications: deleteApplications,
    deleteCampaign: deleteCampaign,
    deleteProfile: deleteProfile,
    deleteNews: deleteNews,
    logout: logout,
};
