let Platform = require( './platform');

module.exports = (api) => {
  api.registerPlatform('homebridge-mygekko', 'mygekko', Platform);
};
