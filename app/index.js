'use strict';
var util = require('util'),
    path = require('path'),
    chalk = require('chalk'),
    sh = require('execSync'),
    generators = require('yeoman-generator'),
    yosay = require('yosay');

module.exports = generators.Base.extend({
  contructor: function() {
    var defaultSettings = {
      machineId: 'example',
      gitHost: 'github.com',
      gitURI: 'https://github.com/drupal/drupal.git',
      gitRevision: '7.33',
      drupalDocroot: "",
      drupalProfile: 'standard',
      actions: '["deploy,"install"]',
      dbFile: '',
      drupalVersion: "7.x",
      drupalSiteSettings: 'sites/default/settings.php',
      drupalSiteFiles: 'site/default/files'
    }

    this.config.defaults(defaultSettings);
  },

  // Initialize by asking product name
  vampdInit: function () {
    var done = this.async(),
        prompts = [];

    this.machineId = this.config.get('machineId');

    prompts.push({
      type: 'string',
      name: 'machineId',
      message: 'What is the machine name of your site?' + chalk.red('(Required)'),
      validate: function (answer) {
        if ( answer === '' ) {
          return 'You must provide a Machine Name';
        }
        return true;
      }
    });

    prompts.push({
      type: 'confirm',
      name: 'git',
      message: 'Do you have a git repo for your site?',
      default: true,
    });

    // Bind the initial prompts
    this.prompt(prompts, function (answers) {
      this.machineId = answers.machineId;
      this.git = answers.git;
      done();
    }.bind(this));
  },

  // Get the git information
  vampdGit: function () {
    var done = this.async(),
        prompts = [];

    this.gitHost = this.config.get('gitHost');
    this.gitURI = this.config.get('gitURI');
    this.gitRevision = this.config.get('gitRevision');

    if (this.git) {
      // Ask gor the githost
      prompts.push({
        type: 'string',
        name: 'gitURI',
        message: 'What is the git host?',
        default: 'github.com'
      });
      // Ask for uri
      prompts.push({
        type: 'string',
        name: 'gitHost',
        message: 'What is the git uri?' + chalk.red('(Required)'),
        validate: function (answer) {
          if ( answer === '' ) {
            return 'You must provide a git uri';
          }
          return true;
        }
      });
      // What revision would you like to use
      prompts.push({
        type: 'string',
        name: 'gitRevision',
        message: 'What is the revision?',
        default: 'master',
        validate: function (answer) {
          if ( answer === '' ) {
            return 'You must provide a revision, tag, branch, etc.';
          }
          return true;
        }
      });
    } else {
      prompts.push({
        type: 'confirm',
        name: 'gitDrupal',
        message: 'Do you want to pull down a clean drupal site?',
        default: true
      });
    }
    this.prompt(prompts, function (answers) {
      if ( this.git ) {
        this.gitHost = answers.gitHost;
        this.gitURI = answers.gitURI;
        this.gitRevision = answers.gitRevision;
      } else {
        this.gitDrupal = answers.gitDrupal;
      }
      done();
    }.bind(this));
  },

  // If there is no git and they don't want drupal fail gracefully.
  vampdGitFail: function () {
    if ( !this.git && !this.gitDrupal ) {
      this.log('Sorry, a git project is required or you can choose to run drupal.');
      return false
    }
  },

  //Actions
  vampdActions: function () {
    var done = this.async(),
        prompts = [];

    this.log("Select an action to complete for your site.");
    this.log(chalk.yellow("[deploy]") + " -- places your code.");
    this.log(chalk.yellow("[install]") + " -- runs a clean site install on your code.");
    if (this.git) {
      this.log(chalk.yellow("[import]") + " -- brings in an existing db file");
      this.log(chalk.yellow("[update]") + " -- runs update.php.")
    }
    this.log("If you aren\'t sure what to select, go with the defaults.")
    this.log("Everything is editable later.");

    var actionChoices = [
      {
        name: "deploy",
        checked: true
      },
      {
        name: "install",
        checked: true
      },
    ];
    if (this.git) {
      var actionChoices = [
        {
          name: "deploy",
          checked: true
        },
        {
          name: "install",
          checked: true
        },
      ]
      actionChoices.push({
        name: "import"
      },
      {
        name: "update"
      });
    }
    prompts.push({
      type: "checkbox",
      message: "Select Actions",
      name: "actions",
      choices: actionChoices,
      validate: function( answer ) {
        if ( answer.length < 1 ) {
          return "You must choose at least one topping.";
        }
        return true;
      }
    });

    this.prompt(prompts, function (answers) {
      var actionsJSON = JSON.stringify(answers.actions, null, "");
      this.actions = answers.actions;
      this.actionsJSON = actionsJSON;
      done();
    }.bind(this));
  },

  // If install is true
  vampdInstall: function () {
    var done = this.async(),
        prompts = [];
    this.drupalProfile = this.config.get('drupalProfile');

    if ( this.actions.indexOf('install') >= 0 ) {
      prompts.push({
        type: 'string',
        name: 'drupalProfile',
        message: 'What install profile would you like to use?' + chalk.red('(Required)'),
        default: 'standard',
        validate: function (answer) {
          if ( answer === '' ) {
            return 'You must provide a drupal install profile';
          }
          return true;
        }
      });
    }
    this.prompt(prompts, function (answers) {
      this.drupalProfile = answers.drupalProfile;
      done();
    }.bind(this));
  },

  // If import is true, load up the file
  vampdImport: function () {
    var done = this.async(),
        prompts = [];
    this.dbFile = this.config.get('dbFile');
    if ( this.actions.indexOf('import') >= 0 ) {
      prompts.push({
        type: 'string',
        name: 'dbFile',
        message: 'Where is the db file located? Example: /vagrant/sites/db_file.sql' + chalk.red('(Required)'),
        validate: function (answer) {
          if ( answer === '' ) {
            return 'You must provide a db file location.';
          }
          return true;
        }
      });
    }
    this.prompt(prompts, function (answers) {
      this.dbFile = answers.dbFile;
      done();
    }.bind(this));
  },

  // Get the drupal version
  vampdDrupalVersion: function () {
    var done = this.async(),
        prompts = [];

    this.drupalVersion = this.config.get('drupalVersion');

    if ( this.git ) {
      prompts.push({
        type: "checkbox",
        message: "What major version of Drupal are you using?",
        name: "drupalVersion",
        choices: [
          {
            name: "6.x"
          },
          {
            name: "7.x",
            checked: true
          }
        ],
        validate: function( answer ) {
          if ( answer.length < 1 ) {
            return "You must choose a version.";
          }
          return true;
        }
      });
    }
    this.prompt(prompts, function (answers) {
      if ( this.git ) {
        this.drupalVersion = answers.drupalVersion;
      }
      done();
    }.bind(this));
  },

  // See if a Docroot is needed
  vampdDrupalDocrootInit: function () {
    var done = this.async(),
        prompts = [];
    if ( this.git ) {
      prompts.push({
        type: 'confirm',
        name: 'drupalDocrootInit',
        message: 'Are the files in a docroot besides the base? Example: "htdocs", "docroot"',
        default: false
      });
    }

    this.prompt(prompts, function (answers) {
      if ( this.git ) {
        this.drupalDocrootInit = answers.drupalDocrootInit;
      }
      done();
    }.bind(this));
  },

  // Get the Docroot, if it is needed
  vampdDrupalDocroot: function () {
    var done = this.async(),
        prompts = [];

    this.drupalDocroot = this.config.get('drupalDocroot');

    if ( this.drupalDocrootInit ) {
      prompts.push({
        type: 'string',
        name: 'drupalDocroot',
        message: 'What is the docroot? Example: "htdocs", "docroot"' + chalk.red('(Required)'),
        default: false,
        validate: function (answer) {
          if ( answer === '' ) {
            return 'You must provide a docroot location.';
          }
          return true;
        }
      });
    }

    this.prompt(prompts, function (answers) {
      this.drupalDocroot = answers.drupalDocroot;
      done();
    }.bind(this));
  },

  // Site files
  vampdDrupalSiteFiles: function () {
    var done = this.async(),
        prompts = [];
    this.drupalSiteFiles = this.config.get('drupalSiteFiles');
    if ( this.git ) {
      prompts.push({
        type: 'string',
        name: 'drupalSiteFiles',
        message: 'Where do your site files live, relative to the docroot?' + chalk.red('(Required)'),
        default: 'sites/default/files',
        validate: function (answer) {
          if ( answer === '' ) {
            return 'Your files must live somewhere. Please give them a home.';
          }
          return true;
        }
      });
    }

    this.prompt(prompts, function (answers) {
      if ( this.git ) {
        this.drupalSiteFiles = answers.drupalSiteFiles;
      }
      done();
    }.bind(this));
  },

  // Site settings.php
  vampdDrupalSiteSettings: function () {
    var done = this.async(),
        prompts = [];

    this.drupalSiteSettings = this.config.get('drupalSiteSettings');

    if ( this.git ) {
      prompts.push({
        type: 'string',
        name: 'drupalSiteSettings',
        message: 'Where does your sites settings.php live, relative to docroot?' + chalk.red('(Required)'),
        default: 'sites/default/settings.php',
        validate: function (answer) {
          if ( answer === '' ) {
            return 'Your settings.php must live somewhere. Please give it a home.';
          }
          return true;
        }
      });
    }

    this.prompt(prompts, function (answers) {
      if ( this.git ) {
        this.drupalSiteSettings = answers.drupalSiteSettings
      }
      done();
    }.bind(this));
  },
  //
  // Pipe this to JSON
  vampdSettingsToJSON: function () {

    this.log("Thank you so much! Your site role file will generate in a few moments");
    var mID = this.machineId;
    if (!this.options['skip-install']) {
      var projPath = './' + mID;
      if (!path.exists(projPath)) {
        sh.run('git clone https://github.com/vampd/vampd.git ' + ' ./' + mID);
      }
    }

    this.template('role.json', './' + mID + '/chef/roles/' + mID +'.json');
  },
});
