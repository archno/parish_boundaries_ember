'use strict';

module.exports = function (environment) {
  const ENV = {
    modulePrefix: 'parish-boundaries-ember',
    environment,
    rootURL: '/',
    host: 'http://localhost:3000',
    locationType: 'auto',
    pageTitle: {
      replace: true,
    },
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
      },
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    },
  };

  ENV.PARISH_BOUNDARIES_KML_URL = process.env.PARISH_BOUNDARIES_KML_URL
  ENV.DEANERIES_KML_URL = process.env.DEANERIES_KML_URL

  ENV['ember-google-maps'] = {
    key: process.env.GOOGLE_MAPS_API_KEY, // Using .env files in this example
    language: 'en',
    region: 'US',
    protocol: 'https',
    libraries: []
  }

  if (environment === 'development') {
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;
  }

  if (environment === 'production') {
    // here you can enable a production-specific feature
    ENV.host = process.env.HOST;
  }

  return ENV;
};
