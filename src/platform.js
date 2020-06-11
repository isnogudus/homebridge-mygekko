import http from 'http';
import querystring from 'querystring';
import { APIEvent } from 'homebridge';
import Blind from './blind';

class Platform {
  constructor(log, config, api) {
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
      this.log.error(
        'Platform config incorrect or missing. Check the config.json file.'
      );
      return;
    }

    const { user, password, host, blindAdjustment } = config;
    this.username = user;
    this.password = password;
    this.host = host;
    this.blindAdjustment = blindAdjustment || {};
    this.url = `http://${this.host}/api/v1/var`;
    this.accessories = {};

    this.log('Starting MyGEKKO Platform using homebridge API', api.version);

    // if finished loading cache accessories
    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      // Fetch the devices
      this.fetchDevices();
    });
  }

  sending = (path, value) => {
    const { url, username, password } = this;
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
            resolve(JSON.parse(data));
          });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  };

  fetchDevices() {
    this.log.debug('Fetch the devices');
    const { Accessory, uuid: UUIDGen } = this.api.hap;
    this.sending()
      .then((response) => {
        const { blinds } = response;
        Object.keys(blinds).forEach((index) => {
          const blind = blinds[index];
          const { name } = blind;
          const uuid = UUIDGen.generate(name);
          this.log.debug(`Cached : ${uuid in this.accessories}`);
          const accessory = this.accessories[uuid] ?? new Accessory(name, uuid);

          this.blinds[index] = new Blind(
            accessory,
            name,
            index,
            this.api,
            this.blindAdjustment[index],
            this.sending,
            this.log
          );
        });
        this.getStatus();

        this.log.debug(response.data.blinds);
      })
      .catch((error) => {
        this.log.error(error);
      });
  }

  getStatus() {
    this.sending('/status')
      .then((request) => {
        const { blinds } = request;
        Object.keys(blinds).forEach((item) => {
          this.blinds[item].setStatus(blinds[item]);
        });
      })
      .catch((error) => {
        this.log.error(error);
      });
    this.updater = setTimeout(this.getStatus.bind(this), 5000);
  }

  configureAccessory(accessory) {
    this.log(`config cached accessories ${accessory.displayName}`);
    this.accessories[accessory.UUID] = accessory;
  }
}

module.exports = Platform;
