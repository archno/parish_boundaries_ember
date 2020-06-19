import DS from 'ember-data';
const { Model } = DS;

export default Model.extend({

  type: DS.attr('string'),
  name: DS.attr('string'),
  address: DS.attr('string'),
  address_2: DS.attr('string'),
  city: DS.attr('string'),
  state: DS.attr('string'),
  zip: DS.attr('number'),
  lat: DS.attr('string'),
  lng: DS.attr('string'),
  createdAt: DS.attr('date'),
  updatedAt: DS.attr('date'),
});
