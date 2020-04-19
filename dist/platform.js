"use strict";

var _blind = _interopRequireDefault(require("./blind"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var http = require("http");

var url = require("url");

var axios = require("axios");

var PluginName = "homebridge-mygekko";
var PlatformName = "mygekko";

var Platform = /*#__PURE__*/function () {
  function Platform(log, config, api) {
    var _this = this;

    _classCallCheck(this, Platform);

    this.log = log;
    this.config = config;
    this.updater = null;
    this.blindPostioner = null;
    this.blinds = {};
    this.blindAccessories = {};
    this.targetPositions = {};
    this.blindsTargetPositions = null;

    if (!config || !config.user || !config.password || !config.host) {
      this.log.error("Platform config incorrect or missing. Check the config.json file.");
      return;
    }

    var user = config.user,
        password = config.password,
        host = config.host,
        blindAdjustment = config.blindAdjustment;
    this.username = user;
    this.password = password;
    this.host = host;
    this.blindAdjustment = blindAdjustment || {};
    this.url = "http://".concat(this.host, "/api/v1/var");
    this.accessories = {};
    this.log("Starting MyGEKKO Platform using homebridge API", api.version);

    if (api) {
      // save the api for use later
      this.api = api; // if finished loading cache accessories

      this.api.on("didFinishLaunching", function () {
        // Fetch the devices
        _this._fetchDevices();
      });
    }
  }

  _createClass(Platform, [{
    key: "_send",
    value: function _send() {
      var path = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : undefined;
      var url = this.url,
          username = this.username,
          password = this.password;
      var params = value === undefined ? {
        username: username,
        password: password
      } : {
        username: username,
        password: password,
        value: value
      };
      return axios.get(url + path, {
        params: params
      });
    }
  }, {
    key: "_callBlindsTargetPositions",
    value: function _callBlindsTargetPositions() {
      var _this2 = this;

      var target = this.blindsTargetPositions;
      this.blindsTargetPositions = {};

      var _loop = function _loop(index) {
        var _target$index = target[index],
            newPosition = _target$index.newPosition,
            callback = _target$index.callback;

        _this2.log.debug("_callBlindsTargetPositions ".concat(index, " to ").concat(newPosition)); // Send stop


        _this2._send("/blinds/".concat(index, "/scmd/set"), "0").then(function () {
          _this2.log.debug("Stop signal send -> ".concat(index));

          _this2._send("/blinds/".concat(index, "/scmd/set"), "P".concat(newPosition)).then(function (request) {
            _this2.log.debug("New position send -> ".concat(index, " to ").concat(newPosition));

            callback(null);
          })["catch"](function (error) {
            callback(new Error("Error in SetTargetPosition"));

            _this2.log.error(error);
          });
        })["catch"](function (error) {
          callback(new Error("Error in SetTargetPosition"));

          _this2.log.error(error);
        });
      };

      for (var index in target) {
        _loop(index);
      }
    }
  }, {
    key: "_setBlindTargetPosition",
    value: function _setBlindTargetPosition(index, position, callback) {
      this.log("_setBlindTargetPosition ".concat(index, " ").concat(position));
      clearTimeout(this.blindPostioner); // correct the blinds

      var _this$blinds$index = this.blinds[index],
          min = _this$blinds$index.min,
          max = _this$blinds$index.max;
      var newPosition = Math.min(max, Math.max(min, position));
      this.log("_setBlindTargetPosition ".concat(newPosition, " ").concat(min, " ").concat(max));
      this.blindsTargetPositions = _objectSpread({}, this.blindsTargetPositions, _defineProperty({}, index, {
        newPosition: newPosition,
        callback: callback
      }));
      this.blindPostioner = setTimeout(this._callBlindsTargetPositions.bind(this), 500);
    }
  }, {
    key: "_fetchDevices",
    value: function _fetchDevices() {
      var _this3 = this;

      this.log.debug("Fetch the devices");
      var _this$api$hap = this.api.hap,
          Service = _this$api$hap.Service,
          Characteristic = _this$api$hap.Characteristic,
          UUIDGen = _this$api$hap.uuid;

      this._send().then(function (response) {
        var blinds = response.data.blinds;

        for (var index in blinds) {
          var _this3$accessories$uu;

          var blind = blinds[index];
          var name = blind.name; //this._registerBlind(index, blind.name);

          var uuid = UUIDGen.generate(name);

          _this3.log.debug("Cached : ".concat(uuid in _this3.accessories));

          var accessory = (_this3$accessories$uu = _this3.accessories[uuid]) !== null && _this3$accessories$uu !== void 0 ? _this3$accessories$uu : new Accessory(name, uuid);
          _this3.blinds[index] = new _blind["default"](accessory, name, index, _this3.api, _this3.blindAdjustment[index], _this3._send.bind(_this3), _this3.log);
        }

        _this3._getStatus(); //this.log.debug(response.data.blinds)

      })["catch"](function (error) {
        console.log(error);
      });
    }
  }, {
    key: "_registerBlind",
    value: function _registerBlind(index, name) {
      var _this$blindAdjustment, _this$blindAdjustment2, _this$blindAdjustment3, _this$blindAdjustment4;

      var _this$api$hap2 = this.api.hap,
          Service = _this$api$hap2.Service,
          Characteristic = _this$api$hap2.Characteristic,
          UUIDGen = _this$api$hap2.uuid;
      this.log("Creating Blind ".concat(index, " as ").concat(name));
      var uuid = UUIDGen.generate(name);
      this.log("Cached : ".concat(uuid in this.accessories));
      this.blinds[index] = {
        position: 0,
        targetPosition: null,
        min: Math.max(0, parseInt((_this$blindAdjustment = (_this$blindAdjustment2 = this.blindAdjustment[index]) === null || _this$blindAdjustment2 === void 0 ? void 0 : _this$blindAdjustment2.min) !== null && _this$blindAdjustment !== void 0 ? _this$blindAdjustment : "0")),
        max: Math.min(100, parseInt((_this$blindAdjustment3 = (_this$blindAdjustment4 = this.blindAdjustment[index]) === null || _this$blindAdjustment4 === void 0 ? void 0 : _this$blindAdjustment4.max) !== null && _this$blindAdjustment3 !== void 0 ? _this$blindAdjustment3 : "100"))
      };
      var accessory = this.accessories[uuid] || new Accessory(name, uuid);
      accessory.on("identify", function (paired, callback) {
        this.log(accessory.displayName, "Identify!!!");
        callback();
      }.bind(this));
      var service = accessory.getService(Service.WindowCovering) || accessory.addService(Service.WindowCovering, name);
      service.getCharacteristic(Characteristic.CurrentPosition).on("get", function (callback) {
        var _status$targetPositio;

        var status = this.blinds[index];

        if (!status) {
          this.log.error("No status for ".concat(index));
          return;
        }

        var position = this._position(index, status.position);

        this.log.debug("getCurrentPosition on ".concat(index, " pos: ").concat(position, " target: ").concat(status.targetPosition));
        if ((_status$targetPositio = status.targetPosition) !== null && _status$targetPositio !== void 0 ? _status$targetPositio : Math.abs(position - status.targetPosition) <= 2) callback(null, 100 - status.targetPosition);else callback(null, 100 - position);
      }.bind(this));
      service.getCharacteristic(Characteristic.TargetPosition).on("get", function (callback) {
        this.log("TargetPosition ".concat(index));
        var status = this.blinds[index];

        var position = this._position(index, status.targetPosition == null ? status.position : status.targetPosition);

        this.log.debug(position);
        callback(null, 100 - position);
      }.bind(this)).on("set", function (position, callback, context) {
        var realPosition = this._position(index, 100 - position);

        this.log("Set TargetPosition ".concat(index, " to ").concat(realPosition));
        var status = this.blinds[index];
        if (!status) return;
        status.targetPosition = realPosition;

        this._setBlindTargetPosition(index, realPosition, callback);
      }.bind(this)); // Note: iOS's Home App subtracts CurrentPosition from TargetPosition to determine if it's opening, closing or idle.
      // It absolutely doesn't care about Characteristic.PositionState, which is supposed to be :
      // PositionState.INCREASING = 1, PositionState.DECREASING = 0 or PositionState.STOPPED = 2
      // But in any case, let's still implement it

      service.getCharacteristic(Characteristic.PositionState).on("get", function (callback) {
        this.log("PositionSate ".concat(index));
        var status = this.blinds[index];
        if (!status) return;
        if (status.state == -1) callback(null, PositionState.DECREASING);else if (status.state == 1) callback(null, PositionState.INCREASING);else callback(null, PositionState.STOPPED);
      }.bind(this));

      if (!(uuid in this.accessories)) {
        this.log("Registering ".concat(name));
        this.accessories[uuid] = accessory;
        this.api.registerPlatformAccessories(PluginName, PlatformName, [accessory]);
      }

      this.blindAccessories[index] = accessory;
    }
  }, {
    key: "_getStatus",
    value: function _getStatus() {
      var _this4 = this;

      this._send("/status").then(function (request) {
        var blinds = request.data.blinds;

        for (var item in blinds) {
          _this4.blinds[item].setStatus(blinds[item]);
        }
      })["catch"](function (error) {
        _this4.log.error(error);
      });

      this.updater = setTimeout(this._getStatus.bind(this), 5000);
    }
  }, {
    key: "_position",
    value: function _position(name, position) {
      this.log("Position: ".concat(name, " ").concat(position));
      var pos = Math.round(position);
      var _this$blinds$name = this.blinds[name],
          min = _this$blinds$name.min,
          max = _this$blinds$name.max;
      if (pos <= min) return 0;
      if (pos >= max) return 100;
      return pos;
    }
  }, {
    key: "configureAccessory",
    value: function configureAccessory(accessory) {
      this.log("config cached accessories ".concat(accessory.displayName));
      this.accessories[accessory.UUID] = accessory;
    }
  }]);

  return Platform;
}();

module.exports = Platform;