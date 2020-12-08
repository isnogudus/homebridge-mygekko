class Roomtemp {
  constructor(accessory, name, index, api, send, log) {
    log(`Creating Blind ${index} as ${name}`);
    this.accessory = accessory;
    this.index = index;
    this.name = name;
    this.temperatureDisplayUnits = 0;
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

    const service =
      this.accessory.getService(api.hap.Service.Thermostat) ||
      this.accessory.addService(api.hap.Service.Thermostat, name);

    service
      .getCharacteristic(TemperatureDisplayUnits)
      .on(
        'get',
        this.getter('Get TemperatureDisplayUnits', this.temperatureDisplayUnits)
      );
    service
      .getCharacteristic(CurrentTemperature)
      .on(
        'get',
        this.getter('Get CurrentTemperature', this.currentTemperature)
      );
    service
      .getCharacteristic(TargetTemperature)
      .on('get', this.getter('Get TargetTemperature', this.targetTemperature));
    service
      .getCharacteristic(CurrentHeatingCoolingState)
      .on(
        'get',
        this.getter(
          'Get CurrentHeatingCoolingState',
          this.currentHeatingCoolingState
        )
      );
    service
      .getCharacteristic(TargetHeatingCoolingState)
      .on(
        'get',
        this.getter(
          'Get TargetHeatingCoolingState',
          this.targetHeatingCoolingState
        )
      );
  }

  getter(text, value) {
    return (callback) => {
      this.log.debug(`${text}: ${value}`);

      if (callback) callback(null, value);
    };
  }

  setStatus() {}
}

export default Roomtemp;
