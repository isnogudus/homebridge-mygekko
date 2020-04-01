"use strict";

var Platform = require("./platform");

module.exports = function (homebridge) {
  Accessory = homebridge.platformAccessory;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;
  var PluginName = "homebridge-mygekko";
  var PlatformName = "mygekko";
  homebridge.registerPlatform(PluginName, PlatformName, Platform, true);
};