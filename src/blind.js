const TARGET_TRESHOLD = 3;
const TARGET_TIME_TRESHOLD_IN_MS = 60000;

class Blind {
  constructor(accessory, name, index, api, adjustment, send, log) {
    log(`Creating Blind ${index} as ${name}`);
    this.accessory = accessory;
    this.index = index;
    this.name = name;
    this.blindPostioner = null;
    this.log = log;
    this.api = api;
    this.send = send;
    this.position = null;
    this.target = null;
    this.targetTimestamp = 0;
    this.min = Math.max(0, parseInt(adjustment?.min ?? '0', 10));
    this.max = Math.min(100, parseInt(adjustment?.max ?? '100', 10));
    const {
      Characteristic: {
        CurrentPosition,
        TargetPosition,
        PositionState
      },
    } = api.hap;
    this.positionState = PositionState.STOPPED;

    this.accessory.on('identify', this.identify.bind(this));

    const service =
      this.accessory.getService(api.hap.Service.WindowCovering) ||
      this.accessory.addService(api.hap.Service.WindowCovering, name);

    service
      .getCharacteristic(CurrentPosition)
      .on('get', this.getter("position"));
    service
      .getCharacteristic(TargetPosition)
      .on('get', this.getter("target"))
      .on('set', this.setTargetPosition.bind(this));
    service
      .getCharacteristic(PositionState)
      .on('get', this.getter("positionState"));
  }

  getService = () =>
    this.accessory.getService(this.api.hap.Service.WindowCovering);

  identify(paired, callback) {
    this.log(`identify(paired: ${paired})`);

    if (callback) callback();
  }

  getter(attributeName) {
    return (callback) => {
      const value = this[attributeName];
      this.log.debug(`BLIND::GET ${attributeName}: ${value}`);

      if (callback) callback(null, value);
    };
  }

  setTargetPosition(position, callback) {
    this.targetTimestamp = Date.now();
    this.log.debug(`setTargetPosition of ${this.index} to ${position}`);

    this.target = position;
    clearTimeout(this.blindPostioner);

    this.blindPostioner = setTimeout(this.callBlindSetPosition.bind(this), 500);
    if (callback) callback(null, this.target);
  }

  setStatus(data) {
    const oldPosition = this.position;
    const timestamp = Date.now();
    let rawPosition;
    [this.state,rawPosition,this.angle,this.sumState,this.slotRotationalArea] = data.sumstate.value;
    const newPosition = this.gekko2homebridge(rawPosition);
    if (this.timestamp === 0) {
      this.position = newPosition;
      this.target = newPosition;
    } else {
      this.position =
        Math.abs(newPosition - this.target) <= TARGET_TRESHOLD
          ? this.target
          : newPosition;
    }

    const { Characteristic: {CurrentPosition, TargetPosition, PositionState} } = this.api.hap;
    // set state
    const positionState = this.getService().getCharacteristic(
      PositionState
    );
    this.getService()
      .getCharacteristic(CurrentPosition)
      .updateValue(this.position);

    switch (this.state) {
      case -1:
        this.positionState = PositionState.DECREASING;
        break;
      case 1:
        this.positionState = PositionState.INCREASING;
        break;
      default:
        this.positionState = PositionState.STOPPED;
        if (this.target !== this.position && this.targetTimestamp + TARGET_TIME_TRESHOLD_IN_MS < timestamp) {
          this.target = this.position;
          this.getService()
            .getCharacteristic(TargetPosition)
            .updateValue(this.target);
        }
    }
    positionState.updateValue(this.positionState);

    if (this.positionState !== PositionState.STOPPED) {
      if (this.targetTimestamp === 0) {
        this.log.debug(`Initialize position ${this.index} to ${this.position}`);
      } else {
        this.log.debug(
          `Update position ${this.index} from ${oldPosition} to ${this.position}`
        );
      }
    }
  }

  callBlindSetPosition() {
    const target = this.homebridge2gekko(this.target);
    this.log.debug(`_callBlindSetPosition ${this.index} to ${target}`);
    this.send(`/blinds/${this.index}/scmd/set`, `P${target}`);
  }

  homebridge2gekko(position) {
    return Math.max(this.min, Math.min(this.max, 100 - position));
  }

  gekko2homebridge(position) {
    let pos;
    if (position < 10.0) {
      pos = Math.floor(position);
    } else if (position > 90.0) {
      pos = Math.ceil(position);
    } else {
      pos = Math.round(position);
    }

    if (pos <= this.min) pos = 0;
    if (pos >= this.max) pos = 100;

    return 100 - pos;
  }
}

module.exports = Blind;
