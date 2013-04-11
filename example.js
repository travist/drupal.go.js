var async =     require('async');
var drupal =    require('./lib/drupal.js');
var assert =    require('assert');

// Tell Drupal to load the configuration.
var browser = drupal.load('config.json');

// Do our automation
async.series([
  drupal.go('login')
], function() {
  console.log('Done!');
});



