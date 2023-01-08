const TARGET_THRESHOLD = 3;
const TARGET_TIME_THRESHOLD_IN_MS = 60000;

class Blind {
  constructor(platform, accessory, name, key) {
    platform.log(`Creating Blind ${key} as ${name}`);
    this.api = platform.api;
    this.key = key;
    this.name = name;
    this.log = platform.log;
    this.sender = platform.sender;
    this.targetTimestamp = 0;
    const {
      Characteristic: { CurrentPosition, TargetPosition, PositionState },
      Service,
    } = platform.api.hap;

    this.target = 0;
    this.current = 0;
    this.position = PositionState.STOPPED;

    this.service =
      accessory.getService(Service.WindowCovering) ||
      accessory.addService(Service.WindowCovering, name);

    this.service.getCharacteristic(CurrentPosition).onGet(() => this.current);

    this.service
      .getCharacteristic(TargetPosition)
      .onGet(() => this.target)
      .onSet(this.setTargetPosition);

    this.service.getCharacteristic(PositionState).onGet(() => this.position);
  }

  setTargetPosition = (position) => {
    if (position === undefined || position === null) return;

    this.targetTimestamp = Date.now();
    this.log.debug(`setTargetPosition of ${this.key} to ${position}`);
    this.target = position;

    this.sender(`blinds/${this.key}/scmd/set`, `P${100 - position}`).catch(
      (reason) =>
        reason === 'REPLACED' ? this.log.debug(reason) : this.log.error(reason)
    );
  };

  setStatus(data, initial) {
    const {
      Characteristic: { CurrentPosition, TargetPosition, PositionState },
    } = this.api.hap;

    const sumState = data.sumstate.value.split(';');
    const state = parseInt(sumState[0], 10);
    const rawPosition = Math.round(parseFloat(sumState[1]));

    this.current = 100 - rawPosition;

    if (state === 0) this.position = PositionState.STOPPED;
    else if (state < 0) this.position = PositionState.DECREASING;
    else this.position = PositionState.INCREASING;

    if (initial) {
      this.target = this.current;

      this.log.debug(
        `Initialize ${this.key} to ${this.current} ${this.target} ${this.position}`
      );
      this.service.getCharacteristic(CurrentPosition).updateValue(this.current);
      this.service.getCharacteristic(TargetPosition).updateValue(this.target);
      this.service.getCharacteristic(PositionState).updateValue(this.position);

      return;
    }

    if (state !== 0)
      this.log.debug(
        `Update position ${this.key} to ${this.current} with target ${this.target}`
      );

    if (this.current !== this.target) {
      if (Math.abs(this.current - this.target) <= TARGET_THRESHOLD)
        this.current = this.target;
      else if (
        this.position === PositionState.STOPPED &&
        this.targetTimestamp + TARGET_TIME_THRESHOLD_IN_MS < Date.now()
      )
        this.target = this.current;
    }

    this.service.getCharacteristic(CurrentPosition).updateValue(this.current);
    this.service.getCharacteristic(TargetPosition).updateValue(this.target);
    this.service.getCharacteristic(PositionState).updateValue(this.position);
  }
}

module.exports = Blind;
