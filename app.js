
/**
 * Module dependencies.
 */

var express = require('express'),
    fs = require('fs'),
    OAuth2 = require("oauth").OAuth2,
    Url = require('url'),
    querystring = require('querystring'),
    GitHubApi = require("github").GitHubApi,
    check = require('validator').check,
    DataStoreHandler = require('./dataStoreHandler'),
    spawn = require('child_process').spawn,
    sanitize = require('validator').sanitize;


//Some global vars
var redisConnected = true;

//Default port number
var portNumber = 8080;

var config_directory = "/config";
var config_filename = "hackathon-config.json";

/*
I know this is env non-specific at the moment .. should change later
 */
try {
    config = JSON.parse(fs.readFileSync(config_directory + '/' + config_filename, 'ascii'));
} catch(e) {
    throw new Error('Config file is formatted incorrectly or not found: ' + config_directory + '/' + config_filename + ". " + e.toString());
}

var app = module.exports = express.createServer();
var current_root_host = config.rootHost;

// Redis store setup for sessions

var RedisStore = require('connect-redis')(express);
var store = new RedisStore;
store.client.on("error", redisError);
store.client.on("connect", redisConnect);


function redisConnect() {
  if(!redisConnected) {
    redisConnected = true;
    console.log("Redis Session store connected; applying session.");
  }
}

function redisError(error) {
  console.log("Redis Session store failed: " + error);
}



// Mongoose (Mongo) stuff


// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ "secret": config.sessionSecret, "store": store, "maxAge" : 1800000 }));
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler());
  portNumber = 80;
});


// Routes

app.get('/', maintenanceMiddleware, function(req, res){
    res.render('index', {
        title: 'Hack4Reno',
        sectionTitle: 'Hack4Reno Hackathoner Hub'
      });  
});

app.get('/maintenance', function(req, res) {
    res.render('maintenance', {
        title: 'Hack4Reno',
        sectionTitle: 'Maintenance'
      });
});

app.get('/logout', function(req, res) {
    if(req.session) {
        req.session.githubAccessToken = null;
        req.session.destroy();
    }
    res.redirect("/");
});

app.get('/participant-signup', function(req, res){
  res.render('signup', {
    title: 'Hack4Reno',
    sectionTitle: 'Participant Registration'
  });
});

app.get('/participant-join-submitted', function(req, res){
  res.render('signupRequestJoinTeam', {
    title: 'Hack4Reno',
    sectionTitle: ''
  });
});



//This is the callback from github
app.get('/participant-signup-validated', requireUserMiddleWare, function(req, res, next){
    var Participant = app.mongo.model('Participant');
    Participant.find({username: req.session.user.login}, function(err, docs) {
        if(err) {
            next(err);
        } else {
            if(docs !== undefined && docs != null && docs.length == 1) {
                //If the user exists, update the oAuthAccessCode in the db and continue
                var currentParticipant = docs[0];
                var currentParticipantId = currentParticipant._id;
                currentParticipant.oAuthAccessCode = req.session.githubAccessToken;
                currentParticipant.lastLogin = req.session.lastLogin;
                currentParticipant.save(function(err) {
                    if(err) {
                        next(err);
                    } else {
                        saveInfoToSession(req, {userId: currentParticipantId});
                        res.redirect('/main');
                    }
                });
            } else {
                var newParticipant = new Participant({gravatarId: req.session.user.gravatar_id, username: req.session.user.login, oAuthAccessCode: req.session.githubAccessToken});
                newParticipant.save(function(err) {
                    if(err) {
                        console.log("Err=" + err);
                        next(err);
                    } else {
                        saveInfoToSession(req, {userId: newParticipant._id});
                        res.redirect('/main');
                    }
                });
            }
        }
    });

    /*//Check if user is registered
    var Participant = app.mongo.model('Participant');
    Participant.find({username: req.session.user.login}, function(err, docs) {
        if(err) {
            next(err);
        } else {
            if(docs !== undefined && docs != null && docs.length == 1) {
                //If the user exists, update the oAuthAccessCode in the db and continue
                var currentParticipant = docs[0];
                var currentParticipantId = currentParticipant._id;
                currentParticipant.oAuthAccessCode = req.session.githubAccessToken;
                currentParticipant.save(function(err) {
                    if(err) {
                        next(err);
                    } else {
                        //Look to see if the user is a participant. If not, send them to join a team.
                        var Team = app.mongo.model('Team');

                        //TODO: Look into $or clause for mongoose

                        Team.where('participants').in([currentParticipantId]).run(function(err, docs) {
                            if(err) {
                                console.log("Err=" + err);
                                next(err);
                            } else {
                                if(docs !== undefined && docs != null && docs.length > 0) {
                                    saveInfoToSession(req, {userId: currentParticipantId, teams: docs, teamId: docs[0]._id, teamName: docs[0].name, hasTeam: true});
                                    res.redirect("/main");
                                } else {
                                    //Ok, user is not a participant, but maybe they are a pending participant
                                    Team.where('pendingParticipants').in([currentParticipantId]).run(function(err, docs) {
                                        if(err) {
                                            console.log("Err=" + err);
                                        } else {
                                            if(docs !== undefined && docs != null && docs.length > 0) {
                                                saveInfoToSession(req, {userId: currentParticipantId, pendingTeams: docs, pendingTeam: true});
                                                res.redirect("/main");
                                            } else {
                                                saveInfoToSession(req, {userId: currentParticipantId, teamId: null, teamName: "", hasTeam: false, pendingTeam: false});
                                                res.redirect('/participant-signup-validated-join-team');
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            } else {
                //Setup user
                var newParticipant = new Participant({gravatarId: req.session.user.gravatar_id, username: req.session.user.login, oAuthAccessCode: req.session.githubAccessToken});
                newParticipant.save(function(err) {
                    if(err) {
                        console.log("Err=" + err);
                        next(err);
                    } else {
                        saveInfoToSession(req, {userId: newParticipant._id});
                        res.redirect('/participant-signup-validated-join-team');
                    }
                });
            }
        }
    });*/
});


//OVERLORD FUNCTIONS START


app.get('/overlord-setup', function(req, res, next) {
    if(!config.overlordSetup) {
        res.render('overlordSetupHelp', {
            title: 'Hack4Reno',
            sectionTitle: 'Overlord Setup'
        });
    } else {
        res.redirect('/');
    }
});

app.get('/overlord-setup-validated', function(req, res, next) {
    if(!config.overlordSetup) {
        res.render('overlordSetupDone', {
            title: 'Hack4Reno',
            sectionTitle: 'Overlord Setup',
            code: req.session.oAuthAccessCode,
            token: req.session.githubAccessToken
        });
    } else {
        res.redirect('/');
    }
});

app.post('/overlord-oauth', function(req, res, next) {
    if(!config.overlordSetup) {
        // OAuth setup
        var oauth = new OAuth2(config.githubClientId, config.githubSecretId, 'https://github.com/', 'login/oauth/authorize', 'login/oauth/access_token');

        var authorizeURL = oauth.getAuthorizeUrl({
          redirect_uri: current_root_host + 'github-callback',
          scope: "repo"
        });

        res.redirect(authorizeURL);
    } else {
        res.redirect('/');
    }
});

// OVERLORD FUNCTIONS END



app.get('/participant-signup-validated-join-team', requireUserMiddleWare, function(req, res, next) {
    var Team = app.mongo.model('Team');

    Team.$where('this.needsDevelopers === true || this.needsDesigners === true || this.needsIdeas === true').populate('participants').exec(function(err, docs) {
        if(err) {
            next(err);
        } else {
            res.render('signupStep2', {
                title: 'Hack4Reno',
                sectionTitle: 'Participant Registration',
                userName: req.session.user.login,
                gravatarURL: getGravatarURL(req),
                needsTeams: docs,
                organizationName: config.organizationName,
                newTeam: new Team(),
                loggedIn: true
            });
        }
    });
});

function execOAuthForCommand(callback) {
    var oauth = new OAuth2(config.githubClientId, config.githubSecretId, 'https://github.com/', 'login/oauth/authorize', 'login/oauth/access_token');

    oauth.getOAuthAccessToken(config.overlordOAuthCode, {}, function (err, access_token, refresh_token) {
        if(err) {
            console.log("OAuthError:: " + err);
            callback(err, null);
        } else {
            console.log("OAuthSuccess:: " + access_token + ", refresh_token:" + refresh_token);
            callback(null, access_token);
        }
    });
}

app.get('/github-callback', function(req, res, next) {
    console.log("GET called");
    var url = Url.parse(req.url);
    var query = querystring.parse(url.query);

    // OAuth setup
    var oauth = new OAuth2(config.githubClientId, config.githubSecretId, 'https://github.com/', 'login/oauth/authorize', 'login/oauth/access_token');

    var accessCode = query.code;
    oauth.getOAuthAccessToken(query.code, {}, function (err, access_token, refresh_token) {
            if (err) {
                console.log("Err=" + JSON.stringify(err));
                next(err);
                return;
            }

            var accessToken = access_token;
            var refreshToken = refresh_token;

            console.log("access_token=" + accessToken);
            console.log("refresh_token=" + refreshToken);

            //Let's try using our new found access_token
            var github = new GitHubApi(true);
            github.authenticateOAuth(accessToken);
            var user = github.getUserApi();

            user.show(function(err, user) {
                if (err) {
                    console.log("Err=" + JSON.stringify(err));
                    next(err);
                } else {
                    console.log("user=" + JSON.stringify(user));

                    //Ok, we got an access code, it's valid, and we got a user back.
                    req.session.githubAccessToken = accessToken;
                    req.session.oAuthAccessCode = accessCode;
                    req.session.loggedIn = true;
                    req.session.user = user;

                    saveInfoToSession(req, {login: req.session.user.login});

                    if(!config.overlordSetup) {
                        res.redirect("/overlord-setup-validated");
                    } else {
                        res.redirect("/participant-signup-validated");
                    }


                }
            });
        });
});

app.get('/github_signin', function(req, res) {
    // OAuth setup
    var oauth = new OAuth2(config.githubClientId, config.githubSecretId, 'https://github.com/', 'login/oauth/authorize', 'login/oauth/access_token');

    var authorizeURL = oauth.getAuthorizeUrl({
      redirect_uri: current_root_host + 'github-callback',
      scope: "user,repo,public_repo,gist"
    });

    res.redirect(authorizeURL);
});

app.get('/main', [requireUserMiddleWare, lookupMyTeams, lookupFormedTeams, lookupNeedsTeams], function(req, res) {
    console.log("!!!: main");
    var Team = app.mongo.model('Team');
    var specialMsg = req.param('specialMsg');

    var specialText = "";
    var hasSpecialText = false;

    //Special messages
    if(specialMsg == "join-team") {
        hasSpecialText = true;
        specialText = "Congratulations! You've just joined a team. A repository issue was opened to notify the other team members of your presence and track discussions around it.";
    } else if(specialMsg == "create-team") {
        hasSpecialText = true;
        specialText = "Congratulations! Your team has been created.";
    } else if(specialMsg == "update-complete") {
        hasSpecialText = true;
        specialText = "Your team  information has been updated.";
    }

    for(var i=0; i < req.needsTeams.length; i++) {
        var currentTeam = req.needsTeams[i];
        currentTeam.isParticipant = false;
        for(var j=0; j < currentTeam.participants.length; j++) {
              //if is populated
              if(currentTeam.participants[j]._id === undefined) {
                  if(req.session.userId == currentTeam.participants[j])
                    currentTeam.isParticipant = true;
              } else {
                  if(req.session.userId == currentTeam.participants[j]._id)
                    currentTeam.isParticipant = true;
              }
         }
    }

    res.render('main', {
        title: 'Hack4Reno',
        sectionTitle: 'Main Hub',
        userName: req.session.user.login,
        userId: req.session.userId,
        gravatarURL: getGravatarURL(req),
        myTeams: req.myTeams,
        formedTeams: req.formedTeams,
        needsTeams: req.needsTeams,
        organizationName: config.organizationName,
        specialText: specialText,
        hasSpecialText: hasSpecialText,
        newTeam: new Team(),
        loggedIn: true
    });
});

app.post('/join-team', [requireUserMiddleWare, requireValidTeam], function(req, res, next){
    var dataStoreHandler = new DataStoreHandler(app, req.session);

    dataStoreHandler.joinTeam(req.team, function(err, team) {
        if(err) {
            console.log("err: " + JSON.stringify(err));
            next(err);
        } else {
            res.redirect("/main?specialMsg=join-team");
        }
    });
});


app.post('/approve-team-member', [requireUserMiddleWare, requireTeamMemberMiddleWare], function(req, res, next) {
    var team_id = req.body.team_id;
    console.log('Team_id=' + team_id);
    var Team = app.mongo.model('Team');
    Team.find({_id: team_id}, function(err, docs) {
        if(err) {
            next(err);
        } else {
            if(docs === undefined || docs === null || docs.length == 0) {
                next(new Error("Unable to locate team with criteria."));
            } else {
                var currentTeam = docs[0];
                currentTeam.pendingParticipants.push(req.session.userId);
                currentTeam.save(function(err) {
                    if(err) {
                        next(err);
                    } else {
                        res.redirect("/main?specialMsg=join-team");
                    }
                });
            }
        }
    });

});

app.post('/reject-team-member', requireUserMiddleWare, function(req, res, next) {
     //Github magic start
    var overlordGithubAPI = new GitHubApi(true);
    overlordGithubAPI.authenticatePassword(config.overlordUsername, config.overlordPassword);

    var organizationAPI = overlordGithubAPI.getOrganizationApi();
});


app.post('/updateTeam', [requireUserMiddleWare, requireValidTeam, requireTeamMemberMiddleWare], function(req, res, next){
    console.log("!!!: updateTeam");
    var team_name = req.body.team_name;
    var project_description = req.body.project_description;
    var publish_project_description_field = req.body.publish_project_description_field;
    var need_developers_field = req.body.need_developers_field;
    var need_designers_field = req.body.need_designers_field;
    var need_ideas_field = req.body.need_ideas_field;

    //Check
    check(team_name).len(1, 120);
    check(project_description).len(0, 2048);

    //Sanitize
    team_name = sanitize(team_name).xss();
    project_description = sanitize(project_description).xss();

    //To Booleans
    publish_project_description_field = (publish_project_description_field === 'Y');
    need_developers_field = (need_developers_field === 'Y');
    need_designers_field = (need_designers_field === 'Y');
    need_ideas_field = (need_ideas_field === 'Y');

    //New participant save
    var Participant = app.mongo.model('Participant');
    var Team = app.mongo.model('Team');

    //Do real updates to the team object
    var teamForUpdate = req.team;
    teamForUpdate.name = team_name;
    teamForUpdate.description = project_description;
    teamForUpdate.needsDevelopers = need_developers_field;
    teamForUpdate.needsDesigners = need_designers_field;
    teamForUpdate.needsIdeas = need_ideas_field;
    teamForUpdate.publishProjectDescription = publish_project_description_field;


    teamForUpdate.save(function(err) {
        if(err) {
            next(err);
        } else {
            if(err) {
                next(err);
            } else {
                res.redirect("/main?specialMsg=update-complete");
            }
            //var dataStoreHandler = new DataStoreHandler(app, req.session);
            //dataStoreHandler.updateTeam(teamForUpdate, function(err, team) {
            //    if(err) {
            //        console.log("err: " + JSON.stringify(err));
            //        next(err);
            //    } else {
            //        //console.log("retFromDataStoreHandler=" + JSON.stringify(team));
            //        res.redirect("/main?specialMsg=update-complete");
            //    }
            //});
        }
    });
});


app.post('/create-and-join-team', requireUserMiddleWare, function(req, res, next){
    
    var team_name = req.body.team_name;
    var project_description = req.body.project_description;
    var publish_project_description_field = req.body.publish_project_description_field;
    var need_developers_field = req.body.need_developers_field;
    var need_designers_field = req.body.need_designers_field;
    var need_ideas_field = req.body.need_ideas_field;

    //Check
    check(team_name).len(1, 120);
    check(project_description).len(0, 2048);

    //Sanitize
    team_name = sanitize(team_name).xss();
    project_description = sanitize(project_description).xss();

    //To Booleans
    publish_project_description_field = (publish_project_description_field === 'Y');
    need_developers_field = (need_developers_field === 'Y');
    need_designers_field = (need_designers_field === 'Y');
    need_ideas_field = (need_ideas_field === 'Y');

    //New participant save
    var Participant = app.mongo.model('Participant');
    var Team = app.mongo.model('Team');

    var dataStoreHandler = new DataStoreHandler(app, req.session);
    dataStoreHandler.createTeam({
        name: team_name,
        needsDevelopers: need_developers_field,
        needsDesigners: need_designers_field,
        needsIdeas: need_ideas_field,
        description: project_description,
        publishProjectDescription: publish_project_description_field
    }, function(err, team) {
        if(err) {
            console.log("err: " + JSON.stringify(err));
            next(err);
        } else {
            saveInfoToSession(req, {teamId: team._id, teamName: team.name, hasTeam: true});
            res.redirect("/main?specialMsg=create-team");    
        }
    });

});


// Quick util functions
function isLoggedIn(req) {
    return (req.session.isLoggedIn);
}


function saveInfoToSession(req, sessionInfoObject) {

    var sessionObjectTemplate = {
        pendingTeams: [],
        activeTeams: [],
        userId: null,
        login: null
    };
    
    for(var prop in sessionObjectTemplate) {
        if(sessionInfoObject[prop] !== undefined){
            req.session[prop] = sessionInfoObject[prop];
        } else {
            //If we have nothing set on the session and it's not defined in the passed in object, set a default value
            if(req.session[prop] === undefined) {
                req.session[prop] = sessionObjectTemplate[prop];
            }
        }
     }

     console.log("Session= " + JSON.stringify(req.session));
}

function getGravatarURL(req) {
    return "https://secure.gravatar.com/avatar/" + req.session.user.gravatar_id + "?s=45";
}



//Protect middleware
function requireUserMiddleWare(req, res, next) {
    console.log("!!!: requireUserMiddleWare");
    try {
        if(req.session.githubAccessToken && req.session.user) {
            next();
        } else {
            next(new Error("Invalid credentials"));
        }
    } catch(e) {
        next(e);
    }
}

function requireValidTeam(req, res, next) {
    console.log("!!!: requireValidTeam");
    var teamId = req.body.team_id;

    var Team = app.mongo.model('Team');
    var currentParticipantId = req.session.userId;

     Team.find({_id: teamId}, function(err, docs) {
        if(err) {
            next(err);
        } else {
            if(docs.length == 1 && docs[0].githubTeamId) {
                var currentDoc = docs[0];
                req.team = currentDoc;
                next();
            } else {
                next(new Error("Invalid Team"));
            }
        }
     });

}


function requireTeamMemberMiddleWare(req, res, next) {
    console.log("!!!: requireTeamMemberMiddleWare");
    var teamId = req.body.team_id;

    var Team = app.mongo.model('Team');
    var currentParticipantId = req.session.userId;

    console.log("teamId="  + teamId);
    console.log("currentParticipantId=" + currentParticipantId);
    
     Team.find({_id: teamId}, function(err, docs) {
        if(err) {
            next(err);
        } else {
            if(docs.length == 1 && docs[0].githubTeamId) {
                var currentDoc = docs[0];
                var foundMatch = false;
                for(var i=0; i < currentDoc.participants.length; i++) {
                    if(currentDoc.participants[i] == currentParticipantId) {
                        foundMatch = true;
                        return next();
                    }
                }
                if(!foundMatch) {
                    console.log("ERROR!!! No match!");
                    next(new Error("Access Denied"));
                }
            } else {
                console.log("ERROR!!! No docs!");
                next(new Error("Access Denied. Invalid team."));
            }
        }
     });
}

function lookupMyTeams(req, res, next) {
    console.log("!!!: lookupMyTeams");
    var Team = app.mongo.model('Team');
    var currentParticipantId = req.session.userId;
    Team.where('participants').in([currentParticipantId]).populate('participants').run(function(err, docs) {
        if(err) {
            next(err);
        } else {
            req.myTeams = docs;
            next();
        }
    });
}

function lookupFormedTeams(req, res, next) {
    var Team = app.mongo.model('Team');
    Team.find({needsDevelopers: false, needsDesigners: false, needsIdeas: false}).populate('participants').run(function(err, docs) {
        if(err) {
            next(err);
        } else {
            req.formedTeams = docs;
            next();
        }
    });
}

function lookupNeedsTeams(req, res, next) {
    var Team = app.mongo.model('Team');
    Team.$where('this.needsDevelopers === true || this.needsDesigners === true || this.needsIdeas === true').populate('participants').exec(function(err, docs) {
        if(err) {
            next(err);
        } else {
            req.needsTeams = docs;
            next();
        }
     });
}

//Maintenance middleware
function maintenanceMiddleware(req, res, next) {
    if(config.maintenaceMode === true) {
        res.redirect("/maintenance");
    } else {
        next();
    }
}


app.mongo = require('./models')(config.mongourl);
app.config = config;


app.listen(portNumber);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
