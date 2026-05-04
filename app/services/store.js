import { useLegacyStore } from '@warp-drive/legacy';
import { JSONAPICache } from '@warp-drive/json-api';

const LegacyStore = useLegacyStore({
  cache: JSONAPICache,
  legacyRequests: true,
});

export default class extends LegacyStore {}
