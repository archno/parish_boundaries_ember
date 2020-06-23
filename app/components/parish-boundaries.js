import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { oneWay } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { filterBy } from '@ember/object/computed';
import { debounce } from '@ember/runloop';
import { assign } from '@ember/polyfills';
import ENV from "../config/environment";

export default class ParishBoundariesComponent extends Component {

  @service store

  @oneWay('fetchLocations.isRunning') isLoading

  map = null
  type = "parish"
  geocoder = null
  deaneriesKml = null
  parishBoundariesKml = null
  address = null
  markerTooltipOpen = null
  currentDistance = null

  @tracked currentPosition = null
  @tracked statusMessage = null

  @tracked startLat = 29.987571
  @tracked startLng = -90.210292

  @tracked locations = []
  @tracked boundaries = true

  @tracked isParishesChecked = true
  @tracked isSchoolsChecked = false
  @tracked isOfficesChecked = false

  @filterBy('locations', 'type', 'Parish') parishes
  @filterBy('locations', 'type', 'School') schools
  @filterBy('locations', 'type', 'Office') offices

  get activeLocations(){
    assign([], this.isParishesChecked ? this.parishes : [], this.isSchoolsChecked ? this.schools : [], this.isOfficesChecked ? this.offices : [])
  }

  constructor(owner, args) {
    super(owner, args)
  }

  geoLocate(){
    if (navigator.geolocation) {
      const gno = new CircularGeofenceRegion({
        name: 'gno',
        latitude: 30.193627,
        longitude: -90.165482,
        radius: 61570 // meters ~ 186 miles from an arbitraty center point in LA
      })
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        if (gno.inside(lat, lng)) {
          this.startLat = lat
          this.startLng = lng
        }
      })
    }
  }

  @(task(function * () {
    this.statusMessage = 'Loading...'
    const center = this.map.map.getCenter()
    const distance = this.currentDistance
    const records = yield this.store.query('location', { type: this.type, lat: center.lat(), lng: center.lng(), distance: distance })
    const locations = records.toArray()
    let newLocations = []
    locations.forEach(location => {
      if (!this.locations.includes(location))
        newLocations.push(location)
    })
    this.statusMessage = null
    if (newLocations.length > 0)
      this.locations = this.locations.concat(newLocations)
  }).restartable()) fetchLocations;

  @action
  toggle(){
    if (this.boundaries){
      this.boundaries = false
      this.parishBoundariesKml.setMap(null)
      this.deaneriesKml.setMap(this.map.map)
    } else {
      this.boundaries = true
      this.deaneriesKml.setMap(null)
      this.parishBoundariesKml.setMap(this.map.map)
    }
  }

  @action
  onLoad(map){
    this.map = map
    this.geoLocate()
    this.geocoder = new google.maps.Geocoder();
    this.deaneriesKml = new window.google.maps.KmlLayer( { url: ENV.DEANERIES_KML_URL, preserveViewport: true } )
    this.parishBoundariesKml = new window.google.maps.KmlLayer( { url: ENV.PARISH_BOUNDARIES_KML_URL, preserveViewport: true } )
    this.parishBoundariesKml.setMap(map.map)
  }

  @action
  parishesSelected(){
    if (this.isParishesChecked){
      this.isParishesChecked = false
    } else {
      this.isParishesChecked = true
      if (this.parishes.length == 0){
        this.type = "parish"
        this.fetchLocations.perform()
      }
    }
  }

  @action
  officesSelected(){
    if (this.isOfficesChecked){
      this.isOfficesChecked = false
    } else {
      this.isOfficesChecked = true
      if (this.offices.length == 0){
        this.type = "office"
        this.fetchLocations.perform()
      }
    }
  }

  @action
  schoolsSelected(){
    if (this.isSchoolsChecked){
      this.isSchoolsChecked = false
    } else {
      this.isSchoolsChecked = true
      if (this.schools.length == 0){
        this.type = "school"
        this.fetchLocations.perform()
      }
    }
  }

  @action
  geoCodeAddress(){
    if (!this.address)
      return
    this.statusMessage = 'Searching...'
    const address = `${this.address}, Louisiana`
    const _this = this
    this.geocoder.geocode( { 'address': address}, function(results, status) {
      if (status == 'OK') {
        const position = results[0].geometry.location
        _this.map.map.setCenter(position)
        _this.map.map.setZoom(14)
        _this.currentPosition = position
      } else {
        _this.statusMessage = status
      }
    })
  }

  calcDistance(){
    //https://stackoverflow.com/questions/3525670/radius-of-viewable-region-in-google-maps-v3
    const bounds = this.map.map.getBounds()
    const center = bounds.getCenter()
    const ne = bounds.getNorthEast()
    const r = 3963.0
    const lat1 = center.lat() / 57.2958
    const lon1 = center.lng() / 57.2958
    const lat2 = ne.lat() / 57.2958
    const lon2 = ne.lng() / 57.2958
    const dis = r * Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1))
    this.currentDistance = dis
    this.fetchLocations.perform()
  }

  @action
  onBoundsChanged(){
    debounce(this, this.calcDistance, 1000);
  }

}

// https://stackoverflow.com/questions/50453003/html5-geolocation-api-with-geofencing
class CircularGeofenceRegion {
  constructor(opts) {
    Object.assign(this, opts)
  }

  inside(lat2, lon2) {
    const lat1 = this.latitude
    const lon1 = this.longitude
    const R = 63710; // Earth's radius in m
    return Math.acos(Math.sin(lat1)*Math.sin(lat2) +
                     Math.cos(lat1)*Math.cos(lat2) *
                     Math.cos(lon2-lon1)) * R < this.radius;
  }
}
