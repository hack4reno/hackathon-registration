var mongoose = require('mongoose');
var Schema = require('mongoose').Schema;

var TeamSchema = module.exports = new Schema({
    name: {type: String},
    maxTeamSize: {type: Number, "default": 4},
    participants: [{ type: Schema.ObjectId, ref: 'Participant' }],
    insertDate  :  { type: Date, "default": Date.now }
});

mongoose.model('Team', TeamSchema);
