// Include the libraries.
var Browser =   require('zombie-phantom');
var config =    require('nconf');
var prompt =    require('prompt');
var async =     require('async');
var assert =    require('assert');
var _ =         require('underscore');

// Create the exports.
module.exports = {

  /**
   * Expose the libraries.
   */
  config: config,
  prompt: prompt,

  /**
   * API to do something in Drupal asynchronously...
   *
   * @return {function} An async promise.
   */
  go: function() {
    var self = this;
    var args = _.values(arguments);
    var method = args.shift();
    var show = true;
    if (typeof method==='boolean') {
      show = method;
      method = args.shift();
    }
    return function(done) {
      _.each(args, function(arg, index) {
        if (typeof arg === 'function') {
          args[index] = arg();
        }
      });
      if (show) {
        console.log(method + '(' + args.join(', ') + ')');
      }
      args.push(done);
      var ref = self.hasOwnProperty(method) ? self : self.browser;
      ref[method].apply(ref, args);
    };
  },

  /**
   * Loads this library with a configuration file.
   *
   * @param {string} configFile The configuration file to load.
   * @param {object} options for the Zombie.js browser.
   * @returns {object} A Zombie.js Browser.
   */
  load: function(configFile, options) {

    // Load the configuration.
    config.argv().env().file({file:configFile});

    // Provide some default options.
    options = options || {};
    options = _.extend({
      site: config.get('host'),
      addJQuery: false
    }, options);

    // Start the prompt.
    prompt.start();

    // Store the config.
    this.config = config;

    // Default to the PhantomJS browser, but allow them to use Zombie.js or
    // another one...
    if (options.browser) {
      this.browser = new options.browser(options);
    }
    else {
      this.browser = new Browser(options);
    }

    // Return the zombie browser.
    return this.browser;
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
      this.config.set(paramName, value);
    }
    else {
      value = this.config.get(paramName);
    }

    if (!value) {
      prompt.get([param], function (err, result) {
        value = result[paramName];
        self.config.set(paramName, value);
        done(null, value);
      });
    }
    else {
      done(null, value);
    }
  },

  /**
   * Sets a value in the config.
   *
   * @param {string} param
   * @param {mixed} value
   * @param {function} done
   */
  set: function(param, value, done) {
    this.config.set(param, value);
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
      this.go('fill', '#edit-name', function() {
        return self.config.get('user');
      }),
      this.go(false, 'fill', '#edit-pass', function() {
        return self.config.get('pass');
      }),
      this.go('pressButton', '#edit-submit'),
      function(done) {
        console.log('Logged in as ' + self.config.get('user') + '.');
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
    series.push(this.go('fill', '#edit-title', node.title));

    // If they provide the body, then go ahead and add that to the fields.
    if (node.body) {
      node.fields = node.fields || {};
      node.fields['textarea[name="body[und][0][value]"]'] = {
        action: 'fill',
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
        args.push(info.action ? info.action : 'fill');
        args.push(selector);
        if (typeof info.value !== 'undefined') {
          args.push(info.value);
        }

        // Add this field to the series.
        series.push(this.go.apply(this, args));
      }
    }

    // Press the submit button to create the content.
    series.push(this.go('pressButton', '#edit-submit'));

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
    this.browser.queryAll(context + ' ' + item, function(nodes) {
      if (nodes) {
        async.eachSeries(nodes, function(node, done) {
          callback(node, done);
        }, function() {
          self.browser.query(context + ' .pager-next a', function(next) {
            if (next) {
              self.browser.clickLink(next, function() {
                self.eachViewItem(context, item, callback, done);
              });
            }
            else {
              done();
            }
          });
        });
      }
    });
  },

  /**
   * Close Drupal and browser.
   * @returns {undefined}
   */
  close: function() {
    this.browser.close();
  }
};
