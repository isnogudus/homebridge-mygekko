import Platform from './platform.mjs';

export default (api) => {
  api.registerPlatform('homebridge-mygekko', 'mygekko', Platform);
};
