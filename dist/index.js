"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = exports.PlatformName = exports.PluginName = void 0;

var _platform = _interopRequireDefault(require("./platform"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var PluginName = 'homebridge-mygekko';
exports.PluginName = PluginName;
var PlatformName = 'mygekko';
exports.PlatformName = PlatformName;

var _default = function _default(api) {
  api.registerPlatform(PluginName, PlatformName, _platform["default"]);
};

exports["default"] = _default;