const http = require("http");
const url = require("url");
const _ = require("lodash");
const axios = require("axios");
const PluginName = "homebridge-mygekko";
const PlatformName = "mygekko";

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

    if (!config || !config["user"] || !config["password"] || !config["host"]) {
      this.log.error("Platform config incorrect or missing. Check the config.json file.");
    }
    else {

      this.user = config["user"];
      this.password = config["password"];
      this.host = config["host"];
      this.url = `http://${this.host}/api/v1/var`;
      this.accessories = {};

      this.log("Starting MyGEKKO Platform using homebridge API", api.version);
      if (api) {

        // save the api for use later
        this.api = api;

        // if finished loading cache accessories
        this.api.on("didFinishLaunching", function () {

          // Fetch the devices
          this._fetchDevices();

        }.bind(this));
      }
    }
  }

  _fetch(type, item, callback) {
    if (_isCacheActive()) {
      this.log.debug(`Answer ${type}:${item} from cache.`);
    }
  }

  _callBlindsTargetPositions() {
    const target = this.blindsTargetPositions;
    this.blindsTargetPositions = {};
    for (const index in target) {
      const { newPosition, callback } = target[index];
      this.log.debug(`_callBlindsTargetPositions ${index} to ${newPosition}`);

      // Send stop
      axios.get(`${this.url}/blinds/${index}/scmd/set`, { params: { username: this.user, password: this.password, value: "0" } })
        .then(() => {
          this.log.debug(`Stop signal send -> ${index}`);
          axios.get(`${this.url}/blinds/${index}/scmd/set`, { params: { username: this.user, password: this.password, value: `P${newPosition}` } })
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
    this.log("_setBlindTargetPosition");
    clearTimeout(this.blindPostioner);

    // correct the blinds
    let newPosition = position;
    if (position == 100) newPosition = 99;
    if (position == 0) newPosition = 1;

    this.blindsTargetPositions = { ...this.blindsTargetPositions, [index]: { newPosition, callback } };
    this.blindPostioner = setTimeout(this._callBlindsTargetPositions.bind(this), 500);
  }

  _fetchDevices() {
    this.log.debug("Fetch the devices");
    axios.get(`${this.url}?username=${this.user}&password=${this.password}`)
      .then(response => {
        const { blinds } = response.data;
        for (const index in blinds) {
          const blind = blinds[index];
          this._registerBlind(index, blind.name);
        }
        this._getStatus();

        //this.log.debug(response.data.blinds)
      }).catch(error => { console.log(error); });
  }

  _registerBlind(index, name) {
    this.log(`Creating Blind ${name}`);
    const uuid = UUIDGen.generate(name);
    this.log(`Cached : ${uuid in this.accessories}`);

    this.blinds[index] = {
      position: 0,
      targetPosition: null
    };
    const accessory = this.accessories[uuid] || new Accessory(name, uuid);

    accessory.on("identify", function (paired, callback) {
      this.log(accessory.displayName, "Identify!!!");
      callback();
    }.bind(this));

    const service = accessory.getService(Service.WindowCovering) || accessory.addService(Service.WindowCovering, name);

    service.getCharacteristic(Characteristic.CurrentPosition).on("get", function (callback) {
      this.log(`CurrentPosition ${index}`);
      const status = this.blinds[index];
      if (!status) {
        this.log.error(`No status for ${index}`);
        return;
      }

      const position = this._position(status.position);

      this.log.debug(position);
      callback(null, 100 - position);
    }.bind(this));

    service.getCharacteristic(Characteristic.TargetPosition).on("get", function (callback) {
      this.log(`TargetPosition ${index}`);
      const status = this.blinds[index];

      const position = this._position(status.targetPosition == null ? status.position : status.targetPosition);

      this.log.debug(position);
      callback(null, 100 - position);
    }.bind(this)
    ).on("set", function (position, callback, context) {
      const realPosition = this._position(100 - position);
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
    axios.get(`${this.url}/status`, {
      params: {
        username: this.user,
        password: this.password
      }
    }).then(request => {
      const { blinds } = request.data;
      for (const item in blinds) {
        const sumState = blinds[item].sumstate.value.split(";");
        const state = {
          state: parseInt(sumState[0]),
          position: Math.round(parseFloat(sumState[1])),
          angle: parseFloat(sumState[2]),
          sumState: parseInt(sumState[3]),
          slotRotationalArea: parseInt(sumState[4])
        };
        // Update service
        if (state.position != this.blinds[item].position) {
          this.log.debug(`Update position ${item} from ${this.blinds[item].position} to ${state.position}`);
          const service = this.blindAccessories[item].getService(Service.WindowCovering);
          if (service)
            service.getCharacteristic(Characteristic.CurrentPosition).setValue(this._position(100 - state.position));
        }
        this.blinds[item] = state;
      }
    }).catch(error => {
      this.log.error(error);
    });
    this.updater = setTimeout(this._getStatus.bind(this), 5000);
  }

  _position(position) {
    const pos = Math.round(position);
    if (pos <= 2) return 0;
    if (pos >= 98) return 100;
    return pos;
  }

  configureAccessory(accessory) {
    this.log(`config cached accessories ${accessory.displayName}`);
    this.accessories[accessory.UUID] = accessory;
  }
}

module.exports = Platform;