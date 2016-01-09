var exec = require('child_process').spawn;

var Hon = function(script) {
  script += '\nexit\n';

  // All the commands to be executed
  this.commands = [];

  this._stack = []; // Holds commands that are located at upper levels

  var lines = script.split('\n'); // The commands array
  lines.forEach(function(line) {
    this._add(line);
  }, this);
};

/*
 * Private API
 */

/* Escape echoed strings
 *
 * This function escape any string that will be echoed, making it safe to nest
 * multiple echoes without corrupting the bash script.
 *
 * @param {String} string The string to be escaped
 */
Hon.prototype._escape = function(string) {
  // Replacing \ occurrences to \\ (one backslash to two backslashes):
  //   This is important because each time a echo is resolved, our backslashes
  //   number is halved, to we gotta be sure that there will be the right
  //   amount of backslashes needed to execute all the pipe.
  //
  // Replacing \" to \\" so that \":
  //   This makes sure \" will always have a odd amount of backslashes (because
  //   of the previous replacement -> \", \\\", ...), so it will sometime be
  //   resolved into \" , preventing the script corruption if it is resolved
  //   into \\" (a backslash and a double quote, instead of just a double
  //   quote).
  //
  //   e.g:
  //
  //   $ echo "echo \"echo \\\"final\\\"\""
  //   echo "echo \"final\""
  //   $ echo "echo \"final\""
  //   echo "final"
  //   $ echo "final"
  //   final
  string = string.replace(/\\/g, '\\\\').replace(/\\"/g, '\\\\"');

  // This will replace " occurrences into \", the check seems rather complex to
  // make sure only the " that are not previously escaped are escaped.
  var matches = string.match(/([^\\]")/g, '\\"') || [];
  matches.forEach(function(match) {
    string = string.replace(match, match[0] + '\\"');
  });

  return string;
};

/* Return the identation level that the command is located at
 *
 * @param {String} line The command line to be analysed
 */
Hon.prototype._getLevel = function(line) {
  var regexp = /^\s\s\s\s/;
  if (line.match(regexp)) {
    return this._getLevel(line.replace(regexp, '')) + 1;
  }

  return 0;
};

/* Add one line to HonScript commands
 *
 * This can take 4 distinct behaviors:
 *
 * - Go one identation level up
 * - Go one identation level down
 * - Add a command into another command's stdin
 * - Add a command into the list
 */
Hon.prototype._add = function(line) {
  var level = this._getLevel(line);
  // Now that we have the line level, simplify it
  line = line.replace(/^\s*/, '');

  if (this._stack.length < level) {
    // previous level is lower that current level, level up
    return this._levelUp(line, level);
  } else if (this._stack.length > level) {
    // previous level is higher that current level, level down
    return this._levelDown(line, level);
  } else if (level > 0) {
    // Level's above zero, accumulate commands to be inserted into other's stdin
    var command = this._stack[this._stack.length - 1];
    return command.stdin.push(line);
  }

  // Add the commands into the list
  this.commands.push(line);
};

/* Go one identation level up
 *
 * This is called when a identation level is going up.
 *
 * This basically involves stacking commands into a stack (duh), to be used
 * later when levelling the script down (identation going down).
 *
 * @param {String} line The command to be stacked
 * @param {Number} level The current script level (identation level)
 */
Hon.prototype._levelUp = function(line, level) {
  var command;

  if (this._stack.length) {
    // If there's something on the stack use it
    command = this._stack[this._stack.length - 1].stdin.pop();
  } else {
    // If there's nothing on the command stack, use the level 0 command
    command = this.commands.pop();
  }

  // Stack up commands to have their stdin injected
  this._stack.push({
    command: command,
    stdin: [line],
  });

  if (this._stack.length !== level) {
    // identation error
    throw "More and one identation raised in a single line hop";
  }
};

/* Go one identation level down
 *
 * Called when identation level is going down
 *
 * This command de-stack the last commands stacked by '_levelUp', and send
 * them into to a command's stdin by echoing them.
 *
 * @param {String} line The command to be de-stacked
 * @param {Number} level The current script level (identation level)
 */
Hon.prototype._levelDown = function(line, level) {
  // Take the last stacked command
  var tail = this._stack.pop();

  var array;
  if (this._stack.length) {
    // Use the previous stdin, if there's more stack above it
    array = this._stack[this._stack.length - 1].stdin;
  } else {
    // Or the level 0 command if there's no more stack
    array = this.commands;
  }

  // Add the escaped command into an echo statement to input it to the other
  // command's stdin
  var command = this._escape(tail.stdin.join(';'));
  array.push('echo "' + command  + '" | ' + tail.command);

  // If we haven't reached the current application level continue de-stacking
  // the commands
  if (this._stack.length !== level) {
    return this._levelDown(line, level);
  }

  // After finishing de-stacking the commands, proceed to the next command
  this._add(line);
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
