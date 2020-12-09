let  http = require( 'http');
let querystring = require ('querystring');

module.exports = function sendHttp(url, username, password, log, path, value) {
  const params =
    value === undefined
      ? { username, password }
      : { username, password, value };

  const payload = querystring.stringify(params);

  const uri = `${url}${path ?? ''}?${payload}`;
  return new Promise((resolve, reject) => {
    http
      .get(uri, (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          resolve(data);
        });
      })
      .on('error', (error) => {
        log.error(error);
        reject(error);
      });
  });
}
