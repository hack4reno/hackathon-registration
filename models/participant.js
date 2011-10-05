var mongoose = require('mongoose');
var Schema = require('mongoose').Schema;

var ParticipantSchema = module.exports = new Schema({
    username: {type: String, unique: true},
    oAuthAccessCode: {type: String},
    gravatarId: {type: String},
    insertDate  :  { type: Date, "default": Date.now }
});


mongoose.model('Participant', ParticipantSchema);
