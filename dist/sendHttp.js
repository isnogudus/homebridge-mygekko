"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = sendHttp;

var _http = _interopRequireDefault(require("http"));

var _querystring = _interopRequireDefault(require("querystring"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function sendHttp(url, username, password, log, path, value) {
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
      log.error(error);
      reject(error);
    });
  });
}