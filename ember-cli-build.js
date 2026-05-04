'use strict';;
const EmberApp = require('ember-cli/lib/broccoli/ember-app');

const {
  compatBuild
} = require("@embroider/compat");

module.exports = async function(defaults) {
  const { setConfig } = await import('@warp-drive/build-config');
  const {
    buildOnce
  } = await import("@embroider/vite");

  const app = new EmberApp(defaults, {
    emberData: {
    },
    babel: {
      plugins: [
        require.resolve('ember-concurrency/async-arrow-task-transform'),
      ],
    },
    fingerprint: {
      exclude: ['m/'],
    },
  });

  setConfig(app, __dirname, {});

  return compatBuild(app, buildOnce);
};
