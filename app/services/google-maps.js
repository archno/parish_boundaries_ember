import Service from '@ember/service';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import config from '../config/environment';

export default class GoogleMapsService extends Service {
  _promise = null;

  load() {
    if (!this._promise) {
      setOptions({ key: config.GOOGLE_MAPS_API_KEY, version: 'weekly' });
      this._promise = Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('geocoding'),
      ]);
    }
    return this._promise;
  }
}
