class Thernmostat {
  constructor(accessory, name, index, api, send, log) {
    log(`Creating Thermostat ${index} as ${name}`);
    this.accessory = accessory;
    this.index = index;
    this.name = name;
    this.temperatureDisplayUnits = 0;
    this.currentTemperature = 0;
    this.targetTemperature = 0;
    this.currentHeatingCoolingState = 0;
    this.targetHeatingCoolingState = 3;
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
      .on('get', this.getter('currentTemperature'))
      .setProps({ minStep: 0.1 });
    this.log(
      `minStep: ${service.getCharacteristic(CurrentTemperature).minStep}`
    );
    service
      .getCharacteristic(TargetTemperature)
      .on('get', this.getter('targetTemperature'))
      .on('set', this.setTargetTemperature.bind(this))
      .setProps({ minValue: 14.0, maxValue: 26.0, minStep: 0.5 });
    service
      .getCharacteristic(CurrentHeatingCoolingState)
      .on('get', this.getter('currentHeatingCoolingState'));
    service
      .getCharacteristic(TargetHeatingCoolingState)
      .on('get', this.getter('targetHeatingCoolingState'))
      .on('set', this.setTargetHeatingCoolingState.bind(this));
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

  setTargetTemperature(value, callback) {
    this.log.debug(
      `THERMOSTAT::setTargetTemperature ${this.index} to ${value}`
    );
    this.send(`/roomtemps/${this.index}/scmd/set`, `S${value}`);

    callback(null);
  }

  setTargetHeatingCoolingState(value, callback) {
    this.log.debug(
      `THERMOSTAT::setTargetHeatingCoolingState ${this.index} to ${value}`
    );

    callback(null);
  }

  setStatus(data) {
    if (this.index == 'item1') this.log(data);
    const sumState = data.sumstate.value.split(';');
    this.currentTemperature = parseFloat(sumState[0]);
    this.targetTemperature = parseFloat(sumState[1]);
    const cooling = parseInt(sumState[6], 10);
    this.currentHeatingCoolingState = cooling === 1 ? 2 : 0;
  }
}

export default Thernmostat;