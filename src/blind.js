class Blind {
  constructor(accessory, name, index, api, adjustment, log) {
    log(`Creating Blind ${index} as ${name}`);
    this.positionBlind = null;
    this.log = log;
    this.api = api;
    this.position = 0;
    this.target = null;
    this.min = Math.max(0, parseInt(adjustment?.min ?? "0"));
    this.max = Math.min(100, parseInt(adjustment?.max ?? "100"));
    const { Service, Characteristic } = this.api.hap;
    this.accessory = accessory;
    this.accessory.on("identify", this.identify.bind(this));

    const service = this.accessory.getService(Service.WindowCovering) || this.accessory.addService(Service.WindowCovering, name);

    service.getCharacteristic(Characteristic.CurrentPosition)
      .on("get", this.getCurrentPosition.bind(this));
    service.getCharacteristic(Characteristic.TargetPosition)
      .on("get", this.getTargetPosition.bind(this))
      .on("set", this.setTargetPosition.bind(this));

    // Note: iOS's Home App subtracts CurrentPosition from TargetPosition to determine if it's opening, closing or idle.
    // It absolutely doesn't care about Characteristic.PositionState, which is supposed to be :
    // PositionState.INCREASING = 1, PositionState.DECREASING = 0 or PositionState.STOPPED = 2
    // But in any case, let's still implement it
    service.getCharacteristic(Characteristic.PositionState)
      .on("get", this.getPositionState.bind(this));
  }

  identify(paired, callback) {
    this.log(`identify(paired: ${paired})`);
    callback();
  }

  getCurrentPosition(callback) {
    const position = this._position(this.position);
    log.debug(`getCurrentPosition on ${index} pos: ${position} target: ${this.targetPosition}`);

    if (this.target !== null && Math.abs(position - this.target) <= 2)
      callback(null, 100 - status.target);
    else
      callback(null, 100 - position);
  }

  getTargetPosition(callback) {
    this.log(`getTargetPosition ${index}`);

    const position = this._position(index, status.targetPosition === null ? this.position : this.target);

    this.log.debug(position);
    callback(null, 100 - position);
  }

  setTargetPosition(position, callback, context) {
    log(`setTargetPosition ${index} to ${position}`);

    this.targetPosition = position;
    this._callBlind(position);
    callback(null);
  }

  getPositionState(callback) {
    this.log(`getPositionSate ${index}`);

    switch (this.state) {
      case -1:
        callback(null, PositionState.DECREASING);
        break;
      case 1:
        callback(null, PositionState.INCREASING);
        break;
      default:
        callback(null, PositionState.STOPPED);
    }
  }

  setStatus(data) {
    const oldPosition = this.position;
    const sumState = data.sumstate.value.split(";");
    this.state = parseInt(sumState[0]);
    this.position = this._gekko2homebridge(parseFloat(sumState[1]));
    this.angle = parseFloat(sumState[2]);
    this.sumState = parseInt(sumState[3]);
    this.slotRotationalArea = parseInt(sumState[4]);
    if (oldPosition != this.position) {
      // Update service
      const { Service, Characteristic } = this.api.hap;
      this.log.debug(`Update position ${this.item} from ${oldPosition} to ${this.position}`);
      const service = this.accessory.getService(Service.WindowCovering);
      if (service)
        service.getCharacteristic(Characteristic.CurrentPosition).setValue(this.position);
    }
  };

  _callBlind(position) {
    this.log(`_callBlind ${index} ${position}`);
    clearTimeout(this.positionBlind);

    // correct the blinds
    const newPosition = Math.min(max, Math.max(min, position));
    this.log(`_setBlindTargetPosition ${newPosition} ${min} ${max}`);

    this.blindPostioner = setTimeout(this._callBlindSetPosition.bind(this), 1000);
  }

  _callBlindSetPosition() {
    const target = this._homebridge2gekko(this.target);
    this.log.debug(`_callBlindSetPosition ${this.index} to ${target}`);
    this._send(`/blinds/${this.index}/scmd/set`, `P${target}`);
  }

  _homebridge2gekko(position) {
    return Math.max(this.min, Math.min(this.max, 100 - position));
  }
  _gekko2homebridge(position) {
    const pos = Math.round(position);
    if (pos <= this.min) return 0;
    if (pos >= this.max) return 100;

    return 100 - pos;
  }
}

export default Blind;