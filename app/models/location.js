import Model, { attr } from '@ember-data/model';
import config from '../config/environment';

export default class LocationModel extends Model {

  @attr type;
  @attr name;
  @attr address;
  @attr address_2;
  @attr city;
  @attr state;
  @attr('number') zip;
  @attr lat;
  @attr lng;
  @attr('boolean') flag; //when type is school and flag is true then is a high school
  @attr color;
  @attr('date') createdAt;
  @attr('date') updatedAt;

  get mapPinLetter(){
    return this.type.charAt(0)
  }

  get icon(){
    return `${config.host}/m/${this.mapPinLetter}.png`
  }

}
