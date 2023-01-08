class Thermostat {
  constructor(platform, accessory, name, key) {
    this.key = key;
    this.api = platform.api;
    this.log = platform.log;
    platform.log(`Creating Thermostat ${key} as ${name}`);

    this.current = 0;

    const {
      Characteristic: { CurrentTemperature },
    } = this.api.hap;

    this.service =
      accessory.getService(this.api.hap.Service.TemperatureSensor) ||
      accessory.addService(this.api.hap.Service.TemperatureSensor, name);

    this.service
      .getCharacteristic(CurrentTemperature)
      .onGet(() => this.current);
  }

  setStatus(data) {
    const {
      Characteristic: { CurrentTemperature },
    } = this.api.hap;
    const sumState = data.sumstate.value.split(';');
    this.current = parseInt(sumState[0], 10);

    this.service
      .getCharacteristic(CurrentTemperature)
      .updateValue(this.current);
  }
}

module.exports = Thermostat;
