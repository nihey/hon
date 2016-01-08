#!/usr/bin/env node

var meow = require('meow'),
    Hon = require('../lib/index'),
    fs = require('fs');

var cli = meow({
  pkg: require('../package.json'),
  help: [
    'Usage',
    '  hon [options] <file>',
    '',
    'Options:',
    '  -b, --bash      just show the equivalent bash script',
    '',
  ]
});

if (!cli.input.length) {
  cli.showHelp();
}

var hon = new Hon(fs.readFileSync(cli.input[0]).toString());

if (cli.flags.b || cli.flags.bash) {
  console.log(hon.bash());
} else {
  hon.run();
}

