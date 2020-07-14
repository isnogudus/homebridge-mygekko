"use strict";

var _http = _interopRequireDefault(require("http"));

var _querystring = _interopRequireDefault(require("querystring"));

var _blind = _interopRequireDefault(require("./blind"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var PluginName = 'homebridge-mygekko';
var Name = 'mygekko';

var Platform = /*#__PURE__*/function () {
  function Platform(log, config, api) {
    var _this = this;

    _classCallCheck(this, Platform);

    _defineProperty(this, "sending", function (path, value) {
      var url = _this.url,
          username = _this.username,
          password = _this.password;
      var params = value === undefined ? {
        username: username,
        password: password
      } : {
        username: username,
        password: password,
        value: value
      };

      var payload = _querystring["default"].stringify(params);

      var uri = "".concat(url).concat(path !== null && path !== void 0 ? path : '', "?").concat(payload);
      return new Promise(function (resolve, reject) {
        _http["default"].get(uri, function (response) {
          var data = '';
          response.on('data', function (chunk) {
            data += chunk;
          });
          response.on('end', function () {
            resolve(data);
          });
        }).on('error', function (error) {
          _this.log.error(error);

          reject(error);
        });
      });
    });

    this.api = api;
    this.log = log;
    this.config = config;
    this.updater = null;
    this.blindPostioner = null;
    this.blinds = {};
    this.blindAccessories = {};
    this.targetPositions = {};
    this.blindsTargetPositions = null;
    this.name = this.config.name || 'mygekko';

    if (!config.user || !config.password || !config.host) {
      this.log.error('Platform config incorrect or missing. Check the config.json file.');
      return;
    }

    var user = config.user,
        _password = config.password,
        host = config.host,
        blindAdjustment = config.blindAdjustment;
    this.username = user;
    this.password = _password;
    this.host = host;
    this.blindAdjustment = blindAdjustment || {};
    this.url = "http://".concat(this.host, "/api/v1/var");
    this.accessories = {};
    this.log('Starting MyGEKKO Platform using homebridge API', api.version); // if finished loading cache accessories

    this.api.on('didFinishLaunching', function () {
      // Fetch the devices
      _this.fetchDevices();
    });
  }

  _createClass(Platform, [{
    key: "fetchDevices",
    value: function fetchDevices() {
      var _this2 = this;

      this.log.debug('Fetch the devices');
      var UUIDGen = this.api.hap.uuid;
      var PlatformAccessory = this.api.platformAccessory;
      this.sending().then(function (response) {
        var _JSON$parse = JSON.parse(response),
            blinds = _JSON$parse.blinds;

        Object.keys(blinds).forEach(function (index) {
          var blind = blinds[index];
          var name = blind.name;
          var uuid = UUIDGen.generate(name);
          var cachedAccessory = _this2.accessories[uuid];

          _this2.log.debug("Cached : ".concat(!!cachedAccessory));

          var accessory = cachedAccessory !== null && cachedAccessory !== void 0 ? cachedAccessory : new PlatformAccessory(name, uuid);
          _this2.blinds[index] = new _blind["default"](accessory, name, index, _this2.api, _this2.blindAdjustment[index], _this2.sending, _this2.log);
          if (!cachedAccessory) _this2.api.registerPlatformAccessories(PluginName, Name, [accessory]);
        });

        _this2.getStatus();
      })["catch"](function (error) {
        _this2.log.error(error);
      });
    }
  }, {
    key: "getStatus",
    value: function getStatus() {
      var _this3 = this;

      this.sending('/status').then(function (request) {
        var _JSON$parse2 = JSON.parse(request),
            blinds = _JSON$parse2.blinds;

        Object.keys(blinds).forEach(function (item) {
          _this3.blinds[item].setStatus(blinds[item]);
        });
      })["catch"](function (error) {
        _this3.log.error(error);
      });
      this.updater = setTimeout(this.getStatus.bind(this), 5000);
    }
  }, {
    key: "configureAccessory",
    value: function configureAccessory(accessory) {
      this.log("config cached accessories ".concat(accessory.UUID));
      this.accessories[accessory.UUID] = accessory;
    }
  }]);

  return Platform;
}();

module.exports = Platform;