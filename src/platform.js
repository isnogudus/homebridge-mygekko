const Battery = require('./battery');
const Blind = require('./blind');
const Humidity = require('./humidity');
const Thermostat = require('./thermostat');

const sendHttp = require('./sendHttp');

const PluginName = 'homebridge-mygekko';
const Name = 'mygekko';
const StatusUpdateTimeoutMS = 5000;

async function getStatus(sender, log, devices, initial = false) {
  let response;
  try {
    response = await sender('status');
  } catch (error) {
    log.error(error);
    return;
  }

  const data = JSON.parse(response);

  if (data.blinds) {
    Object.keys(data.blinds).forEach((key) => {
      if (!key.startsWith('item')) return;

      const device = devices.blind[key];

      if (device) device.setStatus(data.blinds[key], initial);
    });
  }

  if (data.energymanager) {
    Object.keys(data.energymanager).forEach((key) => {
      if (!key.startsWith('item')) return;

      const device = devices.battery[key];

      if (device) device.setStatus(data.energymanager[key], initial);
    });
  }

  if (data.vents) {
    Object.keys(data.vents).forEach((key) => {
      if (!key.startsWith('item')) return;

      const device = devices.humidity[key];

      if (device) device.setStatus(data.vents[key], initial);
    });
  }

  if (data.roomtemps) {
    Object.keys(data.roomtemps).forEach((key) => {
      if (!key.startsWith('item')) return;

      const device = devices.thermostat[key];

      if (device) device.setStatus(data.roomtemps[key], initial);
    });
  }

  setTimeout(getStatus, StatusUpdateTimeoutMS, sender, log, devices);
}

class Platform {
  constructor(log, config, api) {
    this.api = api;
    this.log = log;
    this.config = config;
    this.devices = {
      battery: {},
      blind: {},
      humidity: {},
      thermostat: {},
    };
    this.name = this.config.name || Name;

    if (!config.user || !config.password || !config.host) {
      this.log.error(
        'Platform config incorrect or missing. Check the config.json file.'
      );
      return;
    }

    this.accessories = [];
    this.sender = (path, value) => sendHttp(config, log, path, value);

    log('Starting MyGEKKO Platform using homebridge API', api.version);

    // if finished loading cache accessories
    api.on('didFinishLaunching', async () => {
      // Fetch the devices

      log.debug('Fetch the devices');
      let response;
      try {
        response = await sendHttp(config, log);
      } catch (error) {
        this.log.error(error);
        return;
      }

      const data = JSON.parse(response);

      Object.keys(data.blinds ?? {}).forEach((key) => {
        if (!key.startsWith('item')) return;

        const name = config.blinds?.[key]?.name ?? data.blinds[key].name;

        const uuid = api.hap.uuid.generate(`${this.name}_BLIND_${key}`);

        let accessory = this.accessories.find((acc) => acc.UUID === uuid);

        if (!accessory) {
          // eslint-disable-next-line new-cap
          accessory = new api.platformAccessory(name, uuid);
          api.registerPlatformAccessories(PluginName, Name, [accessory]);
        }

        this.devices.blind[key] = new Blind(this, accessory, name, key);
      });

      Object.keys(data.energymanager ?? {}).forEach((key) => {
        if (!key.startsWith('item')) return;

        const name =
          config.batteries?.[key]?.name ?? data.energymanager[key].name;

        const uuid = api.hap.uuid.generate(`${this.name}_BATTERY_${key}`);

        let accessory = this.accessories.find((acc) => acc.UUID === uuid);

        if (!accessory) {
          // eslint-disable-next-line new-cap
          accessory = new api.platformAccessory(name, uuid);
          api.registerPlatformAccessories(PluginName, Name, [accessory]);
        }

        this.devices.battery[key] = new Battery(this, accessory, name, key);
      });

      Object.keys(data.vents ?? {}).forEach((key) => {
        if (!key.startsWith('item')) return;

        const name = config.humidity?.[key]?.name ?? data.vents[key].name;

        const uuid = api.hap.uuid.generate(`${this.name}_HUMIDITY_${key}`);

        let accessory = this.accessories.find((acc) => acc.UUID === uuid);

        if (!accessory) {
          // eslint-disable-next-line new-cap
          accessory = new api.platformAccessory(name, uuid);
          api.registerPlatformAccessories(PluginName, Name, [accessory]);
        }

        this.devices.humidity[key] = new Humidity(this, accessory, name, key);
      });

      Object.keys(data.roomtemps ?? {}).forEach((key) => {
        if (!key.startsWith('item')) return;

        const name =
          config.thermostats?.[key]?.name ?? data.roomtemps[key].name;

        const uuid = api.hap.uuid.generate(`${this.name}_THERMOSTAT_${key}`);

        let accessory = this.accessories.find((acc) => acc.UUID === uuid);

        if (!accessory) {
          // eslint-disable-next-line new-cap
          accessory = new api.platformAccessory(name, uuid);
          api.registerPlatformAccessories(PluginName, Name, [accessory]);
        }

        this.devices.thermostat[key] = new Thermostat(
          this,
          accessory,
          name,
          key
        );
      });

      await getStatus(this.sender, this.log, this.devices, true);
    });
  }

  configureAccessory(accessory) {
    this.accessories.push(accessory);
  }
}

module.exports = { PluginName, Name, Platform };
