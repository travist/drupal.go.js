drupal.go.js
------------------------

A node.js tool to automate and test Drupal using the headless browsers <a href="http://phantomjs.org/">Phantom.js</a> or <a href="http://zombie.labnotes.org/">Zombie.js</a>.

Introduction
========================
This node.js package provides an easy way to automate and test Drupal using headless browsers
such as <a href="http://phantomjs.org/">Phantom.js</a> or <a href="http://zombie.labnotes.org/">Zombie.js</a>.
It provides some helpers that make working with Drupal within a headless browser fun and easy.

Default Installation (using Phantom.js)
=====================

Step 1
--------
Install node.js by going to http://nodejs.org

Step 2
--------
Install phantom.js headless browser by going to http://phantomjs.org

Step 3
--------
You can now install this library using NPM.

```
npm install drupalgo
```

Using Zombie.js
======================
By default, this library uses Phantom.js, but it can easily be used with Zombie.js.
To install Zombie.js successfully you will need to perform the following steps.

Step 1
--------
On OS X install the <a href="https://github.com/kennethreitz/osx-gcc-installer">OSX GCC installer</a>.
<em>On Windows you'll need Cygwin to get access to GCC, Python, etc. <a href="https://github.com/joyent/node/wiki/Building-node.js-on-Cygwin-(Windows)">Read this</a> for detailed instructions and troubleshooting.</em>

Step 2
--------
Zombie.js currently requires 0.8 of node.js or earlier, so you will need to install the Node Version Manager (NVM).
Go to https://github.com/creationix/nvm and follow the installation section.

Step 3
--------
Now to use zombie, you will need to utilize a package called ```zombie-async```, which basically is a wrapper around
the Zombie.js headless browser for async libraries.  You can either include this in your package.json dependencies
or you can install it with NPM.  So, together with the NVM, the installation looks like the following.

```
nvm use 0.8
npm install zombie-async
```

Step 4
--------
You can now define Zombie.js as the browser by simply requiring the library as the browser option when loading the
drupal installation like so...

```
var drupal =    require('drupalgo');

// Tell Drupal to load the configuration.
var browser = drupal.load('config.json', {
  browser: require('zombie-async')
});

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
browser instance (Zombie or Phantom) using the <a href="http://zombie.labnotes.org/API">Zombie.js API</a>
for both the Phantom and Zombie browsers.  For example, if you wish to press a button
on the browser, you can do so using the ```pushButton``` command as follows...

```
drupal.go('pushButton', '#edit-submit')
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
