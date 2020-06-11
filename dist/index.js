"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _platform = _interopRequireDefault(require("./platform"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _default = function _default(homebridge) {
  var PluginName = 'homebridge-mygekko';
  var PlatformName = 'mygekko';
  homebridge.registerPlatform(PlatformName, _platform["default"]);
};

exports["default"] = _default;