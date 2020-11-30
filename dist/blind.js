"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var TARGET_TRESHOLD = 3;

var Blind = /*#__PURE__*/function () {
  function Blind(accessory, name, index, api, adjustment, send, log) {
    var _this = this,
        _adjustment$min,
        _adjustment$max;

    _classCallCheck(this, Blind);

    _defineProperty(this, "getService", function () {
      return _this.accessory.getService(_this.api.hap.Service.WindowCovering);
    });

    log("Creating Blind ".concat(index, " as ").concat(name));
    this.accessory = accessory;
    this.index = index;
    this.name = name;
    this.blindPostioner = null;
    this.log = log;
    this.api = api;
    this.send = send;
    this.position = null;
    this.target = null;
    this.ignoreTarget = null;
    this.min = Math.max(0, parseInt((_adjustment$min = adjustment === null || adjustment === void 0 ? void 0 : adjustment.min) !== null && _adjustment$min !== void 0 ? _adjustment$min : '0', 10));
    this.max = Math.min(100, parseInt((_adjustment$max = adjustment === null || adjustment === void 0 ? void 0 : adjustment.max) !== null && _adjustment$max !== void 0 ? _adjustment$max : '100', 10));
    var _api$hap$Characterist = api.hap.Characteristic,
        CurrentPosition = _api$hap$Characterist.CurrentPosition,
        TargetPosition = _api$hap$Characterist.TargetPosition,
        PositionState = _api$hap$Characterist.PositionState;
    this.accessory.on('identify', this.identify.bind(this));
    var service = this.accessory.getService(api.hap.Service.WindowCovering) || this.accessory.addService(api.hap.Service.WindowCovering, name);
    service.getCharacteristic(CurrentPosition).on('get', this.getCurrentPosition.bind(this));
    service.getCharacteristic(TargetPosition).on('get', this.getTargetPosition.bind(this)).on('set', this.setTargetPosition.bind(this)); // Note: iOS's Home App subtracts CurrentPosition from TargetPosition to determine if it's
    // opening, closing or idle. It absolutely doesn't care about Characteristic.PositionState,
    // which is supposed to be :
    // PositionState.INCREASING = 1, PositionState.DECREASING = 0 or PositionState.STOPPED = 2
    // But in any case, let's still implement it

    service.getCharacteristic(PositionState).on('get', this.getPositionState.bind(this));
  }

  _createClass(Blind, [{
    key: "identify",
    value: function identify(paired, callback) {
      this.log("identify(paired: ".concat(paired, ")"));
      callback();
    }
  }, {
    key: "getCurrentPosition",
    value: function getCurrentPosition(callback) {
      this.log.debug("getCurrentPosition on ".concat(this.index, " pos: ").concat(this.position, " target: ").concat(this.target));
      callback(null, this.position);
    }
  }, {
    key: "getTargetPosition",
    value: function getTargetPosition(callback) {
      var position = this.target;
      this.log.debug("getTargetPosition of ".concat(this.index, ": ").concat(position));
      callback(null, position);
    }
  }, {
    key: "setTargetPosition",
    value: function setTargetPosition(position, callback) {
      if (this.target !== position) {
        this.log.debug("setTargetPosition of ".concat(this.index, " to ").concat(position));
        this.target = position;
        clearTimeout(this.blindPostioner);
        this.blindPostioner = setTimeout(this.callBlindSetPosition.bind(this), 500);
      }

      callback(null);
    }
  }, {
    key: "getPositionState",
    value: function getPositionState(callback) {
      this.log.debug("getPositionSate of ".concat(this.index));
      var PositionState = this.hap.Characteristic;
      var DECREASING = PositionState.DECREASING,
          INCREASING = PositionState.INCREASING,
          STOPPED = PositionState.STOPPED;

      switch (this.state) {
        case -1:
          callback(null, DECREASING);
          break;

        case 1:
          callback(null, INCREASING);
          break;

        default:
          callback(null, STOPPED);
      }
    }
  }, {
    key: "setStatus",
    value: function setStatus(data) {
      var oldPosition = this.position;
      var sumState = data.sumstate.value.split(';');
      this.state = parseInt(sumState[0], 10);
      var newPosition = this.gekko2homebridge(parseFloat(sumState[1]));

      if (this.position === null) {
        this.position = newPosition;
        this.target = newPosition;
      } else {
        this.position = Math.abs(newPosition - this.target) <= TARGET_TRESHOLD ? this.target : newPosition;
      }

      this.angle = parseFloat(sumState[2]);
      this.sumState = parseInt(sumState[3], 10);
      this.slotRotationalArea = parseInt(sumState[4], 10);
      var Characteristic = this.api.hap.Characteristic; // set state

      var positionState = this.getService().getCharacteristic(Characteristic.PositionState);
      this.getService().getCharacteristic(Characteristic.CurrentPosition).updateValue(this.position);
      var DECREASING = positionState.DECREASING,
          INCREASING = positionState.INCREASING,
          STOPPED = positionState.STOPPED;

      switch (this.state) {
        case -2:
        case -1:
          positionState.setValue(DECREASING);
          break;

        case 2:
        case 1:
          positionState.setValue(INCREASING);
          break;

        default:
          positionState.setValue(STOPPED);
          this.target = this.position;
          this.ignoreTarget = this.target;
          this.getService().getCharacteristic(Characteristic.TargetPosition).updateValue(this.target);
      }

      if (oldPosition !== this.position) {
        if (oldPosition === null) {
          this.log.debug("Initialize position ".concat(this.index, " to ").concat(this.position));
        } else {
          this.log.debug("Update position ".concat(this.index, " from ").concat(oldPosition, " to ").concat(this.position));
        }
      }
    }
  }, {
    key: "callBlindSetPosition",
    value: function callBlindSetPosition() {
      var target = this.homebridge2gekko(this.target);
      this.log.debug("_callBlindSetPosition ".concat(this.index, " to ").concat(target));
      this.send("/blinds/".concat(this.index, "/scmd/set"), "P".concat(target));
    }
  }, {
    key: "homebridge2gekko",
    value: function homebridge2gekko(position) {
      return Math.max(this.min, Math.min(this.max, 100 - position));
    }
  }, {
    key: "gekko2homebridge",
    value: function gekko2homebridge(position) {
      var pos;

      if (position < 10.0) {
        pos = Math.floor(position);
      } else if (position > 90.0) {
        pos = Math.ceil(position);
      } else {
        pos = Math.round(position);
      }

      if (pos <= this.min) pos = 0;
      if (pos >= this.max) pos = 100;
      return 100 - pos;
    }
  }]);

  return Blind;
}();

var _default = Blind;
exports["default"] = _default;