var config = {};

//figure our mongoURI
var uriRoot = process.env.RUN_ENV || 'localhost';
// mongo uri
config.mongoURI = {
  development: "mongodb://" + uriRoot + "/nuntagri",
  test: "mongodb://" + uriRoot + "/nuntagri-test",
  stage: process.env.MONGOLAB_URI
};

module.exports = config;
