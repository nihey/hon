var Hon = require('../lib'),
    assert = require('assert'),
    fs = require('fs');

var read = function(filename) {
  return fs.readFileSync('test/fixtures/' + filename).toString();
};

describe('Multi Level Bash Scripts', function() {
  var test = function(title, script, options) {
    it(title, function(next) {
      // Load the script
      var hon = new Hon(read(script + '.hon'), options);

      // Check if the script's bash equivalent is equal
      assert.equal(hon.bash(), read(script + '.sh'));

      // Accumulate the script's stdout
      var stdout = '';
      hon.on('stdout', function(data) {
        stdout += data.toString();
      });

      hon.run(function() {
        // Check if the expected stdout match with the given one
        assert.equal(stdout, read(script + '.out'));
        // Proceed to the next text
        next();
      });
    });
  };

  test('Parses common bash scripts', 'bash');
  test('Parses simple hon scripts', 'simple');
  test('Executes multi-levelled scripts', 'levels');
  test('Transport arguments to upper levels', 'arguments', {
    args: ['Obi-Wan', 'Anakin'],
  });
});
