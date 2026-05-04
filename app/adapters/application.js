import { JSONAPIAdapter } from '@warp-drive/legacy/adapter/json-api';
import config from '../config/environment';

export default class ApplicationAdapter extends JSONAPIAdapter {
  host = config.host;
}
