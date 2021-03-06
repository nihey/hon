var fs = require('fs'),
    exec = require('child_process').spawn;

var Hon = function(script, options) {
  options = options || {};

  // Additional bash script arguments
  this.args = options.args || [];
  this.events = {};

  // All the commands to be executed
  this.commands = [];

  this._stack = []; // Holds commands that are located at upper levels

  var lines = script.split('\n'); // The commands array
  lines.forEach(function(line) {
    this._add(line);
  }, this);

  // If we have finished the script and the stack is still up, level it down
  if (this._stack.length !== 0) {
    this._levelDown('', 0);
  }
};

/*
 * Private API
 */

Hon.prototype._pad = function(number) {
  var string = '';
  for (var i = 0; i < number; i++) {
    string += '    ';
  }
  return string;
};

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
 * - Commentary or Blank line (do nothing)
 * - Go one identation level up
 * - Go one identation level down
 * - Add a command into another command's stdin
 * - Add a command into the list
 */
Hon.prototype._add = function(line) {
  var level = this._getLevel(line);
  // Now that we have the line level, simplify it
  line = line.replace(/^\s*/, '');

  if (line[0] === '#' || line.replace(/\s*$/, '') === '') {
    // Commentary or blank line (do nothing).
    return;
  }

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
  this._add(this._pad(level) + line);
};

/*
 * Public API
 */

/* Display the equivalent bash script */
Hon.prototype.bash = function() {
  return [
    '#!/bin/bash',
    '',
    this.commands.join('\n'),
  ].join('\n');
};

/* Runs the input HonScript */
Hon.prototype.run = function(callback) {
  callback = callback || function(){};
  var filename = '/tmp/hon-' + Math.random().toString(32).split('.')[1];

  fs.writeFileSync(filename, this.bash());

  // Execute a bash shell
  var bash = exec('bash', [filename].concat(this.args));

  // Bubble stdout and stderr
  ['stdout', 'stderr'].forEach(function(stream) {
    bash[stream].on('data', function(data) {
      this.trigger(stream, [data]);
    }.bind(this));
  }, this);

  bash.on('exit', function(status) {
    fs.unlinkSync(filename);
    callback(status);
  });
};

/*
 * Event System
 */

/* Attach an event callback
 *
 * Event callbacks may be:
 *
 * stdout -> stdout is being emitted
 * stderr -> stderr is being emitted
 *
 * @param {String} action Which action will have a callback attached
 * @param {Function} callback What will be executed when this event happen
 */
Hon.prototype.on = function(action, callback) {
  // Add the event action to the callback list
  this.events[action] = this.events[action] || [];
  this.events[action].push(callback);
};

/* Detach an event callback
 *
 * @param {String} action Which action will have event(s) detached
 * @param {Function} callback Which function will be detached. If none is
 *                            provided all callbacks are detached
 */
Hon.prototype.off = function(action, callback) {
  this.events[action] = this.events[action] || [];

  if(callback) {
    var index = this.events[action].indexOf(callback);
    (index !== -1) && this.events[action].splice(index, 1);
    return index !== -1;
  }

  this.events[action] = [];
};

/* Trigger an event
 *
 * @param {String} action Which event will be triggered
 * @param {Array} args Which arguments will be provided to the callbacks
 */
Hon.prototype.trigger = function(action, args) {
  this.events[action] = this.events[action] || [];

  args = args || [];
  this.events[action].forEach(function(callback) {
    callback.apply(null, args);
  });
};

module.exports = Hon;
