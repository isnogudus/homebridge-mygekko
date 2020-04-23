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
    this.position = 0;
    this.target = null;
    this.min = Math.max(0, parseInt(adjustment?.min ?? "0"));
    this.max = Math.min(100, parseInt(adjustment?.max ?? "100"));
    const { Service, Characteristic } = this.api.hap;
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
    this.log.debug(`getCurrentPosition on ${this.index} pos: ${this.position} target: ${this.target}`);

    if (this.target !== null && Math.abs(this.position - this.target) <= 2)
      callback(null, this.target);
    else
      callback(null, this.position);
  }

  getTargetPosition(callback) {

    const position = this.target === null ? this.position : this.target;

    this.log(`getTargetPosition ${this.index} `);
    this.log.debug(position);
    callback(null, position);
  }

  setTargetPosition(position, callback, context) {
    this.log(`setTargetPosition ${this.index} to ${position}`);

    this.target = position;
    this._callBlind(position);
    callback(null);
  }

  getPositionState(callback) {
    this.log(`getPositionSate ${this.index}`);

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
    if (this.index == "item13") {
      this.log.debug(`item13 ${this.min} ${this.max} ${sumState[1]} ${parseFloat(sumState[1])} ${this._gekko2homebridge(parseFloat(sumState[1]))} ${oldPosition} ${this.position} ${oldPosition != this.position}`);
    }
    if (oldPosition != this.position) {
      // Update service
      const { Service, Characteristic } = this.api.hap;
      this.log.debug(`Update position ${this.index} from ${oldPosition} to ${this.position}`);
      const service = this.accessory.getService(Service.WindowCovering);
      if (service)
        service.getCharacteristic(Characteristic.CurrentPosition).setValue(this.position);
    }
  }

  _callBlind(position) {
    this.log(`_callBlind ${this.index} ${position}`);
    clearTimeout(this.blindPostioner);

    this.blindPostioner = setTimeout(this._callBlindSetPosition.bind(this), 1000);
  }

  _callBlindSetPosition() {
    const target = this._homebridge2gekko(this.target);
    this.log.debug(`_callBlindSetPosition ${this.index} to ${target}`);
    this.send(`/blinds/${this.index}/scmd/set`, `P${target}`);
  }

  _homebridge2gekko(position) {
    return Math.max(this.min, Math.min(this.max, 100 - position));
  }
  _gekko2homebridge(position) {
    let pos;
    if (position < 10.0)
      pos = Math.floor(position);
    else if (position > 90.0)
      pos = Math.ceil(position);
    else
      pos = Math.round(position);

    if (pos <= this.min) return 0;
    if (pos >= this.max) return 100;

    return 100 - pos;
  }
}

export default Blind;