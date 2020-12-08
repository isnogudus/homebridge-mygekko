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

  getService = () => this.accessory.getService(this.api.hap.Service.Thermostat);

  identify(paired, callback) {
    this.log(`identify(paired: ${paired})`);

    if (callback) callback();
  }

  getter(text, value) {
    return (callback) => {
      this.log.debug(`${text}: ${value}`);

      if (callback) callback(null, value);
    };
  }

  setStatus(data) {
    this.log.debug(data);
  }
}

export default Thernmostat;
