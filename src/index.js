import Platform, { Name, PluginName } from './platform';

export default (api) => {
  api.registerPlatform(PluginName, Platform);
};
