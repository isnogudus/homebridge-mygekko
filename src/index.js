const Platform = require("./platform");

module.exports = (homebridge) => {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  const PluginName = "homebridge-mygekko";
  const PlatformName = "mygekko";

  homebridge.registerPlatform(PluginName, PlatformName, Platform, true);
};