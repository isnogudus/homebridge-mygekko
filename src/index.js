import Platform from "./platform";

export default (homebridge) => {
  var Accessory = homebridge.platformAccessory;
  var { Service, Characteristic, UUIDGen } = homebridge.hap;
  var PluginName = "homebridge-mygekko";
  var PlatformName = "mygekko";

  homebridge.registerPlatform(PluginName, PlatformName, Platform, true);
};