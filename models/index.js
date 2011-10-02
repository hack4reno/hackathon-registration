var mongoose = require('mongoose');
var util = require('util');

var modelList = ['participant', 'team'];

for(var i=0; i < modelList.length; i++) {
    require('./' + modelList[i]);
}

var models = module.exports = function(mongourl) {
    util.log("Mongodb connecting to " + mongourl);
    var mongoConnection = mongoose.connect(mongourl);

    return mongoConnection;
};