import http from 'http';
import querystring from 'querystring';
import Blind from './blind.js';
import Thermostat from './thermostat.js';
import sendHttp from './sendHttp.js';

const PluginName = 'homebridge-mygekko';
const Name = 'mygekko';

class Platform {
  constructor(log, config, api) {
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
    this.sending = (path, value) =>
      sendHttp(this.url, user, password, log, path, value);

    this.log('Starting MyGEKKO Platform using homebridge API', api.version);

    // if finished loading cache accessories
    this.api.on('didFinishLaunching', () => {
      // Fetch the devices
      this.fetchDevices();
    });
  }

  fetchDevices() {
    this.log.debug('Fetch the devices');
    const { uuid: UUIDGen } = this.api.hap;
    const PlatformAccessory = this.api.platformAccessory;
    const { blindAdjustment = {}, thermostats = {} } = this.config;
    this.sending()
      .then((response) => {
        const { blinds, roomtemps } = JSON.parse(response);
        Object.entries(blinds).forEach((index) => {
          const [key, blind] = index;
          if (!key.startsWith('item')) return;

          const { name } = blind;
          const uuid = UUIDGen.generate(`BLIND:${name}`);
          const cachedAccessory = this.accessories[uuid];
          this.log.debug(`Cached : ${!!cachedAccessory}`);
          const accessory =
            cachedAccessory ?? new PlatformAccessory(name, uuid);

          this.blinds[key] = new Blind(
            accessory,
            name,
            key,
            this.api,
            blindAdjustment[key],
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
        Object.entries(roomtemps).forEach((item) => {
          const [key, roomtemp] = item;
          if (!key.startsWith('item')) return;

          const name = thermostats[key]?.name ?? roomtemp.name;
          const uuid = UUIDGen.generate(`THERMOSTAT:${roomtemp.name}`);
          const cachedAccessory = this.accessories[uuid];
          this.log.debug(`Cached : ${!!cachedAccessory} ${name}`);
          const accessory =
            cachedAccessory ?? new PlatformAccessory(name, uuid);

          this.roomtemps[key] = new Thermostat(
            accessory,
            name,
            key,
            this.api,
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
        const { blinds, roomtemps } = JSON.parse(request);
        Object.entries(blinds).forEach((item) => {
          const [key, value] = item;
          this.blinds[key].setStatus(value);
        });
        Object.entries(roomtemps).forEach((item) => {
          const [key, value] = item;
          this.roomtemps[key].setStatus(value);
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
