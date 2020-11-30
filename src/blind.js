const TARGET_TRESHOLD = 3;

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
    this.min = Math.max(0, parseInt(adjustment?.min ?? '0', 10));
    this.max = Math.min(100, parseInt(adjustment?.max ?? '100', 10));
    const {
      Characteristic: {
        CurrentPosition,
        TargetPosition,
        PositionState,
        HoldPosition,
      },
    } = api.hap;

    this.accessory.on('identify', this.identify.bind(this));

    const service =
      this.accessory.getService(api.hap.Service.WindowCovering) ||
      this.accessory.addService(api.hap.Service.WindowCovering, name);

    service
      .getCharacteristic(CurrentPosition)
      .on('get', this.getCurrentPosition.bind(this));
    service
      .getCharacteristic(HoldPosition)
      .on('get', this.holdPosition.bind(this));
    service
      .getCharacteristic(TargetPosition)
      .on('get', this.getTargetPosition.bind(this))
      .on('set', this.setTargetPosition.bind(this));

    // Note: iOS's Home App subtracts CurrentPosition from TargetPosition to determine if it's
    // opening, closing or idle. It absolutely doesn't care about Characteristic.PositionState,
    // which is supposed to be :
    // PositionState.INCREASING = 1, PositionState.DECREASING = 0 or PositionState.STOPPED = 2
    // But in any case, let's still implement it
    service
      .getCharacteristic(PositionState)
      .on('get', this.getPositionState.bind(this));
  }

  getService = () =>
    this.accessory.getService(this.api.hap.Service.WindowCovering);

  identify(paired, callback) {
    this.log(`identify(paired: ${paired})`);
    callback();
  }

  holdPosition(callback) {
    this.log.debug(
      `holdPosition on ${this.index} pos: ${this.position} target: ${this.target}`
    );
    callback(null);
  }

  getCurrentPosition(callback) {
    this.log.debug(
      `getCurrentPosition on ${this.index} pos: ${this.position} target: ${this.target}`
    );

    callback(null, this.position);
  }

  getTargetPosition(callback) {
    const position = this.target;

    this.log.debug(`getTargetPosition of ${this.index}: ${position}`);
    callback(null, position);
  }

  setTargetPosition(position, callback) {
    if (this.target !== position) {
      this.log.debug(`setTargetPosition of ${this.index} to ${position}`);

      this.target = position;
      clearTimeout(this.blindPostioner);

      this.blindPostioner = setTimeout(
        this.callBlindSetPosition.bind(this),
        500
      );
    }
    callback(null);
  }

  getPositionState(callback) {
    this.log.debug(`getPositionSate of ${this.index}`);
    const { Characteristic: PositionState } = this.hap;
    const { DECREASING, INCREASING, STOPPED } = PositionState;

    switch (this.state) {
      case -1:
        callback(null, DECREASING);
        break;
      case 1:
        callback(null, INCREASING);
        break;
      default:
        callback(null, STOPPED);
    }
  }

  setStatus(data) {
    const oldPosition = this.position;
    const sumState = data.sumstate.value.split(';');
    this.state = parseInt(sumState[0], 10);
    const newPosition = this.gekko2homebridge(parseFloat(sumState[1]));
    if (this.position === null) {
      this.position = newPosition;
      this.target = newPosition;
    } else {
      this.position =
        Math.abs(newPosition - this.target) <= TARGET_TRESHOLD
          ? this.target
          : newPosition;
    }
    this.angle = parseFloat(sumState[2]);
    this.sumState = parseInt(sumState[3], 10);
    this.slotRotationalArea = parseInt(sumState[4], 10);

    const { Characteristic } = this.api.hap;
    // set state
    const positionState = this.getService().getCharacteristic(
      Characteristic.PositionState
    );
    this.getService()
      .getCharacteristic(Characteristic.CurrentPosition)
      .updateValue(this.position);

    const { DECREASING, INCREASING, STOPPED } = positionState;
    if (this.state === 0) {
      positionState.updateValue(STOPPED);
      if (oldPosition === this.position) {
        this.target = this.position;
        this.getService()
          .getCharacteristic(Characteristic.TargetPosition)
          .updateValue(this.target);
      }
    } else if (this.state < 0) {
      positionState.updateValue(DECREASING);
    } else if (this.state > 0) {
      positionState.updateValue(INCREASING);
    }

    if (oldPosition !== this.position) {
      if (oldPosition === null) {
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

export default Blind;
