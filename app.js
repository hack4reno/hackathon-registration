
/**
 * Module dependencies.
 */

var express = require('express'),
    fs = require('fs');

//Some global vars
var redisConnected = true;


var config_directory = "/config";
var config_filename = "hackathon-config.json";

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
  res.render('index', {
    title: 'Hack4Reno',
    sectionTitle: 'Participant Registration'
  });
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
