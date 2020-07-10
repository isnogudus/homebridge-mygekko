import Platform, { Name, PluginName } from './platform';

export default (api) => {
  api.registerPlatform('homebridge-mygekko', 'mygekko', Platform);
};
