var async =     require('async');
var drupal =    require('./lib/drupal.js');

// Tell Drupal to load the configuration.
var browser = drupal.load('config.json');

// Do our automation
async.series([
  drupal.go('login'),
  drupal.go('createMultipleContent', drupal.config.get('nodes'))
], function() {
  console.log('Done!');
});



