var currentFormPrefix = "";
var currentTeam = null;

function toggleButtonInRow(item, rowItems, usePrefix) {
    var localPrefix = (usePrefix === undefined || !usePrefix) ? '' : currentFormPrefix;
    for(var i=0; i < rowItems.length; i++) {
        var objName = rowItems[i];
        if(objName === item) {
            $("#" + localPrefix + objName).toggleClass("tiny-toggle-button-toggled", (objName === item));
        } else {
            $("#" + localPrefix + objName).toggleClass("tiny-toggle-button-toggled", (objName === item));
        }
    }
}

function toggleSingleButton(item, usePrefix, forceToggle) {
    var localPrefix = (usePrefix === undefined || !usePrefix) ? '' : currentFormPrefix;
    $("#" + localPrefix + item).toggleClass("tiny-toggle-button-toggled", forceToggle);
}

function hideShowObjects(item, rowItems) {
    for(var i=0; i < rowItems.length; i++) {
        var objName = rowItems[i];
        if((objName === item)) {
            $("#" + objName).fadeIn(300);
        } else {
            $("#" + objName).hide();
        }
    }
}

function togglePublishDescriptionRow(item) {
   var allButtons = ["button-publish-description-yes", "button-publish-description-no"];
   toggleButtonInRow(item, allButtons, true);
}

function togglePublishDescriptionYes() {
    togglePublishDescriptionRow("button-publish-description-yes");
}

function togglePublishDescriptionNo() {
    togglePublishDescriptionRow("button-publish-description-no");
}

function toggleNeedsRow(item) {
   var allButtons = ["button-need-developers", "button-need-designers", "button-need-ideas"];
   toggleButtonInRow(item, allButtons, true);
}

function toggleNeedDevelopers(toggleTo, automatedToggle) {
    var localToggleTo = (toggleTo === undefined) ? true : toggleTo;
    if(!automatedToggle) localToggleTo = undefined;
    toggleSingleButton("button-need-developers", true, localToggleTo);
}

function toggleNeedDesigners(toggleTo, automatedToggle) {
    var localToggleTo = (toggleTo === undefined) ? true : toggleTo;
    if(!automatedToggle) localToggleTo = undefined;
    toggleSingleButton("button-need-designers", true, localToggleTo);
}

function toggleNeedIdeas(toggleTo, automatedToggle) {
    var localToggleTo = (toggleTo === undefined) ? true : toggleTo;
    if(!automatedToggle) localToggleTo = undefined;
    toggleSingleButton("button-need-ideas", true, localToggleTo);
}


function isNeedDevelopersPressed() {
    return isButtonPressed("button-need-developers", true);
}

function isNeedDesignersPressed() {
    return isButtonPressed("button-need-designers", true);
}

function isNeedIdeasPressed() {
    return isButtonPressed("button-need-ideas", true);
}

function isPublishDescriptionPressed() {
    return isButtonPressed("button-publish-description-yes", true);
}

$(document).ready(function() {
    for(var i=0; i < documentCompleteExecutes.length; i++) {
        (documentCompleteExecutes[i])();
    }
});

function isButtonPressed(buttonObj, usePrefix) {
    var localPrefix = (usePrefix === undefined || !usePrefix) ? '' : currentFormPrefix;
    return ($("#" + localPrefix + buttonObj).hasClass("tiny-toggle-button-toggled"));
}

function initShowForm() {
    if(!currentTeam || (currentTeam && !(currentTeam.id))) {
        currentFormPrefix = "newTeam-";
    } else {
        currentFormPrefix = "teamForm-" + currentTeam.id + "-";
    }

    if(currentTeam) {
        //publishProjectDescription
        if(currentTeam.publishProjectDescription) {
            togglePublishDescriptionYes();
        } else {
            togglePublishDescriptionNo();
        }

        if(currentTeam.needsDevelopers) {
            toggleNeedDevelopers(true, true);
        } else {
            toggleNeedDevelopers(false, true);
        }

        if(currentTeam.needsIdeas) {
            toggleNeedIdeas(true, true);
        } else {
            toggleNeedIdeas(false, true);
        }

        if(currentTeam.needsDesigners) {
            toggleNeedDesigners(true, true);
        } else {
            toggleNeedDesigners(false, true);
        }

    } else {
        togglePublishDescriptionYes();
    }

    $("#" + currentFormPrefix + "team_name").focus();
}

function initHideForm() {
    
}

function signin() {
    location.href = "/github_signin";
}

function createGithubAccount() {
    location.href = "https://github.com/signup/free";
}