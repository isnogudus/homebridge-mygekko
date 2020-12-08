"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Thernmostat = /*#__PURE__*/function () {
  function Thernmostat(accessory, name, index, api, send, log) {
    var _this = this;

    _classCallCheck(this, Thernmostat);

    _defineProperty(this, "getService", function () {
      return _this.accessory.getService(_this.api.hap.Service.Thermostat);
    });

    log("Creating Thermostat ".concat(index, " as ").concat(name));
    this.accessory = accessory;
    this.index = index;
    this.name = name;
    this.temperatureDisplayUnits = 0;
    this.currentTemperature = 0;
    this.targetTemperature = 0;
    this.currentHeatingCoolingState = 0;
    this.targetHeatingCoolingState = 0;
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
    this.accessory.on('identify', this.identify.bind(this));
    var service = this.accessory.getService(api.hap.Service.Thermostat) || this.accessory.addService(api.hap.Service.Thermostat, name);
    service.getCharacteristic(TemperatureDisplayUnits).on('get', this.getter('Get TemperatureDisplayUnits', this.temperatureDisplayUnits));
    service.getCharacteristic(CurrentTemperature).on('get', this.getter('Get CurrentTemperature', this.currentTemperature));
    service.getCharacteristic(TargetTemperature).on('get', this.getter('Get TargetTemperature', this.targetTemperature));
    service.getCharacteristic(CurrentHeatingCoolingState).on('get', this.getter('Get CurrentHeatingCoolingState', this.currentHeatingCoolingState));
    service.getCharacteristic(TargetHeatingCoolingState).on('get', this.getter('Get TargetHeatingCoolingState', this.targetHeatingCoolingState));
  }

  _createClass(Thernmostat, [{
    key: "identify",
    value: function identify(paired, callback) {
      this.log("identify(paired: ".concat(paired, ")"));
      if (callback) callback();
    }
  }, {
    key: "getter",
    value: function getter(text, value) {
      var _this2 = this;

      return function (callback) {
        _this2.log.debug("".concat(text, ": ").concat(value));

        if (callback) callback(null, value);
      };
    }
  }, {
    key: "setStatus",
    value: function setStatus(data) {
      this.log.debug(data);
    }
  }]);

  return Thernmostat;
}();

var _default = Thernmostat;
exports["default"] = _default;