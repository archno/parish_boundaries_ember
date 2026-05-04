import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { task } from 'ember-concurrency';
import { debounce } from '@ember/runloop';
import { modifier } from 'ember-modifier';
import ENV from '../config/environment';

export default class ParishBoundariesComponent extends Component {
  @service store;
  @service googleMaps;

  map = null;
  geocoder = null;
  infoWindow = null;
  deaneriesLayer = null;
  parishBoundariesLayer = null;
  markers = new Map();
  currentPositionMarker = null;
  currentDistance = null;

  @tracked statusMessage = null;
  @tracked boundaries = true;
  @tracked isParishesChecked = true;
  @tracked isSchoolsChecked = false;
  @tracked isOfficesChecked = false;

  locations = [];

  mapModifier = modifier((element) => {
    this.setupMap(element);
  });

  async setupMap(element) {
    await this.googleMaps.load();

    this.map = new google.maps.Map(element, {
      mapId: ENV.GOOGLE_MAP_ID,
      center: { lat: 29.987571, lng: -90.210292 },
      zoom: 12,
    });

    this.geocoder = new google.maps.Geocoder();
    this.infoWindow = new google.maps.InfoWindow();

    this.map.addListener('bounds_changed', () =>
      debounce(this, this.calcDistance, 1000),
    );

    this.geoLocate();
    this.setupDataLayers();
  }

  setupDataLayers() {
    this.parishBoundariesLayer = new google.maps.Data({ map: this.map });
    this.parishBoundariesLayer.loadGeoJson('/parish_boundaries04212026-2.json');
    this.parishBoundariesLayer.setStyle((feature) => ({
      fillColor: feature.getProperty('fill'),
      fillOpacity: feature.getProperty('fill-opacity'),
      strokeColor: feature.getProperty('stroke'),
      strokeOpacity: feature.getProperty('stroke-opacity'),
      strokeWeight: feature.getProperty('stroke-width'),
    }));
    this.parishBoundariesLayer.addListener('click', (event) => {
      if (this._markerClicked) return;
      const name = event.feature.getProperty('name');
      this.infoWindow.setContent(`<strong>${name}</strong>`);
      this.infoWindow.setPosition(event.latLng);
      this.infoWindow.open(this.map);
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
      if (this._markerClicked) return;
      const name = event.feature.getProperty('name');
      const description = event.feature.getProperty('description');
      const descHtml = description?.value ?? '';
      this.infoWindow.setContent(`<strong>${name}</strong>${descHtml}`);
      this.infoWindow.setPosition(event.latLng);
      this.infoWindow.open(this.map);
    });
  }

  createMarker(location) {
    const marker = new google.maps.marker.AdvancedMarkerElement({
      map: this.markerShouldShow(location) ? this.map : null,
      position: { lat: location.lat, lng: location.lng },
      content: location.iconImg,
    });

    marker.addListener('gmp-click', () => {
      this._markerClicked = true;
      this.infoWindow.setContent(`
        <div class="text-center">
          <h2><a href="https://nolacatholic.org/search?query=${encodeURIComponent(location.name)}" target="_blank">${location.name}</a></h2>
          <p>${location.address}${location.address_2 ? '<br>' + location.address_2 : ''}<br>
          <span>${location.city}, ${location.state} ${location.zip}</span></p>
        </div>
      `);
      this.infoWindow.open(this.map, marker);
      setTimeout(() => { this._markerClicked = false; }, 0);
    });

    this.markers.set(location.id, marker);
  }

  markerShouldShow(location) {
    switch (location.type) {
      case 'Parish':
        return this.isParishesChecked;
      case 'School':
        return this.isSchoolsChecked;
      case 'Office':
        return this.isOfficesChecked;
      default:
        return false;
    }
  }

  updateMarkerVisibility(type, visible) {
    for (const [id, marker] of this.markers) {
      const location = this.locations.find((l) => l.id === id);
      if (location?.type === type) {
        marker.map = visible ? this.map : null;
      }
    }
  }

  geoLocate() {
    if (!navigator.geolocation) return;
    const gno = new CircularGeofenceRegion({
      name: 'gno',
      latitude: 30.193627,
      longitude: -90.165482,
      radius: 61570, // meters ~ 186 miles from an arbitrary center point in LA
    });
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude: lat, longitude: lng } = position.coords;
      if (gno.inside(lat, lng)) {
        this.map.setCenter({ lat, lng });
      }
    });
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
    if (types.length === 0) return;
    this.statusMessage = 'Loading...';
    const center = this.map.getCenter();
    const records = await this.store.query('location', {
      types,
      lat: center.lat(),
      lng: center.lng(),
      distance: this.currentDistance,
    });

    const newLocations = records.filter(
      (loc) => !this.locations.find((l) => l.id === loc.id),
    );
    newLocations.forEach((location) => this.createMarker(location));
    this.locations = this.locations.concat(newLocations);
    this.statusMessage = null;
  });

  calcDistance() {
    // https://stackoverflow.com/questions/3525670/radius-of-viewable-region-in-google-maps-v3
    const bounds = this.map.getBounds();
    const center = bounds.getCenter();
    const ne = bounds.getNorthEast();
    const r = 3963.0;
    const lat1 = center.lat() / 57.2958;
    const lon1 = center.lng() / 57.2958;
    const lat2 = ne.lat() / 57.2958;
    const lon2 = ne.lng() / 57.2958;
    this.currentDistance =
      r *
      Math.acos(
        Math.sin(lat1) * Math.sin(lat2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1),
      );
    this.fetchLocations.perform();
  }

  @action
  toggle() {
    this.boundaries = !this.boundaries;
    if (this.boundaries) {
      this.deaneriesLayer.setMap(null);
      this.parishBoundariesLayer.setMap(this.map);
    } else {
      this.parishBoundariesLayer.setMap(null);
      this.deaneriesLayer.setMap(this.map);
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
    this.geocoder.geocode(
      { address: `${this.address}, Louisiana` },
      (results, status) => {
        if (status === 'OK') {
          const position = results[0].geometry.location;
          this.map.setCenter(position);
          this.map.setZoom(14);
          if (this.currentPositionMarker) {
            this.currentPositionMarker.position = position;
          } else {
            this.currentPositionMarker =
              new google.maps.marker.AdvancedMarkerElement({
                map: this.map,
                position,
              });
          }
          this.statusMessage = null;
        } else {
          this.statusMessage = status;
        }
      },
    );
  }

  @action
  parishesSelected() {
    this.isParishesChecked = !this.isParishesChecked;
    this.updateMarkerVisibility('Parish', this.isParishesChecked);
    if (this.isParishesChecked) this.fetchLocations.perform();
  }

  @action
  officesSelected() {
    this.isOfficesChecked = !this.isOfficesChecked;
    this.updateMarkerVisibility('Office', this.isOfficesChecked);
    if (this.isOfficesChecked) this.fetchLocations.perform();
  }

  @action
  schoolsSelected() {
    this.isSchoolsChecked = !this.isSchoolsChecked;
    this.updateMarkerVisibility('School', this.isSchoolsChecked);
    if (this.isSchoolsChecked) this.fetchLocations.perform();
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
