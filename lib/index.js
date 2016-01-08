var exec = require('child_process').spawn;

/* Return the identation level that the command is located at
 *
 * @param {String} line The command line to be analysed
 */
var getLevel = function(line) {
  var regexp = /^\s\s\s\s/;
  if (line.match(regexp)) {
    return getLevel(line.replace(regexp)) + 1;
  }

  return 0;
};

var Hon = function(script) {
  script += '\nexit\n';

  // All the commands to be executed
  this.commands = [];

  var stack = []; // Holds commands that are located at upper levels
  var currentLevel = 0; // Current analysing level
  var lines = script.split('\n'); // The commands array
  lines.forEach(function(line) {
    var level = getLevel(line);
    line = line.replace(/^\s*/g, '');

    if (currentLevel < level) {
      // Level's getting higher, start stacking up commands
      currentLevel = level;

      return stack.push({
        command: this.commands.pop(),
        stdin: [line],
      });
    } else if (currentLevel > level) {
      // Level's getting lower, de-stack commands
      currentLevel = level;

      // Insert the command on the last one's stdin
      var command = stack.pop();
      this.commands.push('echo "' + command.stdin.join(';') + '" | ' + command.command);
    } else if (level > 0) {
      // Level's above zero, accumulate commands to be inserted into other's stdin
      var command = stack[stack.length - 1];
      return command.stdin.push(line);
    }

    // Nothing fancy, just add the command
    this.commands.push(line);
  }, this);
};

/*
 * Public API
 */

/* Display the equivalent bash script */
Hon.prototype.bash = function() {
  return [
    '#!/bin/bash',
    '',
    this.commands.join('\n')
  ].join('\n');
};

/* Runs the input HonScript */
Hon.prototype.run = function() {
  // Execute a bash shell
  var bash = exec('bash');

  // Show the user everything that goes out on stdout
  bash.stdout.on('data', function(data) {
    console.log(data.toString());
  });

  // Also everything from stderr
  bash.stderr.on('data', function(data) {
      console.error(data.toString());
  });

  // Insert all the commands into the bash shell
  bash.stdin.write(this.commands.join('\n'));
  bash.stdin.end();
};

module.exports = Hon;
