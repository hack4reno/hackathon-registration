var mongoose = require('mongoose');
var Schema = require('mongoose').Schema;

var TeamSchema = module.exports = new Schema({
    name: {type: String, unique: true},
    description: {type: String},
    publishProjectDescription: {type: Boolean},
    maxTeamSize: {type: Number, "default": 4},
    needsDevelopers: {type: Boolean},
    needsDesigners: {type: Boolean},
    needsIdeas: {type: Boolean},
    githubTeamId: {type: String},
    participants: [{ type: Schema.ObjectId, ref: 'Participant' }],
    pendingParticipants: [{ type: Schema.ObjectId, ref: 'Participant' }],
    insertDate  :  { type: Date, "default": Date.now }
});

TeamSchema.virtual('tinyPublicDescription')
.get(function () {
  return (this.description && this.publishProjectDescription) ? (this.description.length > 60 ? this.description.substring(0, 60) : this.description) : '';
});

TeamSchema.virtual('publicDescription')
.get(function () {
  return (this.description && this.publishProjectDescription) ? (this.description) : '';
});


mongoose.model('Team', TeamSchema);
