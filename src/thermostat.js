class Thernmostat {
  constructor(accessory, name, index, api, config, send, log) {
    log(`Creating Thermostat ${index} as ${name}`);
    this.accessory = accessory;
    this.index = index;
    this.name = config.name ?? name;
    log(`config: ${this.name}`);
    this.temperatureDisplayUnits = 0;
    this.currentTemperature = 0;
    this.targetTemperature = 0;
    this.currentHeatingCoolingState = 0;
    this.targetHeatingCoolingState = 0;
    this.blindPostioner = null;
    this.log = log;
    this.api = api;
    this.send = send;
    this.position = null;
    this.target = null;
    const {
      Characteristic: {
        CurrentHeatingCoolingState,
        TargetHeatingCoolingState,
        CurrentTemperature,
        TargetTemperature,
        TemperatureDisplayUnits,
      },
    } = api.hap;

    this.accessory.on('identify', this.identify.bind(this));

    const service =
      this.accessory.getService(api.hap.Service.Thermostat) ||
      this.accessory.addService(api.hap.Service.Thermostat, this.name);

    service
      .getCharacteristic(TemperatureDisplayUnits)
      .on('get', this.getter('temperatureDisplayUnits'));
    service
      .getCharacteristic(CurrentTemperature)
      .on('get', this.getter('currentTemperature'));
    service
      .getCharacteristic(TargetTemperature)
      .on('get', this.getter('targetTemperature'));
    service
      .getCharacteristic(CurrentHeatingCoolingState)
      .on('get', this.getter('currentHeatingCoolingState'));
    service
      .getCharacteristic(TargetHeatingCoolingState)
      .on('get', this.getter('targetHeatingCoolingState'));
  }

  getService = () => this.accessory.getService(this.api.hap.Service.Thermostat);

  identify(paired, callback) {
    this.log(`identify(paired: ${paired})`);

    if (callback) callback();
  }

  getter(attributeName) {
    return (callback) => {
      const value = this[attributeName];
      this.log.debug(`GET ${attributeName}: ${value}`);

      if (callback) callback(null, value);
    };
  }

  setStatus(data) {
    const sumState = data.sumstate.value.split(';');
    this.currentTemperature = parseFloat(sumState[0]);
    this.targetTemperature = parseFloat(sumState[1]);
  }
}

export default Thernmostat;
