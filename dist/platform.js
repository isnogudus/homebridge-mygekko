"use strict";

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
    } else {
      this.user = config.user;
      this.password = config.password;
      this.host = config.host;
      this.url = "http://".concat(this.host, "/api/v1/var");
      this.accessories = {};
      this.blindAdjustment = {};
      this.log("Starting MyGEKKO Platform using homebridge API", api.version);

      if (api) {
        // save the api for use later
        this.api = api; // if finished loading cache accessories

        this.api.on("didFinishLaunching", function () {
          // Fetch the devices
          this._fetchDevices();
        }.bind(this));
      }
    }
  }

  _createClass(Platform, [{
    key: "_callBlindsTargetPositions",
    value: function _callBlindsTargetPositions() {
      var _this = this;

      var target = this.blindsTargetPositions;
      this.blindsTargetPositions = {};

      var _loop = function _loop(index) {
        var _target$index = target[index],
            newPosition = _target$index.newPosition,
            callback = _target$index.callback;

        _this.log.debug("_callBlindsTargetPositions ".concat(index, " to ").concat(newPosition)); // Send stop


        axios.get("".concat(_this.url, "/blinds/").concat(index, "/scmd/set"), {
          params: {
            username: _this.user,
            password: _this.password,
            value: "0"
          }
        }).then(function () {
          _this.log.debug("Stop signal send -> ".concat(index));

          axios.get("".concat(_this.url, "/blinds/").concat(index, "/scmd/set"), {
            params: {
              username: _this.user,
              password: _this.password,
              value: "P".concat(newPosition)
            }
          }).then(function (request) {
            _this.log.debug("New position send -> ".concat(index, " to ").concat(newPosition));

            callback(null);
          })["catch"](function (error) {
            callback(new Error("Error in SetTargetPosition"));

            _this.log.error(error);
          });
        })["catch"](function (error) {
          callback(new Error("Error in SetTargetPosition"));

          _this.log.error(error);
        });
      };

      for (var index in target) {
        _loop(index);
      }
    }
  }, {
    key: "_setBlindTargetPosition",
    value: function _setBlindTargetPosition(index, position, callback) {
      this.log("_setBlindTargetPosition");
      clearTimeout(this.blindPostioner); // correct the blinds

      var _this$blindAdjustment = this.blindAdjustment[index],
          min = _this$blindAdjustment.min,
          max = _this$blindAdjustment.max;
      var newPosition = position;
      if (position == 100) newPosition = max;
      if (position == 0) newPosition = min;
      this.blindsTargetPositions = _objectSpread({}, this.blindsTargetPositions, _defineProperty({}, index, {
        newPosition: newPosition,
        callback: callback
      }));
      this.blindPostioner = setTimeout(this._callBlindsTargetPositions.bind(this), 500);
    }
  }, {
    key: "_fetchDevices",
    value: function _fetchDevices() {
      var _this2 = this;

      this.log.debug("Fetch the devices");
      axios.get("".concat(this.url, "?username=").concat(this.user, "&password=").concat(this.password)).then(function (response) {
        var blinds = response.data.blinds;

        for (var index in blinds) {
          var blind = blinds[index];

          _this2._registerBlind(index, blind.name);
        }

        _this2._getStatus(); //this.log.debug(response.data.blinds)

      })["catch"](function (error) {
        console.log(error);
      });
    }
  }, {
    key: "_registerBlind",
    value: function _registerBlind(index, name) {
      var _config$adjustment$in, _config$adjustment$in2, _config$adjustment$in3, _config$adjustment$in4;

      this.log("Creating Blind ".concat(name));
      var uuid = this.api.hap.UUIDGen.generate(name);
      this.log("Cached : ".concat(uuid in this.accessories));
      this.blinds[index] = {
        position: 0,
        targetPosition: null
      };
      this.blindAdjustment[index] = {
        min: Math.max(0, parseInt((_config$adjustment$in = (_config$adjustment$in2 = config.adjustment[index]) === null || _config$adjustment$in2 === void 0 ? void 0 : _config$adjustment$in2.min) !== null && _config$adjustment$in !== void 0 ? _config$adjustment$in : "0")),
        max: Math.min(100, parseInt((_config$adjustment$in3 = (_config$adjustment$in4 = config.adjustment[index]) === null || _config$adjustment$in4 === void 0 ? void 0 : _config$adjustment$in4.max) !== null && _config$adjustment$in3 !== void 0 ? _config$adjustment$in3 : "100"))
      };
      var accessory = this.accessories[uuid] || new Accessory(name, uuid);
      accessory.on("identify", function (paired, callback) {
        this.log(accessory.displayName, "Identify!!!");
        callback();
      }.bind(this));
      var service = accessory.getService(Service.WindowCovering) || accessory.addService(Service.WindowCovering, name);
      service.getCharacteristic(Characteristic.CurrentPosition).on("get", function (callback) {
        this.log("CurrentPosition ".concat(index));
        var status = this.blinds[index];

        if (!status) {
          this.log.error("No status for ".concat(index));
          return;
        }

        var position = this._position(index, status.position);

        this.log.debug(position);
        callback(null, 100 - position);
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
      var _this3 = this;

      axios.get("".concat(this.url, "/status"), {
        params: {
          username: this.user,
          password: this.password
        }
      }).then(function (request) {
        var blinds = request.data.blinds;

        for (var item in blinds) {
          var sumState = blinds[item].sumstate.value.split(";");
          var state = {
            state: parseInt(sumState[0]),
            position: Math.round(parseFloat(sumState[1])),
            angle: parseFloat(sumState[2]),
            sumState: parseInt(sumState[3]),
            slotRotationalArea: parseInt(sumState[4])
          }; // Update service

          if (state.position != _this3.blinds[item].position) {
            _this3.log.debug("Update position ".concat(item, " from ").concat(_this3.blinds[item].position, " to ").concat(state.position));

            var service = _this3.blindAccessories[item].getService(Service.WindowCovering);

            if (service) service.getCharacteristic(Characteristic.CurrentPosition).setValue(_this3._position(item, 100 - state.position));
          }

          _this3.blinds[item] = state;
        }
      })["catch"](function (error) {
        _this3.log.error(error);
      });
      this.updater = setTimeout(this._getStatus.bind(this), 5000);
    }
  }, {
    key: "_position",
    value: function _position(name, position) {
      this.log("Position: ", name);
      var pos = Math.round(position);
      var _this$blindAdjustment2 = this.blindAdjustment[name],
          min = _this$blindAdjustment2.min,
          max = _this$blindAdjustment2.max;
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