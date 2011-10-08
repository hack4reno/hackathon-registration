documentCompleteExecutes.push(onDocumentReady);

function onDocumentReady() {
    toggleMyTeam();
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



