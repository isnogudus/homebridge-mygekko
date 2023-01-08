const http = require('http');

const SENDER_TIMEOUT_MS = 300;

let senderTimeoutId = null;
const commandQueue = [];

function sendHttp({ config, log, path, value }) {
  const { user, password, host } = config;
  let url = new URL(`http://${host}/api/v1/var/`);
  if (path !== undefined) url = new URL(path, url);

  url.searchParams.append('username', user);
  url.searchParams.append('password', password);

  if (value !== undefined) url.searchParams.append('value', value);

  return new Promise((resolve, reject) => {
    http
      .get(url, (response) => {
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

async function sender() {
  if (commandQueue.length === 0) {
    senderTimeoutId = null;
    return;
  }

  const entry = commandQueue.pop();

  try {
    const result = await sendHttp(entry);
    entry.resolve(result);
  } catch (err) {
    entry.reject(err);
  }

  if (commandQueue.length === 0) {
    senderTimeoutId = null;
  } else senderTimeoutId = setTimeout(sender, SENDER_TIMEOUT_MS);
}

module.exports = async function addQueue(config, log, path, value) {
  const entry = { config, log, path, value, resolve: null, reject: null };
  const result = new Promise((resolve, reject) => {
    entry.reject = reject;
    entry.resolve = resolve;
  });

  const index = commandQueue.findIndex(
    (item) =>
      item.path === entry.path &&
      item.value?.charAt(0) === entry.value.charAt(0)
  );

  if (index === -1) {
    commandQueue.push(entry);
  } else {
    const oldEntry = commandQueue[index];
    log.debug(
      `Replaced queue entry: ${entry.path} ${oldEntry.value} => ${entry.value}`
    );
    oldEntry.reject('REPLACED');
    commandQueue[index] = entry;
  }

  if (senderTimeoutId === null)
    senderTimeoutId = setTimeout(sender, SENDER_TIMEOUT_MS);

  return result;
};
