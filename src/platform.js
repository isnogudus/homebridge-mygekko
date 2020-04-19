const http = require("http");
const url = require("url");
const axios = require("axios");
const PluginName = "homebridge-mygekko";
const PlatformName = "mygekko";
import Blind from "./blind";

class Platform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.updater = null;
    this.blindPostioner = null;
    this.blinds = {};
    this.blindAccessories = {};
    this.targetPositions = {};
    this.blindsTargetPositions = null;

    if (!config || !config.user || !config.password || !config.host) {
      this.log.error("Platform config incorrect or missing. Check the config.json file.");
      return;
    }

    const { user, password, host, blindAdjustment } = config;
    this.username = user;
    this.password = password;
    this.host = host;
    this.blindAdjustment = blindAdjustment || {};
    this.url = `http://${this.host}/api/v1/var`;
    this.accessories = {};

    this.log("Starting MyGEKKO Platform using homebridge API", api.version);
    if (api) {

      // save the api for use later
      this.api = api;

      // if finished loading cache accessories
      this.api.on("didFinishLaunching", () => {
        // Fetch the devices
        this._fetchDevices();
      });
    }
  }

  _send(path = "", value = undefined) {
    const { url, username, password } = this;
    const params = (value === undefined) ? { username, password } : { username, password, value };
    return axios.get(url + path, { params });
  }
  _callBlindsTargetPositions() {
    const target = this.blindsTargetPositions;
    this.blindsTargetPositions = {};
    for (const index in target) {
      const { newPosition, callback } = target[index];
      this.log.debug(`_callBlindsTargetPositions ${index} to ${newPosition}`);

      // Send stop
      this._send(`/blinds/${index}/scmd/set`, "0")
        .then(() => {
          this.log.debug(`Stop signal send -> ${index}`);
          this._send(`/blinds/${index}/scmd/set`, `P${newPosition}`)
            .then(request => {
              this.log.debug(`New position send -> ${index} to ${newPosition}`);
              callback(null);
            }).catch(error => {
              callback(new Error("Error in SetTargetPosition"));
              this.log.error(error);
            });
        }).catch(error => {
          callback(new Error("Error in SetTargetPosition"));
          this.log.error(error);
        });
    }
  }

  _setBlindTargetPosition(index, position, callback) {
    this.log(`_setBlindTargetPosition ${index} ${position}`);
    clearTimeout(this.blindPostioner);

    // correct the blinds
    const { min, max } = this.blinds[index];
    const newPosition = Math.min(max, Math.max(min, position));
    this.log(`_setBlindTargetPosition ${newPosition} ${min} ${max}`);

    this.blindsTargetPositions = { ...this.blindsTargetPositions, [index]: { newPosition, callback } };
    this.blindPostioner = setTimeout(this._callBlindsTargetPositions.bind(this), 500);
  }

  _fetchDevices() {
    this.log.debug("Fetch the devices");
    const { Service, Characteristic, uuid: UUIDGen } = this.api.hap;
    this._send().then(response => {
      const { blinds } = response.data;
      for (const index in blinds) {
        const blind = blinds[index];
        const { name } = blind;
        //this._registerBlind(index, blind.name);
        const uuid = UUIDGen.generate(name);
        this.log.debug(`Cached : ${uuid in this.accessories}`);
        const accessory = this.accessories[uuid] ?? new Accessory(name, uuid);

        this.blinds[index] = new Blind(accessory, name, index, this.api, this.blindAdjustment[index], this.log);
      }
      this._getStatus();

      //this.log.debug(response.data.blinds)
    }).catch(error => { console.log(error); });
  }

  _registerBlind(index, name) {
    const { Service, Characteristic, uuid: UUIDGen } = this.api.hap;
    this.log(`Creating Blind ${index} as ${name}`);
    const uuid = UUIDGen.generate(name);
    this.log(`Cached : ${uuid in this.accessories}`);

    this.blinds[index] = {
      position: 0,
      targetPosition: null,
      min: Math.max(0, parseInt(this.blindAdjustment[index]?.min ?? "0")),
      max: Math.min(100, parseInt(this.blindAdjustment[index]?.max ?? "100")),
    };

    const accessory = this.accessories[uuid] || new Accessory(name, uuid);

    accessory.on("identify", function (paired, callback) {
      this.log(accessory.displayName, "Identify!!!");
      callback();
    }.bind(this));

    const service = accessory.getService(Service.WindowCovering) || accessory.addService(Service.WindowCovering, name);

    service.getCharacteristic(Characteristic.CurrentPosition).on("get", function (callback) {
      const status = this.blinds[index];
      if (!status) {
        this.log.error(`No status for ${index}`);
        return;
      }

      const position = this._position(index, status.position);
      this.log.debug(`getCurrentPosition on ${index} pos: ${position} target: ${status.targetPosition}`);

      if (status.targetPosition ?? Math.abs(position - status.targetPosition) <= 2)
        callback(null, 100 - status.targetPosition);
      else
        callback(null, 100 - position);
    }.bind(this));

    service.getCharacteristic(Characteristic.TargetPosition).on("get", function (callback) {
      this.log(`TargetPosition ${index}`);
      const status = this.blinds[index];

      const position = this._position(index, status.targetPosition == null ? status.position : status.targetPosition);

      this.log.debug(position);
      callback(null, 100 - position);
    }.bind(this)
    ).on("set", function (position, callback, context) {
      const realPosition = this._position(index, 100 - position);
      this.log(`Set TargetPosition ${index} to ${realPosition}`);
      const status = this.blinds[index];
      if (!status) return;

      status.targetPosition = realPosition;
      this._setBlindTargetPosition(index, realPosition, callback);
    }.bind(this));

    // Note: iOS's Home App subtracts CurrentPosition from TargetPosition to determine if it's opening, closing or idle.
    // It absolutely doesn't care about Characteristic.PositionState, which is supposed to be :
    // PositionState.INCREASING = 1, PositionState.DECREASING = 0 or PositionState.STOPPED = 2
    // But in any case, let's still implement it
    service.getCharacteristic(Characteristic.PositionState).on("get", function (callback) {
      this.log(`PositionSate ${index}`);
      const status = this.blinds[index];
      if (!status) return;

      if (status.state == -1) callback(null, PositionState.DECREASING);
      else if (status.state == 1) callback(null, PositionState.INCREASING);
      else callback(null, PositionState.STOPPED);
    }.bind(this));

    if (!(uuid in this.accessories)) {
      this.log(`Registering ${name}`);
      this.accessories[uuid] = accessory;
      this.api.registerPlatformAccessories(PluginName, PlatformName, [accessory]);
    }
    this.blindAccessories[index] = accessory;
  }

  _getStatus() {
    this._send("/status").then(request => {
      const { blinds } = request.data;
      for (const item in blinds) {
        this.blinds[item].setStatus(blinds[item]);
      }
    }).catch(error => {
      this.log.error(error);
    });
    this.updater = setTimeout(this._getStatus.bind(this), 5000);
  }

  _position(name, position) {
    this.log(`Position: ${name} ${position}`);
    const pos = Math.round(position);
    const { min, max } = this.blinds[name];
    if (pos <= min) return 0;
    if (pos >= max) return 100;

    return pos;
  }

  configureAccessory(accessory) {
    this.log(`config cached accessories ${accessory.displayName}`);
    this.accessories[accessory.UUID] = accessory;
  }
}

module.exports = Platform;