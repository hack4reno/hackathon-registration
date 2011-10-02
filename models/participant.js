var mongoose = require('mongoose');
var Schema = require('mongoose').Schema;

var ParticipantSchema = module.exports = new Schema({
    username: {type: String},
    oAuthAccessCode: {type: String},
    insertDate  :  { type: Date, "default": Date.now }
});

mongoose.model('Participant', ParticipantSchema);
