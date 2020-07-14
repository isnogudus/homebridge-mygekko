import Platform from './platform';

export default (api) => {
  api.registerPlatform('homebridge-mygekko', 'mygekko', Platform);
};
