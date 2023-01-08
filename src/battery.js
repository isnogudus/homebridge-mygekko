class Battery {
  constructor(platform, accessory, name, key) {
    platform.log(`Creating Battery ${key} as ${name}`);
    this.key = key;
    this.api = platform.api;
    this.log = platform.log;

    this.batteryLevel = 0;
    this.chargingState = 0;
    this.statusLowBattery = 0;

    const {
      Characteristic: { BatteryLevel, ChargingState, StatusLowBattery },
    } = this.api.hap;

    this.service =
      accessory.getService(this.api.hap.Service.Battery) ||
      accessory.addService(this.api.hap.Service.Battery, name);

    this.service.getCharacteristic(BatteryLevel).onGet(() => this.batteryLevel);

    this.service
      .getCharacteristic(ChargingState)
      .onGet(() => this.chargingState);

    this.service
      .getCharacteristic(StatusLowBattery)
      .onGet(() => this.statusLowBattery);
  }

  setStatus(data) {
    const {
      Characteristic: { BatteryLevel, ChargingState, StatusLowBattery },
    } = this.api.hap;

    const sumState = data.sumstate.value.split(';');

    // const state = parseInt(sumState[3], 10);
    const charging = parseInt(sumState[8], 10);

    this.chargingState =
      charging > 0 ? ChargingState.CHARGING : ChargingState.NOT_CHARGING;

    this.batteryLevel = parseInt(sumState[20], 10);

    this.statusLowBattery =
      this.batteryLevel < 5
        ? StatusLowBattery.BATTERY_LEVEL_LOW
        : StatusLowBattery.BATTERY_LEVEL_NORMAL;

    this.service
      .getCharacteristic(ChargingState)
      .updateValue(this.chargingState);
    this.service
      .getCharacteristic(StatusLowBattery)
      .updateValue(this.statusLowBattery);
    this.service.getCharacteristic(BatteryLevel).updateValue(this.batteryLevel);
  }
}

module.exports = Battery;
