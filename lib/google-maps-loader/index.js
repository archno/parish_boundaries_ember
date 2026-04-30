'use strict';

module.exports = {
  name: require('./package').name,

  contentFor(type) {
    if (type === 'head-footer') {
      const key = process.env.GOOGLE_MAPS_API_KEY;
      return `<script src="https://maps.googleapis.com/maps/api/js?key=${key}&loading=async" async></script>`;
    }
  },
};
