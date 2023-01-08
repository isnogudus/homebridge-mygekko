class Humidity {
  constructor(platform, accessory, name, key) {
    platform.log(`Creating Humidity ${key} as ${name}`);
    this.key = key;
    this.api = platform.api;
    this.log = platform.log;
    this.humidity = 0;

    const {
      Characteristic: { CurrentRelativeHumidity },
    } = this.api.hap;

    this.service =
      accessory.getService(this.api.hap.Service.HumiditySensor) ||
      accessory.addService(this.api.hap.Service.HumiditySensor, name);

    this.service
      .getCharacteristic(CurrentRelativeHumidity)
      .onGet(() => this.humidity);
  }

  setStatus(data) {
    const {
      Characteristic: { CurrentRelativeHumidity },
    } = this.api.hap;
    const sumState = data.sumstate.value.split(';');
    this.humidity = parseInt(sumState[5], 10);

    this.service
      .getCharacteristic(CurrentRelativeHumidity)
      .updateValue(this.humidity);
  }
}

module.exports = Humidity;
