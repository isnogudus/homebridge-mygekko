Platform = require( './platform.js');

export default (api) => {
  api.registerPlatform('homebridge-mygekko', 'mygekko', Platform);
};
