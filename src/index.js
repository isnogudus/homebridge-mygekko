import Platform from './platform';

export default (homebridge) => {
  const PluginName = 'homebridge-mygekko';
  const PlatformName = 'mygekko';

  console.log('*** TEST ***');
  0 / 0;
  homebridge.registerPlatform(PlatformName, Platform);
};
