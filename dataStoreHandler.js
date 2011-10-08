var GitHubApi = require("github").GitHubApi;
    
function DataStoreHandler(app, sessionObject) {
    
    //Get handlers from the app
    this.$mongo = app.mongo;
    this.$config = app.config;

    //Get information from the current session
    this.$userId = sessionObject.userId;
    this.$githubUser = sessionObject.user;
};

DataStoreHandler.prototype.listMyTeams = function(callback) {
    var githubAPI = this.getNewGithubAPI();
    var organizationAPI = githubAPI.getOrganizationApi();
    organizationAPI.teams(this.$config.organizationName, function(err, teams) {
        console.log("teams=" + JSON.stringify(teams));
        callback();
    });
};

DataStoreHandler.prototype.getNewGithubAPI = function() {
    var overlordGithubAPI = new GitHubApi(true);
    overlordGithubAPI.authenticatePassword(this.$config.overlordUsername, this.$config.overlordPassword);
    return overlordGithubAPI;
};


DataStoreHandler.prototype.updateTeam = function() {

};


DataStoreHandler.prototype.saveTeamToDb = function(teamInfo, callback) {
    var Participant = this.$mongo.model('Participant');
    var Team = this.$mongo.model('Team');

    var newTeam = new Team({name: teamInfo.name,
        participants: [this.$userId],
        pendingParticipants: [],
        needsDevelopers: teamInfo.needsDevelopers,
        needsDesigners: teamInfo.needsDesigners,
        needsIdeas: teamInfo.needsIdeas,
        description: teamInfo.description,
        publishProjectDescription: teamInfo.publishProjectDescription,
        maxTeamSize: 4});

    newTeam.save(function(err) {
        if(err) {
            callback(err);
        } else {
            callback(null, newTeam);
        }
    });
};

DataStoreHandler.prototype.createTeam = function(teamInfo, callback) {
    var thisObj = this;

    this.saveTeamToDb(teamInfo, function(err, team) {
        if(err) {
            callback(err);
        } else {
            var githubAPI = thisObj.getNewGithubAPI();
            var organizationAPI = githubAPI.getOrganizationApi();

            organizationAPI.addTeam(thisObj.$config.organizationName, teamInfo.name, function(err, githubTeam) {
                console.log("GithubTeam=" + JSON.stringify(githubTeam));
                if(err) {
                    callback(err);
                } else {
                    team.githubTeamName = githubTeam.name;
                    team.githubTeamId = githubTeam.id;
                    organizationAPI.addTeamMember(team.githubTeamId, thisObj.$githubUser.login, function(err, members) {
                        if(err) {
                            callback(err);
                        } else {
                            thisObj.createTeamRepo(team, function(err, repo) {
                                console.log("Created REPO=" + JSON.stringify(repo));
                                if(err) {
                                    callback(err);
                                } else {
                                     team.githubRepositoryName = repo.name;

                                     team.save(function(err) {
                                        if(err) {
                                            callback(err);
                                        } else {
                                            thisObj.linkRepositoryToTeam(team, function(err, outRepo) {
                                                if(err) {
                                                    callback(err);
                                                } else {
                                                    callback(null, outRepo);
                                                }
                                            });
                                        }
                                     });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};


DataStoreHandler.prototype.createTeamRepo = function(team, callback) {
    var thisObj = this;
    var githubAPI = this.getNewGithubAPI();

    var repositoryAPI = githubAPI.getRepoApi();

    repositoryAPI.createRepository = function(team, callback)
    {
        var parameters = {};
        parameters["name"] = thisObj.$config.organizationName + "/" + team.githubTeamName;
        parameters["description"] = team.publicDescription;
        parameters["private"] = false;
        
        repositoryAPI.$api.post(
            'repos/create',
            parameters, null,
            repositoryAPI.$createListener(callback)
        );
    };

    repositoryAPI.createRepository(team, function(err, repository) {
        if(err) {
            callback(err);
        } else {
            //Ret object contains "repository"
            if(repository && repository.repository) {
                repository = repository.repository;
            }
            callback(null, repository);
        }
    });
};


DataStoreHandler.prototype.linkRepositoryToTeam = function(team, callback) {
    var thisObj = this;
    var githubAPI = this.getNewGithubAPI();

    var organizationAPI = githubAPI.getOrganizationApi();
    var repositoryAPI = githubAPI.getRepoApi();

    organizationAPI.addRepository = function(teamId, username, repositoryName, callback)
    {
        var parameters = {};
        parameters["name"] = username + "/" + repositoryName;

        organizationAPI.$api.post(
            'teams/' + encodeURI(teamId) + '/repositories',
            parameters, null,
            organizationAPI.$createListener(callback)
        );
    };

    repositoryAPI.show(thisObj.$config.organizationName, team.githubRepositoryName, function(err, repository) {
        if(err) {
            callback(err);
        } else {
            console.log("Repository= " + JSON.stringify(repository));
            
            organizationAPI.addRepository(team.githubTeamId, thisObj.$config.organizationName, team.githubRepositoryName, function(err, repository) {
                if(err) {
                    callback(err);
                } else {
                    callback(null, repository);
                }
            });
        }
    });


};



module.exports = exports = DataStoreHandler;