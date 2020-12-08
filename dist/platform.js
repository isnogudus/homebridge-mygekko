"use strict";

var _http = _interopRequireDefault(require("http"));

var _querystring = _interopRequireDefault(require("querystring"));

var _blind = _interopRequireDefault(require("./blind"));

var _roomtemp = _interopRequireDefault(require("./roomtemp"));

var _sendHttp = _interopRequireDefault(require("./sendHttp"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return; var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var PluginName = 'homebridge-mygekko';
var Name = 'mygekko';

var Platform = /*#__PURE__*/function () {
  function Platform(log, config, api) {
    var _this = this;

    _classCallCheck(this, Platform);

    this.api = api;
    this.log = log;
    this.config = config;
    this.updater = null;
    this.blindPostioner = null;
    this.blinds = {};
    this.roomtemps = {};
    this.blindAccessories = {};
    this.targetPositions = {};
    this.blindsTargetPositions = null;
    this.name = this.config.name || 'mygekko';

    if (!config.user || !config.password || !config.host) {
      this.log.error('Platform config incorrect or missing. Check the config.json file.');
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

    this.sending = function (path, value) {
      return (0, _sendHttp["default"])(_this.url, user, password, log, path, value);
    };

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
            blinds = _JSON$parse.blinds,
            roomtemps = _JSON$parse.roomtemps;

        Object.entries(blinds).forEach(function (index) {
          var _index = _slicedToArray(index, 2),
              key = _index[0],
              blind = _index[1];

          var name = blind.name;
          var uuid = UUIDGen.generate(name);
          var cachedAccessory = _this2.accessories[uuid];

          _this2.log.debug("Cached : ".concat(!!cachedAccessory));

          var accessory = cachedAccessory !== null && cachedAccessory !== void 0 ? cachedAccessory : new PlatformAccessory(name, uuid);
          _this2.blinds[key] = new _blind["default"](accessory, name, key, _this2.api, _this2.blindAdjustment[key], _this2.sending, _this2.log);
          if (!cachedAccessory) _this2.api.registerPlatformAccessories(PluginName, Name, [accessory]);
        });
        Object.entries(roomtemps).forEach(function (item) {
          var _item = _slicedToArray(item, 2),
              key = _item[0],
              roomtemp = _item[1];

          var name = roomtemp.name;
          var uuid = UUIDGen.generate(name);
          var cachedAccessory = _this2.accessories[uuid];

          _this2.log.debug("Cached : ".concat(!!cachedAccessory));

          var accessory = cachedAccessory !== null && cachedAccessory !== void 0 ? cachedAccessory : new PlatformAccessory(name, uuid);
          _this2.roomtemps[key] = new _roomtemp["default"](accessory, name, key, _this2.api, _this2.sending, _this2.log);
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
            blinds = _JSON$parse2.blinds,
            roomtemps = _JSON$parse2.roomtemps;

        Object.entries(blinds).forEach(function (item) {
          var _item2 = _slicedToArray(item, 2),
              key = _item2[0],
              value = _item2[1];

          _this3.blinds[key].setStatus(value);
        });
        Object.entries(roomtemps).forEach(function (item) {
          var _item3 = _slicedToArray(item, 2),
              key = _item3[0],
              value = _item3[1];

          _this3.roomtemps[key].setStatus(value);
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