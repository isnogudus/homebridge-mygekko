import Platform from "./platform";

export default (homebridge) => {
  const Accessory = homebridge.platformAccessory;
  const { Service, Characteristic } = homebridge.hap;
  const UUIDGen = homebridge.hap.uuid;
  const PluginName = "homebridge-mygekko";
  const PlatformName = "mygekko";

  homebridge.registerPlatform(PluginName, PlatformName, Platform, true);
};