// Include the libraries.
var $ =         require('jquerygo');
var settings =  require('nconf');
var prompt =    require('prompt');
var async =     require('async');
var assert =    require('assert');
var _ =         require('underscore');

// Create the exports.
var drupal = _.extend({

  /**
   * Expose the libraries.
   */
  settings: settings,
  prompt: prompt,

  /**
   * Loads this library with a configuration file.
   *
   * @param {string} configFile The configuration file to load.
   * @param {object} options for the Zombie.js browser.
   * @returns {object} The jquery.go interface.
   */
  load: function(configFile, options) {

    // Set the configuration.
    this.config = _.extend({
      user: '',
      pass: ''
    }, $.config, {
      addJQuery: false
    }, options);

    // Load the configuration.
    settings.argv().env().file({file:configFile}).defaults(this.config);

    // Reset the configuration based on the loaded configuration.
    for (var name in this.config) {
      if (this.config.hasOwnProperty(name)) {
        this.config[name] = settings.get(name);

        // Also allow host to be an alias for site.
        if (!this.config[name] && name == 'site') {
          this.config[name] = settings.get('host');
        }
      }
    }

    // Start the prompt.
    prompt.start();

    // Store the config.
    this.settings = settings;

    // Return the jquery.go browser interface.
    return $;
  },

  /**
   * Get a variable from configuration.
   *
   * @param {mixed} param The param name or an object param with settings.
   * @param {function} done Called when the value is retrieved.
   */
  get: function(param, value, done) {
    var self = this;

    // Allow them to provide a done function.
    if (typeof value === 'function') {
      done = value;
      value = null;
    }

    // Get the parameter name.
    var paramName = (typeof param === 'string') ? param : param.name;
    if (value) {
      this.settings.set(paramName, value);
    }
    else {
      value = this.settings.get(paramName);
    }

    if (!value) {
      prompt.get([param], function (err, result) {
        value = result[paramName];
        self.settings.set(paramName, value);
        done(null, value);
      });
    }
    else if(done) {
      done(null, value);
    }
    else {
      return value;
    }
  },

  /**
   * Sets a value in the settings.
   *
   * @param {string} param
   * @param {mixed} value
   * @param {function} done
   */
  set: function(param, value, done) {
    this.settings.set(param, value);
    done(null, value);
  },

  /**
   * Logs into Drupal.
   *
   * @param {string} user The username.
   * @param {string} pass The password.
   * @param {function} done Called when they are logged in.
   */
  login: function(user, pass, done) {
    // Make sure we handle the case where no args are provided to login.
    if (typeof user=='function') {
      done = user;
      user = null;
    }

    var self = this;
    async.series([
      this.go('visit', '/user'),
      this.go('get', 'user', user),
      this.go('get', {name: 'pass', hidden: true}, pass),
      $('#edit-name').go('val', function() {
        return self.settings.get('user');
      }),
      $('#edit-pass').go(false, 'val', function() {
        return self.settings.get('pass');
      }),
      $('#edit-submit').go('click'),
      this.go('waitForPage'),
      function(done) {
        self.debug('Logged in as ' + self.settings.get('user') + '.');
        done();
      }
    ], done);
   },

   /**
    * Helper to create a single node.
    *
    * @param {object} node A Drupal node object.
    * @param {function} done Called when this operation is done.
    */
   createContent: function(node, done) {

    // Create the series and go add the content.
    var series = [this.go('visit', '/node/add/' + node.type)];

    // Add the title value to the text field.
    series.push($('#edit-title').go('val', node.title));

    // If they provide the body, then go ahead and add that to the fields.
    if (node.body) {
      node.fields = node.fields || {};
      node.fields['textarea[name="body[und][0][value]"]'] = {
        action: 'val',
        value: node.body
      };
    }

    // If they provide some fields.
    if (node.fields) {

      // Initialize the variables.
      var info = null, args = [];

      // Iterate through the fields.
      for (var selector in node.fields) {

        // Initialize the args
        args = [];

        // Get the selector value.
        info = node.fields[selector];

        // Get the action
        args.push(info.action ? info.action : 'val');
        if (typeof info.value !== 'undefined') {
          args.push(info.value);
        }

        // Add this field to the series.
        var element = $(selector);
        series.push(element.go.apply(element, args));
      }
    }

    // Press the submit button to create the content.
    this.debug('Creating node ' + node.title);
    series.push($('#edit-submit').go('click'));
    series.push(this.go('waitForPage'));

    // Execute the series.
    async.series(series, done);
   },

   /**
    * Helper to create multiple pieces of content.
    *
    * @param {array} nodes An array of nodes to create.
    * @param {function} done Called when the operation is done.
    */
   createMultipleContent: function(nodes, done) {
     var self = this;
     async.eachSeries(nodes, function(node, done) {
       self.createContent(node, done);
     }, done);
   },

  /**
   * Iterate over each item within a view, including pagination.
   *
   * @param {string} context The context selector for this view.
   * @param {string} item The selector for each item within context.
   * @param {function} callback Called for each item found within the view.
   * @param {function} done Called when this operation is completely done.
   */
  eachViewItem: function(context, item, callback, done) {
    var self = this;
    $(context + ' ' + item).each(
      function(index, element, done) {
        callback(element, done);
      },
      function() {
        // Get the next pager.
        $(context + ' .pager-next a', function(length) {
          if (length > 0) {
            this.attr('href', function(href) {
              self.visit(href, function() {
                self.eachViewItem(context, item, callback, done);
              });
            });
          }
          else {
            done();
          }
        });
      }
    );
  }
}, $);

module.exports = drupal;
