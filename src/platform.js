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

        this.blinds[index] = new Blind(accessory, name, index, this.api, this.blindAdjustment[index], this._send.bind(this), this.log);
      }
      this._getStatus();

      //this.log.debug(response.data.blinds)
    }).catch(error => { console.log(error); });
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

  configureAccessory(accessory) {
    this.log(`config cached accessories ${accessory.displayName}`);
    this.accessories[accessory.UUID] = accessory;
  }
}

module.exports = Platform;