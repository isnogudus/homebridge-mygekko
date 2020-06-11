"use strict";

var _http = _interopRequireDefault(require("http"));

var _querystring = _interopRequireDefault(require("querystring"));

var _homebridgeLib = _interopRequireDefault(require("homebridge-lib"));

var _blind = _interopRequireDefault(require("./blind"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var Platform = /*#__PURE__*/function (_HomebridgeLib) {
  _inherits(Platform, _HomebridgeLib);

  var _super = _createSuper(Platform);

  function Platform(log, config, api) {
    var _this;

    _classCallCheck(this, Platform);

    _this.log = log;
    _this.config = config;
    _this.updater = null;
    _this.blindPostioner = null;
    _this.blinds = {};
    _this.blindAccessories = {};
    _this.targetPositions = {};
    _this.blindsTargetPositions = null;

    if (!config || !config.user || !config.password || !config.host) {
      _this.log.error('Platform config incorrect or missing. Check the config.json file.');

      return _possibleConstructorReturn(_this);
    }

    var user = config.user,
        _password = config.password,
        host = config.host,
        blindAdjustment = config.blindAdjustment;
    _this.username = user;
    _this.password = _password;
    _this.host = host;
    _this.blindAdjustment = blindAdjustment || {};
    _this.url = "http://".concat(_this.host, "/api/v1/var");
    _this.accessories = {};

    _this.log('Starting MyGEKKO Platform using homebridge API', api.version);

    if (api) {
      // save the api for use later
      _this.api = api; // if finished loading cache accessories

      _this.api.on('didFinishLaunching', function () {
        // Fetch the devices
        _this.fetchDevices();
      });
    }

    return _possibleConstructorReturn(_this);
  }

  _createClass(Platform, [{
    key: "fetchDevices",
    value: function fetchDevices() {
      var _this2 = this;

      this.log.debug('Fetch the devices');
      var _this$api$hap = this.api.hap,
          Accessory = _this$api$hap.Accessory,
          UUIDGen = _this$api$hap.uuid;
      this.sending().then(function (response) {
        var blinds = response.data.blinds;
        Object.keys(blinds).forEach(function (index) {
          var _this2$accessories$uu;

          var blind = blinds[index];
          var name = blind.name;
          var uuid = UUIDGen.generate(name);

          _this2.log.debug("Cached : ".concat(uuid in _this2.accessories));

          var accessory = (_this2$accessories$uu = _this2.accessories[uuid]) !== null && _this2$accessories$uu !== void 0 ? _this2$accessories$uu : new Accessory(name, uuid);
          _this2.blinds[index] = new _blind["default"](accessory, name, index, _this2.api, _this2.blindAdjustment[index], _this2.sending, _this2.log);
        });

        _this2.getStatus(); // this.log.debug(response.data.blinds)

      })["catch"](function (error) {
        _this2.log.log(error);
      });
    }
  }, {
    key: "getStatus",
    value: function getStatus() {
      var _this3 = this;

      this.sending('/status').then(function (request) {
        var blinds = request.data.blinds;
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
      this.log("config cached accessories ".concat(accessory.displayName));
      this.accessories[accessory.UUID] = accessory;
    }
  }]);

  return Platform;
}(_homebridgeLib["default"]);

module.exports = Platform;