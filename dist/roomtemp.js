"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Roomtemp = /*#__PURE__*/function () {
  function Roomtemp(accessory, name, index, api, send, log) {
    _classCallCheck(this, Roomtemp);

    log("Creating Blind ".concat(index, " as ").concat(name));
    this.accessory = accessory;
    this.index = index;
    this.name = name;
    this.temperatureDisplayUnits = 0;
    this.blindPostioner = null;
    this.log = log;
    this.api = api;
    this.send = send;
    this.position = null;
    this.target = null;
    var _api$hap$Characterist = api.hap.Characteristic,
        CurrentHeatingCoolingState = _api$hap$Characterist.CurrentHeatingCoolingState,
        TargetHeatingCoolingState = _api$hap$Characterist.TargetHeatingCoolingState,
        CurrentTemperature = _api$hap$Characterist.CurrentTemperature,
        TargetTemperature = _api$hap$Characterist.TargetTemperature,
        TemperatureDisplayUnits = _api$hap$Characterist.TemperatureDisplayUnits;
    var service = this.accessory.getService(api.hap.Service.Thermostat) || this.accessory.addService(api.hap.Service.Thermostat, name);
    service.getCharacteristic(TemperatureDisplayUnits).on('get', this.getter('Get TemperatureDisplayUnits', this.temperatureDisplayUnits));
    service.getCharacteristic(CurrentTemperature).on('get', this.getter('Get CurrentTemperature', this.currentTemperature));
    service.getCharacteristic(TargetTemperature).on('get', this.getter('Get TargetTemperature', this.targetTemperature));
    service.getCharacteristic(CurrentHeatingCoolingState).on('get', this.getter('Get CurrentHeatingCoolingState', this.currentHeatingCoolingState));
    service.getCharacteristic(TargetHeatingCoolingState).on('get', this.getter('Get TargetHeatingCoolingState', this.targetHeatingCoolingState));
  }

  _createClass(Roomtemp, [{
    key: "getter",
    value: function getter(text, value) {
      var _this = this;

      return function (callback) {
        _this.log.debug("".concat(text, ": ").concat(value));

        if (callback) callback(null, value);
      };
    }
  }, {
    key: "setStatus",
    value: function setStatus() {}
  }]);

  return Roomtemp;
}();

var _default = Roomtemp;
exports["default"] = _default;