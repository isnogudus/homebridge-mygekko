import Platform from './platform';

export default (homebridge) => {
  const PluginName = 'homebridge-mygekko';
  const PlatformName = 'mygekko';

  homebridge.registerPlatform(PlatformName, Platform);
};
