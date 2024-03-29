var GitHubApi = require("github").GitHubApi;
    
function DataStoreHandler(app, sessionObject) {
    
    //Get handlers from the app
    this.$mongo = app.mongo;
    this.$config = app.config;

    //Get information from the current session
    this.$userId = sessionObject.userId;
    this.$githubUser = sessionObject.user;
    this.$githubAccessToken = sessionObject.githubAccessToken;

    console.log("$githubAccessToken = " + sessionObject.githubAccessToken);
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

DataStoreHandler.prototype.getNewPersonalGithubAPI = function() {
    var personalGithubAPI = new GitHubApi(true);
    personalGithubAPI.authenticateToken(this.$githubUser.login, this.$githubAccessToken);
    return personalGithubAPI;
};


DataStoreHandler.prototype.updateTeam = function(team, callback) {
    var thisObj = this;
    var githubAPI = thisObj.getNewGithubAPI();
    var organizationAPI = githubAPI.getOrganizationApi();

    organizationAPI.updateTeamName = function(teamId, teamName, callback)
    {
        var parameters = {};
        
        parameters["team"] = {"name": thisObj.$config.organizationName + "/" + teamName,
                    "id": teamId,
                    "permission": "admin"};


        organizationAPI.$api.put(
            'teams/' + teamId,
            parameters, {format: "json"},
            organizationAPI.$createListener(callback)
        );
    };

    organizationAPI.updateTeamName(team.githubTeamId, team.name, function(err, retTeam) {
        console.log("retTeam=" + JSON.stringify(retTeam));
        team.githubTeamName = retTeam.name;
        thisObj.updateRepository(team, function(err, retRepository) {
            console.log("Post update repository");
            if(err) {
                console.log("Post update repository. THERE WAS AN ERROR!!");
                callback(err);
            } else {
                console.log("Post update repository. EVERYTHING OK!!");
                team.save(function(err) {
                    if(err) {
                        console.log("ON TEAM SAVE ERRROR!!!");
                        callback(err);
                    } else {
                        console.log("ON TEAM SAVE. EVERYTHING OK!!");
                        callback(null, err);
                    }
                });
            }
        });
    });

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
        owner: this.$userId,
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

DataStoreHandler.prototype.joinTeam = function(team, callback) {
    var thisObj = this;
    var githubAPI = thisObj.getNewGithubAPI();
    var organizationAPI = githubAPI.getOrganizationApi();

    var issueTitle = thisObj.$githubUser.login + " just joined your team!";
    var issueBody = "This is an automated friendly message to let you know that " + thisObj.$githubUser.login + " just joined your team. Use this issue to track discussions regarding this action. Close this issue if there are no discussions required.";

    var personalGithubAPI = thisObj.getNewGithubAPI();
    var issueAPI = personalGithubAPI.getIssueApi();
    var repositoryAPI = githubAPI.getRepoApi();

    issueAPI.createIssue = function(title, body, repositoryName, callback)
    {
        var parameters = {};
        parameters["login"] = thisObj.$githubUser.login;
        parameters["token"] = thisObj.$githubAccessToken;
        parameters["title"] = title;
        parameters["body"] = body;

        issueAPI.$api.post(
            'issues/open/' + thisObj.$config.organizationName + "/" + repositoryName,
            parameters, null,
            issueAPI.$createListener(callback)
        );
    };

    repositoryAPI.addCollaboratorToRepo = function(collaboratorUsername, organizationName, repoName, callback)
    {
        var parameters = {};

        repositoryAPI.$api.post(
            'repos/collaborators/' + organizationName + '/' + repoName + '/add/' + collaboratorUsername,
            parameters, null,
            repositoryAPI.$createListener(callback)
        );
    };

    organizationAPI.addTeamMember(team.githubTeamId, thisObj.$githubUser.login, function(err, members) {
        if(err) {
            callback(err);
        } else {
            if(err) {
                callback(err);
            } else {
                //repositoryAPI.addCollaboratorToRepo(thisObj.$githubUser.login, thisObj.$config.organizationName, team.githubRepositoryName, function(err, repoRet) {
                //    if(err) {
                //        callback(err);
                //    } else {
                //        console.log("Add Collaborator RET: " + JSON.stringify(repoRet));
                        team.participants.push(thisObj.$userId);
                        team.save(function(err) {
                            if(err) {
                                callback(err);
                            } else {
                                issueAPI.createIssue(issueTitle, issueBody, team.githubRepositoryName, function(err, issueRet) {
                                    if(err) {
                                        callback(err);
                                    } else {
                                        console.log("issueRet=" + JSON.stringify(issueRet));
                                        callback(null, issueRet);
                                    }
                                });
                            }
                        });
                //    }
               // });

            }
        }
    });
};

DataStoreHandler.prototype.createTeam = function(teamInfo, callback) {
    var thisObj = this;

    var githubAPI = thisObj.getNewGithubAPI();
    var organizationAPI = githubAPI.getOrganizationApi();

    organizationAPI.createTeamWithRepo = function(teamName, organizationName, repo, callback) {
        var parameters = {};
        parameters["team[name]"] = teamName;
        parameters["team[permission]"] = "admin";
        parameters["team[repo_names][]"] = organizationName + "/" + repo.name;

        this.$api.post(
            'organizations/' + encodeURI(organizationName) + '/teams',
            parameters, null,
            this.$createListener(callback, "team")
        );
    };

    this.saveTeamToDb(teamInfo, function(err, team) {
        if(err) {
            callback(err);
        } else {
            thisObj.createTeamRepo(team, function(err, repo) {
                console.log("Created REPO=" + JSON.stringify(repo));
                if(err) {
                    callback(err);
                } else {
                     organizationAPI.createTeamWithRepo(teamInfo.name, thisObj.$config.organizationName, repo, function(err, retTeam) {
                         if(err) {
                             console.log("err=" + JSON.stringify(err));
                             callback(err);
                         } else {
                             console.log("retTeam=" + JSON.stringify(retTeam));
                             team.githubRepositoryName = repo.name;
                             team.githubTeamName = retTeam.name;
                             team.githubTeamId = retTeam.id;
                             team.save(function(err) {
                                if(err) {
                                    callback(err);
                                } else {
                                    thisObj.linkRepositoryToTeam(team, function(err, outRepo) {
                                        if(err) {
                                            callback(err);
                                        } else {
                                            organizationAPI.addTeamMember(team.githubTeamId, thisObj.$githubUser.login, function(err, members) {
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

            /*organizationAPI.addTeam(thisObj.$config.organizationName, teamInfo.name, function(err, githubTeam) {
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
            }); */
        }
    });
};


DataStoreHandler.prototype.createTeamRepo = function(team, callback) {
    var thisObj = this;
    var githubAPI = this.getNewGithubAPI();

    var repositoryAPI = githubAPI.getRepoApi();

    //Store the public description
    if(team.publishProjectDescription) {
        team.publicDescription = team.description;
    } else {
        team.publicDescription = "";
    }

    repositoryAPI.createRepository = function(team, callback)
    {
        var parameters = {};
        parameters["name"] = thisObj.$config.organizationName + "/" + team.name;
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

DataStoreHandler.prototype.updateRepository = function(team, callback) {
    var thisObj = this;
    var githubAPI = this.getNewGithubAPI();

    var repositoryAPI = githubAPI.getRepoApi();

    repositoryAPI.updateRepository = function(team, callback)
    {
        var parameters = {};

        if(team.publishProjectDescription) {
            parameters["description"] = team.description;
        } else {
            parameters["description"] = '';
        }


        repositoryAPI.$api.post(
            '/repos/show/' + thisObj.$config.organizationName + "/" + team.githubRepositoryName,
            parameters, null,
            repositoryAPI.$createListener(callback)
        );
    };

    repositoryAPI.updateRepository(team, function(err, repository) {
        console.log("repository=" + JSON.stringify(repository));
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