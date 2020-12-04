import http from 'http';
import querystring from 'querystring';

export default function sendHttp(url, username, password, path, value) {
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
        this.log.error(error);
        reject(error);
      });
  });
}
