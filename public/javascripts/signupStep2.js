function createTeamSubmit() {
    $("#publish_project_description_field").val(isPublishDescriptionPressed() ? 'Y' : 'N');
    $("#need_developers_field").val(isNeedDevelopersPressed() ? 'Y' : 'N');
    $("#need_designers_field").val(isNeedDesignersPressed() ? 'Y' : 'N');
    $("#need_ideas_field").val(isNeedIdeasPressed() ? 'Y' : 'N');
    $("#newteam-form").submit();
}

function toggleCreateATeam() {
    $("#button-teamselection-createateam").toggleClass("tiny-toggle-button-toggled", true);
    $("#button-teamselection-joinateam").toggleClass("tiny-toggle-button-toggled", false);
    $("#team-join-section").hide();
    $("#team-create-section").fadeIn(500);
    $("#team-name").focus();
    togglePublishDescriptionYes();
}

function toggleJoinATeam() {
    $("#button-teamselection-createateam").toggleClass("tiny-toggle-button-toggled", false);
    $("#button-teamselection-joinateam").toggleClass("tiny-toggle-button-toggled", true);
    $("#team-create-section").hide();
    $("#team-join-section").fadeIn(500);
}

function isNeedDevelopersPressed() {
    return isButtonPressed($("#button-need-developers"));
}

function isNeedDesignersPressed() {
    return isButtonPressed($("#button-need-designers"));
}

function isNeedIdeasPressed() {
    return isButtonPressed($("#button-need-ideas"));
}

function isPublishDescriptionPressed() {
    return isButtonPressed($("#button-publish-description-yes"));
}

function toggleNeedDevelopers() {
    $("#button-need-developers").toggleClass("tiny-toggle-button-toggled");
}

function toggleNeedDesigners() {
    $("#button-need-designers").toggleClass("tiny-toggle-button-toggled");
}

function toggleNeedIdeas() {
    $("#button-need-ideas").toggleClass("tiny-toggle-button-toggled");
}

function togglePublishDescriptionYes() {
    $("#button-publish-description-yes").toggleClass("tiny-toggle-button-toggled", true);
    $("#button-publish-description-no").toggleClass("tiny-toggle-button-toggled", false);
}

function togglePublishDescriptionNo() {
    $("#button-publish-description-yes").toggleClass("tiny-toggle-button-toggled", false);
    $("#button-publish-description-no").toggleClass("tiny-toggle-button-toggled", true);
}



function joinTeam(teamId) {
    $("#form-" + teamId).submit();
}