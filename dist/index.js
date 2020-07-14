"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _platform = _interopRequireDefault(require("./platform"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _default = function _default(api) {
  api.registerPlatform('homebridge-mygekko', 'mygekko', _platform["default"]);
};

exports["default"] = _default;