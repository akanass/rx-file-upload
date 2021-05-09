const join = require('path').join;

require('ts-node').register({
  project: join(__dirname, 'tsconfig.build.json'),
});

module.exports = require(join(__dirname, 'rollup.config.ts'));
