
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
    sanitize = require('validator').sanitize;


//Some global vars
var redisConnected = true;


var config_directory = "/config";
var config_filename = "hackathon-config.json";
var current_root_host = "http://localhost:8080/";

/*
I know this is env non-specific at the moment .. should change later
 */
try {
    config = JSON.parse(fs.readFileSync(config_directory + '/' + config_filename, 'ascii'));
} catch(e) {
    throw new Error('Config file is formatted incorrectly or not found: ' + config_directory + '/' + config_filename + ". " + e.toString());
}

var app = module.exports = express.createServer();


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
});


// Routes

app.get('/', function(req, res){
  res.redirect("/participant-signup");
});

app.get('/logout', function(req, res) {
    if(req.session) {
        req.session.githubAccessToken = null;
        req.session.destroy();
    }
    res.redirect("/");
});

app.get('/participant-signup', function(req, res){
  res.render('index', {
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
    //Check if user is registered
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
                                    saveInfoToSession(req, {userId: currentParticipantId, teamId: docs[0]._id, teamName: docs[0].name, hasTeam: true});
                                    res.redirect("/main");
                                } else {
                                    //Ok, user is not a participant, but maybe they are a pending participant
                                    Team.where('pendingParticipants').in([currentParticipantId]).run(function(err, docs) {
                                        if(err) {
                                            console.log("Err=" + err);
                                        } else {
                                            if(docs !== undefined && docs != null && docs.length > 0) {
                                                saveInfoToSession(req, {userId: currentParticipantId, teamId: null, teamName: "", hasTeam: false});
                                                res.redirect("/main");
                                            } else {
                                                saveInfoToSession(req, {userId: currentParticipantId, teamId: null, teamName: "", hasTeam: false});
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
                        saveInfoToSession(req, {userId: newParticipant._id, teamId: null, teamName: "", hasTeam: false});
                        res.redirect('/participant-signup-validated-join-team');
                    }
                });
            }
        }
    });
});

app.get('/participant-signup-validated-join-team', requireUserMiddleWare, function(req, res, next) {
    var Team = app.mongo.model('Team');
    Team.find({}).populate('participants').run(function(err, docs) {
        if(err) {
            next(err);
        } else {
            res.render('signupStep2', {
                title: 'Hack4Reno',
                sectionTitle: 'Participant Registration',
                userName: req.session.user.login,
                gravatarURL: getGravatarURL(req),
                teams: docs,
                loggedIn: true
            });
        }
    });
});

app.get('/github-callback', function(req, res, next) {
    console.log("GET called");
    var url = Url.parse(req.url);
    var query = querystring.parse(url.query);

    // OAuth setup
    var oauth = new OAuth2(config.githubClientId, config.githubSecretId, 'https://github.com/', 'login/oauth/authorize', 'login/oauth/access_token');

    oauth.getOAuthAccessToken(query.code, {}, function (err, access_token, refresh_token) {
            if (err) {
                console.log("Err=" + JSON.stringify(err));
                next(err);
                return;
            }

            var accessToken = access_token;

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
                    req.session.loggedIn = true;
                    req.session.user = user;

                    res.redirect("/participant-signup-validated");
                }
            });
        });
});

app.get('/github_signin', function(req, res) {
    // OAuth setup
    var oauth = new OAuth2(config.githubClientId, config.githubSecretId, 'https://github.com/', 'login/oauth/authorize', 'login/oauth/access_token');

    var authorizeURL = oauth.getAuthorizeUrl({
      redirect_uri: 'http://localhost:8080/github-callback',
      scope: "user,repo,gist,public_repo"
    });

    res.redirect(authorizeURL);
});

app.get('/main', requireUserMiddleWare, function(req, res) {
  var specialMsg = req.param('specialMsg');

  var specialText = "";
  var hasSpecialText = false;
    
  //Special messages
  if(specialMsg == "join-team") {
    hasSpecialText = true;
    specialText = "The owner of the team has been notified that you wish to join. Please come back once you have been approved.";
  } else if(specialMsg == "create-team") {
      hasSpecialText = true;
      specialText = "Congratulations! Your team has been created.";
  }

    console.log("specialMsg: " + specialMsg);
    console.log("specialText: " + specialText);
    console.log("hasSpecialText: " + hasSpecialText);


  var Team = app.mongo.model('Team');
    Team.find({}).populate('participants').run(function(err, docs) {
        if(err) {
            next(err);
        } else {
            console.log("docs length: " + docs.length);
            res.render('main', {
                title: 'Hack4Reno',
                sectionTitle: 'Main Hub',
                userName: req.session.user.login,
                gravatarURL: getGravatarURL(req),
                teams: docs,
                specialText: specialText,
                hasSpecialText: hasSpecialText,
                loggedIn: true
            });
        }
    });
});

app.post('/join-team', requireUserMiddleWare, function(req, res, next){
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


    var newTeam = new Team({name: team_name,
        participants: [req.session.userId],
        pendingParticipants: [],
        needsDevelopers: need_developers_field,
        needsDesigners: need_designers_field,
        needsIdeas: need_ideas_field,
        description: project_description,
        publishProjectDescription: publish_project_description_field,
        maxTeamSize: 4});
    newTeam.save(function(err) {
        if(err) {
            console.log("Err=" + err);
            next(err);
        } else {
            req.session.teamId = newTeam._id;
            saveInfoToSession(req, {userId: req.session.userId, teamId: newTeam._id, teamName: newTeam.name, hasTeam: true});
            //saveInfoToSession(req, {userId: newParticipant._id, teamId: newTeam._id, teamName: newTeam.name, hasTeam: true});
            res.redirect("/main?specialMsg=create-team");
        }
    });
});


// Quick util functions
function isLoggedIn(req) {
    return (req.session.isLoggedIn);
}

function saveInfoToSession(req, sessionInfoObject) {
    req.session.userId = sessionInfoObject.userId;
    req.session.teamId = sessionInfoObject.teamId;
    req.session.teamName = sessionInfoObject.teamName;
    req.session.hasTeam = sessionInfoObject.hasTeam;
    req.session.pendingTeam = sessionInfoObject.pendingTeam;
}

function getGravatarURL(req) {
    return "https://secure.gravatar.com/avatar/" + req.session.user.gravatar_id + "?s=45";
}



//Protect middleware
function requireUserMiddleWare(req, res, next) {
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


app.mongo = require('./models')(config.mongourl);



app.listen(8080);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
