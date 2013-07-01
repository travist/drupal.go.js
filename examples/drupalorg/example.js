var async =     require('async');
var drupal =    require('../../lib/drupal.js');
var _ =         require('underscore');

// Tell Drupal to load the configuration.
var browser = drupal.load('config.json');

async.series([

  /** Go visit drupal issue queue. */
  drupal.go('visit', '/project/issues/drupal'),

  function(done) {

    /** Iterate through each view item. */
    drupal.eachViewItem('div.view-project-issue-project', 'table.views-table tbody tr', function(row, done) {

      /** Get the version number. */
      browser.text('td.views-field-version', row, function(version) {

        /** Get the title. */
        browser.text('td.views-field-title a', row, function(title) {

          /** Log the title and version number. */
          console.log(title + ' : ' + version);

          // Say we are done.
          done();
        });
      });
    }, done)
  }
], function() {
  console.log('Done');
  drupal.close();
});
