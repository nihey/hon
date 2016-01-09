#!/usr/bin/env node

var meow = require('meow'),
    Hon = require('../lib/index'),
    fs = require('fs');

var cli = meow({
  pkg: require('../package.json'),
  help: [
    'Usage',
    '  hon [options] <file> [...args]',
    '',
    'Options:',
    '  -b, --bash      just show the equivalent bash script',
    '  -q, --quiet     do not show stdout and stderr',
    '',
  ]
});

if (!cli.input.length) {
  cli.showHelp();
}

var script = fs.readFileSync(cli.input[0]).toString();
var hon = new Hon(script, {
  args: cli.input.slice(1),
});

if (cli.flags.b || cli.flags.bash) {
  console.log(hon.bash());
  process.exit();
}

if (!cli.flags.q && !cli.flags.quiet) {
  hon.on('stdout', function(data) {
    process.stdout.write(data);
  });

  hon.on('stderr', function(data) {
    process.stderr.write(data);
  });
}

hon.run();
