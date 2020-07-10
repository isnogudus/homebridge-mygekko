import http from 'http';
import querystring from 'querystring';
import Blind from './blind';

export const PluginName = 'homebridge-mygekko';
export const Name = 'mygekko';

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
    this.api.on('didFinishLaunching', () => {
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
            resolve(data);
          });
        })
        .on('error', (error) => {
          this.log.error(error);
          reject(error);
        });
    });
  };

  fetchDevices() {
    this.log.debug('Fetch the devices');
    const { uuid: UUIDGen } = this.api.hap;
    const PlatformAccessory = this.api.platformAccessory;
    this.sending()
      .then((response) => {
        const { blinds } = JSON.parse(response);
        Object.keys(blinds).forEach((index) => {
          const blind = blinds[index];
          const { name } = blind;
          const uuid = UUIDGen.generate(name);
          const cachedAccessory = this.accessories[uuid];
          this.log.debug(`Cached : ${!!cachedAccessory}`);
          const accessory =
            cachedAccessory ?? new PlatformAccessory(name, uuid);

          this.blinds[index] = new Blind(
            accessory,
            name,
            index,
            this.api,
            this.blindAdjustment[index],
            this.sending,
            this.log
          );
          if (!cachedAccessory)
            this.api.registerPlatformAccessories(
              PluginName,
              Name,

              [accessory]
            );
        });
        this.getStatus();
      })
      .catch((error) => {
        this.log.error(error);
      });
  }

  getStatus() {
    this.sending('/status')
      .then((request) => {
        const { blinds } = JSON.parse(request);
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
    this.log(`config cached accessories ${accessory.UUID}`);
    this.accessories[accessory.UUID] = accessory;
  }
}

module.exports = Platform;
