var mongoose = require('mongoose');
var Schema = require('mongoose').Schema;

var TeamSchema = module.exports = new Schema({
    name: {type: String, unique: true, "default": ''},
    description: {type: String, "default": ''},
    publishProjectDescription: {type: Boolean, "default": true},
    maxTeamSize: {type: Number, "default": 4},
    needsDevelopers: {type: Boolean, "default": false},
    needsDesigners: {type: Boolean, "default": false},
    needsIdeas: {type: Boolean, "default": false},
    githubTeamId: {type: String},
    githubRepositoryName: {type: String},
    githubTeamName: {type: String},
    participants: [{ type: Schema.ObjectId, ref: 'Participant' }],
    pendingParticipants: [{ type: Schema.ObjectId, ref: 'Participant' }],
    projectName: {type: String, "default": ''},
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

TeamSchema.virtual('displayView')
.get(function () {
        return {
            id: this._id,
            name: this.name,
            description: this.description,
            needsDevelopers: this.needsDevelopers,
            needsDesigners: this.needsDesigners,
            needsIdeas: this.needsIdeas,
            githubTeamId: this.githubTeamId,
            githubTeamName: this.githubTeamName,
            githubRepositoryName: this.githubRepositoryName,
            projectName: this.projectName,
            publishProjectDescription: this.publishProjectDescription,
            participants: this.participants
        };
  //return (this.description && this.publishProjectDescription) ? (this.description) : '';
});


mongoose.model('Team', TeamSchema);
