import Platform from './platform';

export const PluginName = 'homebridge-mygekko';
export const PlatformName = 'mygekko';

export default (api) => {
  api.registerPlatform(PluginName, PlatformName, Platform);
};
