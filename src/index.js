import Platform from './platform';

export default (homebridge) => {
  const PluginName = 'homebridge-mygekko';
  const PlatformName = 'mygekko';

  console.log('*** TEST ***');
  homebridge.registerPlatform(PlatformName, Platform);
};
