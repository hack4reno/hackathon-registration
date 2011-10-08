function toggleButtonInRow(item, rowItems) {
    for(var i=0; i < rowItems.length; i++) {
        var objName = rowItems[i];
        $("#" + objName).toggleClass("tiny-toggle-button-toggled", (objName === item));
    }
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
   toggleButtonInRow(item, allButtons);
}

function togglePublishDescriptionYes() {
    togglePublishDescriptionRow("button-publish-description-yes");
}

function togglePublishDescriptionNo() {
    togglePublishDescriptionRow("button-publish-description-no");
}


$(document).ready(function() {
    for(var i=0; i < documentCompleteExecutes.length; i++) {
        (documentCompleteExecutes[i])();
    }
});