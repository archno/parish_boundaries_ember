import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import { filterBy } from '@ember/object/computed';
import { assign } from '@ember/polyfills';
import ENV from "../config/environment";

export default class ParishBoundariesComponent extends Component {

  @service store

  map = null
  type = "parish"
  geocoder = null
  deaneriesKml = null
  parishBoundariesKml = null
  address = null
  markerTooltipOpen = null

  @tracked currentPosition = null
  @tracked errorMessage = null

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
    this.fetchLocations.perform()
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
    const locations = yield this.store.query('location', { type: this.type})
    this.locations = this.locations.concat(locations.toArray())
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
    this.errorMessage = null
    const address = `${this.address}, Louisiana`
    const _this = this
    this.geocoder.geocode( { 'address': address}, function(results, status) {
      if (status == 'OK') {
        const position = results[0].geometry.location
        _this.map.map.setCenter(position)
        _this.map.map.setZoom(14)
        // 1200 ridgelake
        _this.currentPosition = position
      } else {
        _this.errorMessage = status
      }
    })
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
