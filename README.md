drupal.go.js
------------------------

A node.js tool to automate and test Drupal using the headless browsers <a href="http://phantomjs.org/">Phantom.js</a>.

Introduction
========================
This node.js package provides an easy way to automate and test Drupal using the headless browser
<a href="http://phantomjs.org/">Phantom.js</a>.
It provides some helpers that make working with Drupal within a headless browser fun and easy.

Installation
=====================

Step 1
--------
Install node.js by going to http://nodejs.org

Step 2
--------
You can now install this library using NPM.

```
npm install drupalgo
```

Configuration
==============
The configuration for your automation and testing should be placed within a
configuration file in ```*.json``` form.  This file contains your configurations
for your Drupal installation as well as other configurations that you would like
to include in your automation and testing, such as content creation, etc.
```
{
  "host": "http://drupal.local/",
  "user": "admin",
  "nodes": [
    {
      "type": "article",
      "title": "Hello There",
      "body": "This is very cool!"
    },
    {
      "type": "article",
      "title": "This is another node",
      "body": "Nice!"
    }
  ]
}

```

Example
==============
You can now include this library in your test application and then do stuff
using the simple ```drupal.go``` command.  You can also call methods on the
Phantom browser instance using the <a href="https://github.com/travist/jquery.go.js">jquerygo</a> Interface.
You can read up on how to work with jQuery.go.js by going to https://github.com/travist/jquery.go.js.

For example, if you wish to click the submit button, you could do the following.

```
var drupal = require('drupalgo');
var $ = drupal.load('config.json');
$('#edit-submit').click(function() {
  console.log('Clicked the submit button');
});
```

This function returns a Promise to be used with the popular <a href="https://github.com/caolan/async">Async.js</a>
library making it very simple to build intuitive tests without falling into <a href="https://www.google.com/search?q=javascript+callback+hell">callback hell</a>.

Here is an example of how simple it is to write some automation with this library...

Login, then create some nodes....
```
var async =     require('async');
var drupal =    require('drupalgo');

// Load the config.json file... as seen above.
var browser = drupal.load('config.json');

// Login, then create some content...
async.series([
  drupal.go('login'),
  drupal.go('createMultipleContent', drupal.config.get('nodes'))
], function() {
  console.log('We are done!');
  drupal.close();
});
```

<strong>NOTE: It is very important to always close the browser using ```drupal.close()``` when you are done with your test to keep zombie browser processes from remaining.</strong>

Extending
================
This library is super easy to extend and create your own Drupal processes.  You
can do so by simply attaching them to the Drupal object and then they can be
utilized with ```drupal.go``` like other processes.  Here is an example.

```
var async =     require('async');
var drupal =    require('drupalgo');

// Add a new task to edit the node.
drupal.editNode = function(done) {
  async.series([
    this.go('visit', 'node/1234/edit'),
    this.go('fill', '#edit-title', 'Something else!'),
    this.go('pressButton', '#edit-submit')
  ], done);
};

// Load the config.json file... as seen above.
var browser = drupal.load('config.json');

// Login, then create some content, then EDIT A NODE!...
async.series([
  drupal.go('login'),
  drupal.go('createMultipleContent', drupal.config.get('nodes')),
  drupal.go('editNode')
], function() {
  console.log('We are done!');
  drupal.close();
});
```

Happy Automating....
