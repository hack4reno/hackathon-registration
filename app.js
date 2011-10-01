
/**
 * Module dependencies.
 */

var express = require('express'),
    fs = require('fs'),
    OAuth2 = require("oauth").OAuth2,
    Url = require('url'),
    querystring = require('querystring'),
    GitHubApi = require("github").GitHubApi;

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
    throw new Error('Config file NOT FOUND: ' + config_directory + '/' + config_filename);
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

app.get('/participant-signup-validated', requireUserMiddleWare, function(req, res){
    res.render('signupStep2', {
        title: 'Hack4Reno',
        sectionTitle: 'Participant Registration',
        userName: req.session.user.login,
        gravatarURL: "https://secure.gravatar.com/avatar/" + req.session.user.gravatar_id + "?s=45",
        loggedIn: true
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
      scope: "user,repo,gist"
    });

    res.redirect(authorizeURL);
});


// Quick util functions
function isLoggedIn(req) {
    return (req.session.isLoggedIn);
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




app.listen(8080);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
