documentCompleteExecutes.push(onDocumentReady);



function onDocumentReady() {
    toggleMyTeam();
    setTimeout("fadeOutSpecialText()", 8000);
}

function fadeOutSpecialText() {
    $("#special-text-block").fadeOut(500);
}

function toggleTopRow(item) {
   var allButtons = ["button-my-team", "button-formed-teams", "button-needs-teams"];
   toggleButtonInRow(item, allButtons);
}

function showHideSection(sectionItem) {
    var allSections = ["info-my-team", "list-formed-teams", "list-needs-teams"];
    hideShowObjects(sectionItem, allSections);
}

function toggleMyTeam() {
    toggleTopRow("button-my-team");
    showHideSection("info-my-team");
}

function toggleFormedTeams() {
    toggleTopRow("button-formed-teams");
    showHideSection("list-formed-teams");
}

function toggleTeamNeeds() {
    toggleTopRow("button-needs-teams");
    showHideSection("list-needs-teams");
}

function showNewTeam() {
    currentTeam = null;
    $("#new-form-options").hide();
    $("#new-form-section").fadeIn(500);
    initShowForm();
}

function hideTeam() {
    $("#new-form-section").fadeOut(300);
    $("#new-form-options").show();
}

function editTeam(teamId) {
    $("#ownblock-" + teamId).hide();
    $("#editForm-" + teamId + "-section").fadeIn(500);
    $("#new-form-options").hide();
    currentFormPrefix = "teamForm-" + teamId + "-";

    var isPublishProjectDescription = $("#" + currentFormPrefix + "publish_project_description_field").val() === 'true';
    
    var doesNeedDevelopers = $("#" + currentFormPrefix + "need_developers_field").val() === 'true';
    var doesNeedDesigners = $("#" + currentFormPrefix + "need_designers_field").val() === 'true';
    var doesNeedIdeas = $("#" + currentFormPrefix + "need_ideas_field").val() === 'true';

    currentTeam = {id: teamId, publishProjectDescription: isPublishProjectDescription, needsDesigners: doesNeedDesigners, needsIdeas: doesNeedIdeas, needsDevelopers: doesNeedDevelopers};

    initShowForm();
}

function hideEditTeam(teamId) {
    $("#ownblock-" + teamId).fadeIn(300);
    $("#editForm-" + teamId + "-section").hide();
    $("#new-form-options").fadeIn(300);
}

function editTeamSubmit(teamId) {
    $("#" + currentFormPrefix + "publish_project_description_field").val(isPublishDescriptionPressed() ? 'Y' : 'N');
    $("#" + currentFormPrefix + "need_developers_field").val(isNeedDevelopersPressed() ? 'Y' : 'N');
    $("#" + currentFormPrefix + "need_designers_field").val(isNeedDesignersPressed() ? 'Y' : 'N');
    $("#" + currentFormPrefix + "need_ideas_field").val(isNeedIdeasPressed() ? 'Y' : 'N');
    $("#editTeamForm-" + teamId + "-form").submit();
}

function createTeamSubmit() {
    $("#" + currentFormPrefix + "publish_project_description_field").val(isPublishDescriptionPressed() ? 'Y' : 'N');
    $("#" + currentFormPrefix + "need_developers_field").val(isNeedDevelopersPressed() ? 'Y' : 'N');
    $("#" + currentFormPrefix + "need_designers_field").val(isNeedDesignersPressed() ? 'Y' : 'N');
    $("#" + currentFormPrefix + "need_ideas_field").val(isNeedIdeasPressed() ? 'Y' : 'N');
    $("#newTeam-form").submit();
}

function joinTeam(teamId) {
    $("#form-" + teamId).submit();
}