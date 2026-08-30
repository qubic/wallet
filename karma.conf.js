// Karma configuration for `ng test`.
//
// The custom launcher forces Chrome's new headless mode, and the timeouts are
// raised well above the defaults: unlocking a v3 vault runs Argon2id (64 MB,
// t=3) synchronously on the main thread, which blocks Karma's ping long enough
// for a default-configured run to be dropped as a disconnect.
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {
        timeoutInterval: 60000,
      },
      clearContext: true,
    },
    reporters: ['progress'],
    customLaunchers: {
      ChromeHeadlessNew: {
        base: 'ChromeHeadless',
        flags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
      },
    },
    browsers: ['ChromeHeadlessNew'],
    captureTimeout: 180000,
    pingTimeout: 120000,
    browserNoActivityTimeout: 180000,
    browserDisconnectTimeout: 30000,
    browserDisconnectTolerance: 2,
    restartOnFileChange: false,
  });
};
