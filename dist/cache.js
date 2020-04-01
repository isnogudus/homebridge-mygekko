"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var axios = require("axios");

var Cache = /*#__PURE__*/function () {
  function Cache(url, log) {
    _classCallCheck(this, Cache);

    this.url = url;
    this.log = log;
    this.cache = null;
    this.cacheTimer = null;
    this.isCalling = false;
    this.getter = [];
  }

  _createClass(Cache, [{
    key: "isActive",
    value: function isActive() {
      return this.cache != null && this.cacheTimer != null;
    }
  }, {
    key: "dirtyCache",
    value: function dirtyCache() {
      clearTimeout(this.cacheTimer);
      this.cacheTimer = null;
    }
  }, {
    key: "get",
    value: function get(callback) {
      if (this.isActive()) {
        callback(this.cache);
        return;
      }

      this.getter.push(callback);
      this.fetch();
    }
  }, {
    key: "fetch",
    value: function fetch() {
      var _this = this;

      this.log("CACHE FETCH");
      if (this.isActive()) return;
      if (this.getter.length == 0) return;
      if (this.isCalling) return;
      this.isCalling = true;
      axios.get(this.url).then(function (request) {
        _this.log("CACHE DATA");

        var rBlinds = request.data.blinds;
        var blinds = {};

        for (var item in rBlinds) {
          var sumState = rBlinds[item].sumstate.value.split(";");
          var state = {
            state: parseInt(sumState[0]),
            position: Math.round(parseFloat(sumState[1])),
            angle: parseFloat(sumState[2]),
            sumState: parseInt(sumState[3]),
            slotRotationalArea: parseInt(sumState[4])
          };
          blinds[item] = state; //this.log.debug(item, state);
        }

        _this.cache = {
          blinds: blinds
        };
        _this.cacheTimer = setTimeout(_this.dirtyCache.bind(_this), 2000);

        _this.log("CACHE DATA getter", _this.getter.length);

        while (_this.getter.length > 0) {
          _this.getter.pop()(null, _this.cache);
        }
      })["catch"](function (error) {
        _this.log.error("Error: ".concat(error.message));

        while (_this.getter.length > 0) {
          _this.getter.pop()(new Error(error.message));
        }
      })["finally"](function () {
        _this.isCalling = false;
      });
    }
  }]);

  return Cache;
}();

module.exports = Cache;