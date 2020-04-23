"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Blind = /*#__PURE__*/function () {
  function Blind(accessory, name, index, api, adjustment, send, log) {
    var _adjustment$min, _adjustment$max;

    _classCallCheck(this, Blind);

    log("Creating Blind ".concat(index, " as ").concat(name));
    this.accessory = accessory;
    this.index = index;
    this.name = name;
    this.blindPostioner = null;
    this.log = log;
    this.api = api;
    this.send = send;
    this.position = 0;
    this.target = null;
    this.min = Math.max(0, parseInt((_adjustment$min = adjustment === null || adjustment === void 0 ? void 0 : adjustment.min) !== null && _adjustment$min !== void 0 ? _adjustment$min : "0"));
    this.max = Math.min(100, parseInt((_adjustment$max = adjustment === null || adjustment === void 0 ? void 0 : adjustment.max) !== null && _adjustment$max !== void 0 ? _adjustment$max : "100"));
    var _this$api$hap = this.api.hap,
        Service = _this$api$hap.Service,
        Characteristic = _this$api$hap.Characteristic;
    this.accessory.on("identify", this.identify.bind(this));
    var service = this.accessory.getService(Service.WindowCovering) || this.accessory.addService(Service.WindowCovering, name);
    service.getCharacteristic(Characteristic.CurrentPosition).on("get", this.getCurrentPosition.bind(this));
    service.getCharacteristic(Characteristic.TargetPosition).on("get", this.getTargetPosition.bind(this)).on("set", this.setTargetPosition.bind(this)); // Note: iOS's Home App subtracts CurrentPosition from TargetPosition to determine if it's opening, closing or idle.
    // It absolutely doesn't care about Characteristic.PositionState, which is supposed to be :
    // PositionState.INCREASING = 1, PositionState.DECREASING = 0 or PositionState.STOPPED = 2
    // But in any case, let's still implement it

    service.getCharacteristic(Characteristic.PositionState).on("get", this.getPositionState.bind(this));
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
      if (this.target !== null && Math.abs(this.position - this.target) <= 2) callback(null, this.target);else callback(null, this.position);
    }
  }, {
    key: "getTargetPosition",
    value: function getTargetPosition(callback) {
      var position = this.target === null ? this.position : this.target;
      this.log("getTargetPosition ".concat(this.index, " "));
      this.log.debug(position);
      callback(null, position);
    }
  }, {
    key: "setTargetPosition",
    value: function setTargetPosition(position, callback, context) {
      this.log("setTargetPosition ".concat(this.index, " to ").concat(position));
      this.target = position;

      this._callBlind(position);

      callback(null);
    }
  }, {
    key: "getPositionState",
    value: function getPositionState(callback) {
      this.log("getPositionSate ".concat(this.index));

      switch (this.state) {
        case -1:
          callback(null, PositionState.DECREASING);
          break;

        case 1:
          callback(null, PositionState.INCREASING);
          break;

        default:
          callback(null, PositionState.STOPPED);
      }
    }
  }, {
    key: "setStatus",
    value: function setStatus(data) {
      var oldPosition = this.position;
      var sumState = data.sumstate.value.split(";");
      this.state = parseInt(sumState[0]);
      this.position = this._gekko2homebridge(parseFloat(sumState[1]));
      this.angle = parseFloat(sumState[2]);
      this.sumState = parseInt(sumState[3]);
      this.slotRotationalArea = parseInt(sumState[4]);

      if (this.index == "item13") {
        this.log.debug("item13 ".concat(this.min, " ").concat(this.max, " ").concat(sumState[1], " ").concat(parseFloat(sumState[1]), " ").concat(this._gekko2homebridge(parseFloat(sumState[1])), " ").concat(oldPosition, " ").concat(this.position, " ").concat(oldPosition != this.position));
      }

      if (oldPosition != this.position) {
        // Update service
        var _this$api$hap2 = this.api.hap,
            Service = _this$api$hap2.Service,
            Characteristic = _this$api$hap2.Characteristic;
        this.log.debug("Update position ".concat(this.index, " from ").concat(oldPosition, " to ").concat(this.position));
        var service = this.accessory.getService(Service.WindowCovering);
        if (service) service.getCharacteristic(Characteristic.CurrentPosition).setValue(this.position);
      }
    }
  }, {
    key: "_callBlind",
    value: function _callBlind(position) {
      this.log("_callBlind ".concat(this.index, " ").concat(position));
      clearTimeout(this.blindPostioner);
      this.blindPostioner = setTimeout(this._callBlindSetPosition.bind(this), 1000);
    }
  }, {
    key: "_callBlindSetPosition",
    value: function _callBlindSetPosition() {
      var target = this._homebridge2gekko(this.target);

      this.log.debug("_callBlindSetPosition ".concat(this.index, " to ").concat(target));
      this.send("/blinds/".concat(this.index, "/scmd/set"), "P".concat(target));
    }
  }, {
    key: "_homebridge2gekko",
    value: function _homebridge2gekko(position) {
      return Math.max(this.min, Math.min(this.max, 100 - position));
    }
  }, {
    key: "_gekko2homebridge",
    value: function _gekko2homebridge(position) {
      var pos;
      if (position < 10.0) pos = Math.floor(position);else if (position > 90.0) pos = Math.ceil(position);else pos = Math.round(position);
      if (pos <= this.min) return 0;
      if (pos >= this.max) return 100;
      return 100 - pos;
    }
  }]);

  return Blind;
}();

var _default = Blind;
exports["default"] = _default;