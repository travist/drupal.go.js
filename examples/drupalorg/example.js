var async =     require('async');
var drupal =    require('../../lib/drupal.js');
var _ =         require('underscore');

// Tell Drupal to load the configuration.
var $ = drupal.load(__dirname + '/config.json');

async.series([

  /** Go visit drupal issue queue. */
  drupal.go('visit', '/project/issues/drupal'),

  function(done) {

    /** Iterate through each view item. */
    drupal.eachViewItem('div.view-project-issue-project-searchapi', 'table.views-table tbody tr', function(row, done) {

      // Get the version number.
      $('td.views-field-field-issue-version', row).text(function(version) {

        // Get the title.
        $('td.views-field-title a', row).text(function(title) {

          // Log the title and version number.
          console.log(title + ' : ' + version);
          done();
        });
      });
    }, done)
  }
], function() {
  console.log('Done');
  drupal.close();
});
