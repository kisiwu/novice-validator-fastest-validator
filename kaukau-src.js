module.exports = {
  enableLogs: true,
  exitOnFail: true,
  files: 'test/src',
  ext: '.test.ts',
  options: {
    bail: false,
    fullTrace: true,
    grep: '',
    ignoreLeaks: false,
    reporter: 'spec',
    retries: 0,
    slow: 200,
    timeout: 3000,
    ui: 'bdd',
    color: true,
  },
  parameters: {},
};
