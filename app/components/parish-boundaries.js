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

  locations = []
  type = "parish"
  @tracked boundaries = true

  @tracked isParishesChecked = true
  @tracked isSchoolsChecked = false
  @tracked isOfficesChecked = false

  @filterBy('locations', 'type', 'parish') parishes
  @filterBy('locations', 'type', 'school') schools
  @filterBy('locations', 'type', 'office') offices

  get activeLocations(){
    assign([], this.isParishesChecked ? this.parishes : [], this.isSchoolsChecked ? this.schools : [], this.isOfficesChecked ? this.offices : [])
  }

  constructor(owner, args) {
    super(owner, args)
    this.fetchLocations.perform()
  }

  @(task(function * () {
    const locations = yield this.store.query('location', { type: this.type})
    this.locations.push(locations.toArray())
  }).restartable()) fetchLocations;

  get deaneries(){
    return new window.google.maps.KmlLayer( { url: ENV.DEANERIES_KML_URL, preserveViewport: true } )
  }

  get parishBoundaries(){
    return new window.google.maps.KmlLayer( { url: ENV.PARISH_BOUNDARIES_KML_URL, preserveViewport: true } )
  }

  loadKml(){
    if (this.boundaries){
      this.deaneries.setMap(null)
      this.parishBoundaries.setMap(this.map.map)
    } else {
      this.parishBoundaries.setMap(null)
      this.deaneries.setMap(this.map.map)
    }
  }

  @action
  toggle(){
    if (this.boundaries){
        this.boundaries = false
    } else {
        this.boundaries = true
    }
    this.loadKml()
  }

  @action
  onLoad(map){
    this.map = map
    this.loadKml()
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

}
