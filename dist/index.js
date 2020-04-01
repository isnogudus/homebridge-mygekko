"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _platform = _interopRequireDefault(require("./platform"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _default = function _default(homebridge) {
  var Accessory = homebridge.platformAccessory;
  var _homebridge$hap = homebridge.hap,
      Service = _homebridge$hap.Service,
      Characteristic = _homebridge$hap.Characteristic,
      UUIDGen = _homebridge$hap.UUIDGen;
  var PluginName = "homebridge-mygekko";
  var PlatformName = "mygekko";
  homebridge.registerPlatform(PluginName, PlatformName, _platform["default"], true);
};

exports["default"] = _default;