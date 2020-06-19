/* eslint-env node */

'use strict';

const path = require('path');

module.exports = function(/* env */) {
  return {
    clientAllowedKeys: ['GOOGLE_MAPS_API_KEY', 'HOST', 'PARISH_BOUNDARIES_KML_URL', 'DEANERIES_KML_URL'],
    fastbootAllowedKeys: [],
    failOnMissingKey: false,
    path: path.join(path.dirname(__dirname), '.env')
  }
};
