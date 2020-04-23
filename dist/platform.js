"use strict";

var _axios = _interopRequireDefault(require("axios"));

var _blind = _interopRequireDefault(require("./blind"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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
      return _axios["default"].get(url + path, {
        params: params
      });
    }
  }, {
    key: "_fetchDevices",
    value: function _fetchDevices() {
      var _this2 = this;

      this.log.debug("Fetch the devices");
      var _this$api$hap = this.api.hap,
          Service = _this$api$hap.Service,
          Characteristic = _this$api$hap.Characteristic,
          UUIDGen = _this$api$hap.uuid;

      this._send().then(function (response) {
        var blinds = response.data.blinds;

        for (var index in blinds) {
          var _this2$accessories$uu;

          var blind = blinds[index];
          var name = blind.name; //this._registerBlind(index, blind.name);

          var uuid = UUIDGen.generate(name);

          _this2.log.debug("Cached : ".concat(uuid in _this2.accessories));

          var accessory = (_this2$accessories$uu = _this2.accessories[uuid]) !== null && _this2$accessories$uu !== void 0 ? _this2$accessories$uu : new Accessory(name, uuid);
          _this2.blinds[index] = new _blind["default"](accessory, name, index, _this2.api, _this2.blindAdjustment[index], _this2._send.bind(_this2), _this2.log);
        }

        _this2._getStatus(); //this.log.debug(response.data.blinds)

      })["catch"](function (error) {
        console.log(error);
      });
    }
  }, {
    key: "_getStatus",
    value: function _getStatus() {
      var _this3 = this;

      this._send("/status").then(function (request) {
        var blinds = request.data.blinds;

        for (var item in blinds) {
          _this3.blinds[item].setStatus(blinds[item]);
        }
      })["catch"](function (error) {
        _this3.log.error(error);
      });

      this.updater = setTimeout(this._getStatus.bind(this), 5000);
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