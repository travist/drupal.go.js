// Include the libraries.
var Browser =   require('zombie');
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
   * The parameters to use for this library.
   *
   * @type type
   */
  params: {},

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
      var ref = self.hasOwnProperty(method) ? self : self.zombie;
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
      site: config.get('host')
    }, options);

    // Start the prompt.
    prompt.start();

    // Store the config.
    this.config = config;

    // Create the browser.
    this.browser = new Browser(options);

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
    this.params[paramName] = value ? value : config.get(paramName);
    if (!this.params[paramName]) {
      prompt.get([param], function (err, result) {
        self.params[paramName] = result[paramName];
        done(self.params[paramName]);
      });
    }
    else {
      done(self.params[paramName]);
    }
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
        return self.params.user;
      }),
      this.go(false, 'fill', '#edit-pass', function() {
        return self.params.pass;
      }),
      this.go('pressButton', '#edit-submit'),
      function(done) {
        assert.ok(!self.browser.query("#edit-name"), 'Login Failed');
        console.log('Logged in as ' + self.params.user + '.');
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
    async.series([
      this.go('visit', '/node/add/' + node.type),
      this.go('fill', '#edit-title', node.title),
      this.go('fill', 'textarea[name="body[und][0][value]"]', node.body),
      this.go('pressButton', '#edit-submit')
    ], done);
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
    var cntx = this.browser.query(context);
    var nodes = this.browser.queryAll(item, cntx);
    var next = this.browser.query('.pager-next a', cntx);
    async.eachSeries(nodes, function(node, done) {
      callback(node, done);
    }, function() {
      // Goto next page if it exists...
      if (next) {
        self.browser.clickLink(next, function() {
          self.eachViewItem(context, item, callback, done);
        });
      }
      else {
        // Otherwise, say we are done.
        done();
      }
    });
  }
};
