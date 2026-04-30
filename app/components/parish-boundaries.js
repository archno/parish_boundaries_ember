import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { oneWay, filterBy } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { debounce } from '@ember/runloop';
import ENV from '../config/environment';

export default class ParishBoundariesComponent extends Component {
  @service store;

  @oneWay('fetchLocations.isRunning') isLoading;

  map = null;
  type = 'parish';
  geocoder = null;
  deaneriesLayer = null;
  parishBoundariesLayer = null;
  infoWindow = null;
  @tracked address = null;
  @tracked markerTooltipOpen = null;
  markerClicked = false;
  currentDistance = null;

  @tracked currentPosition = null;
  @tracked statusMessage = null;

  @tracked startLat = 29.987571;
  @tracked startLng = -90.210292;

  @tracked locations = [];
  @tracked boundaries = true;

  @tracked isParishesChecked = true;
  @tracked isSchoolsChecked = false;
  @tracked isOfficesChecked = false;

  @filterBy('locations', 'type', 'Parish') parishes;
  @filterBy('locations', 'type', 'School') schools;
  @filterBy('locations', 'type', 'Office') offices;

  get mapId() {
    return ENV.GOOGLE_MAP_ID;
  }

  geoLocate() {
    if (navigator.geolocation) {
      const gno = new CircularGeofenceRegion({
        name: 'gno',
        latitude: 30.193627,
        longitude: -90.165482,
        radius: 61570, // meters ~ 186 miles from an arbitraty center point in LA
      });
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (gno.inside(lat, lng)) {
          this.startLat = lat;
          this.startLng = lng;
        }
      });
    }
  }

  get typesSelected() {
    let types = [];
    if (this.isParishesChecked) types.push('parish');
    if (this.isSchoolsChecked) types.push('school');
    if (this.isOfficesChecked) types.push('office');
    return types;
  }

  fetchLocations = task({ restartable: true }, async () => {
    const types = this.typesSelected;
    if (types.length == 0) return;
    this.statusMessage = 'Loading...';
    const center = this.map.map.getCenter();
    const distance = this.currentDistance;
    const records = await this.store.query('location', {
      types: types,
      lat: center.lat(),
      lng: center.lng(),
      distance: distance,
    });

    const locations = records.slice();
    let newLocations = [];
    locations.forEach((location) => {
      if (!this.locations.includes(location)) newLocations.push(location);
    });
    this.statusMessage = null;
    if (newLocations.length > 0)
      this.locations = this.locations.concat(newLocations);
  });

  @action
  toggle() {
    if (this.boundaries) {
      this.boundaries = false;
      this.parishBoundariesLayer.setMap(null);
      this.deaneriesLayer.setMap(this.map.map);
    } else {
      this.boundaries = true;
      this.deaneriesLayer.setMap(null);
      this.parishBoundariesLayer.setMap(this.map.map);
    }
  }

  async loadMarker() {
    await google.maps.importLibrary('marker');
  }

  @action
  onLoad(map) {
    this.loadMarker();
    this.map = map;
    this.geoLocate();
    this.geocoder = new google.maps.Geocoder();

    this.infoWindow = new google.maps.InfoWindow();

    this.parishBoundariesLayer = new google.maps.Data({ map: map.map });
    this.parishBoundariesLayer.loadGeoJson('/parish_boundaries04212026-2.json');
    this.parishBoundariesLayer.setStyle((feature) => ({
      fillColor: feature.getProperty('fill'),
      fillOpacity: feature.getProperty('fill-opacity'),
      strokeColor: feature.getProperty('stroke'),
      strokeOpacity: feature.getProperty('stroke-opacity'),
      strokeWeight: feature.getProperty('stroke-width'),
    }));
    this.parishBoundariesLayer.addListener('click', (event) => {
      if (this.markerClicked) { this.markerClicked = false; return; }
      const name = event.feature.getProperty('name');
      this.infoWindow.setContent(`<strong>${name}</strong>`);
      this.infoWindow.setPosition(event.latLng);
      this.infoWindow.open(this.map.map);
    });

    this.deaneriesLayer = new google.maps.Data({ map: null });
    this.deaneriesLayer.loadGeoJson('/deaneries.json');
    this.deaneriesLayer.setStyle((feature) => ({
      fillColor: feature.getProperty('fill'),
      fillOpacity: feature.getProperty('fill-opacity'),
      strokeColor: feature.getProperty('stroke'),
      strokeOpacity: feature.getProperty('stroke-opacity'),
      strokeWeight: feature.getProperty('stroke-width'),
    }));
    this.deaneriesLayer.addListener('click', (event) => {
      if (this.markerClicked) { this.markerClicked = false; return; }
      const name = event.feature.getProperty('name');
      const description = event.feature.getProperty('description');
      const descHtml = description?.value ?? '';
      this.infoWindow.setContent(`<strong>${name}</strong>${descHtml}`);
      this.infoWindow.setPosition(event.latLng);
      this.infoWindow.open(this.map.map);
    });
  }

  @action
  onMarkerClick(location) {
    this.markerClicked = true;
    this.markerTooltipOpen = location;
  }

  @action
  parishesSelected() {
    if (this.isParishesChecked) {
      this.isParishesChecked = false;
    } else {
      this.isParishesChecked = true;
      this.type = 'parish';
      this.fetchLocations.perform();
    }
  }

  @action
  officesSelected() {
    if (this.isOfficesChecked) {
      this.isOfficesChecked = false;
    } else {
      this.isOfficesChecked = true;
      this.type = 'office';
      this.fetchLocations.perform();
    }
  }

  @action
  schoolsSelected() {
    if (this.isSchoolsChecked) {
      this.isSchoolsChecked = false;
    } else {
      this.isSchoolsChecked = true;
      this.type = 'school';
      this.fetchLocations.perform();
    }
  }

  @action
  addressChanged(e) {
    this.address = e.target.value;
  }

  @action
  geoCodeAddress() {
    if (!this.address) return;
    this.statusMessage = 'Searching...';
    const address = `${this.address}, Louisiana`;
    const _this = this;
    this.geocoder.geocode({ address: address }, function (results, status) {
      if (status == 'OK') {
        const position = results[0].geometry.location;
        _this.map.map.setCenter(position);
        _this.map.map.setZoom(14);
        _this.currentPosition = position;
      } else {
        _this.statusMessage = status;
      }
    });
  }

  calcDistance() {
    //https://stackoverflow.com/questions/3525670/radius-of-viewable-region-in-google-maps-v3
    const bounds = this.map.map.getBounds();
    const center = bounds.getCenter();
    const ne = bounds.getNorthEast();
    const r = 3963.0;
    const lat1 = center.lat() / 57.2958;
    const lon1 = center.lng() / 57.2958;
    const lat2 = ne.lat() / 57.2958;
    const lon2 = ne.lng() / 57.2958;
    const dis =
      r *
      Math.acos(
        Math.sin(lat1) * Math.sin(lat2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1),
      );
    this.currentDistance = dis;
    this.fetchLocations.perform();
  }

  @action
  onBoundsChanged() {
    debounce(this, this.calcDistance, 1000);
  }
}

// https://stackoverflow.com/questions/50453003/html5-geolocation-api-with-geofencing
class CircularGeofenceRegion {
  constructor(opts) {
    Object.assign(this, opts);
  }

  inside(lat2, lon2) {
    const lat1 = this.latitude;
    const lon1 = this.longitude;
    const R = 63710; // Earth's radius in m
    return (
      Math.acos(
        Math.sin(lat1) * Math.sin(lat2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1),
      ) *
        R <
      this.radius
    );
  }
}
