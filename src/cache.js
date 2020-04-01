const axios = require("axios");

class Cache {
  constructor(url, log) {
    this.url = url;
    this.log = log;
    this.cache = null;
    this.cacheTimer = null;
    this.isCalling = false;
    this.getter = [];
  }

  isActive() {
    return this.cache != null && this.cacheTimer != null;
  }

  dirtyCache() {
    clearTimeout(this.cacheTimer);
    this.cacheTimer = null;
  }

  get(callback) {
    if (this.isActive()) {
      callback(this.cache);
      return;
    }

    this.getter.push(callback);
    this.fetch();
  }

  fetch() {
    this.log("CACHE FETCH");
    if (this.isActive()) return;

    if (this.getter.length == 0) return;

    if (this.isCalling) return;

    this.isCalling = true;
    axios.get(this.url)
      .then(request => {
        this.log("CACHE DATA");
        const { blinds: rBlinds } = request.data;
        const blinds = {};
        for (const item in rBlinds) {
          const sumState = rBlinds[item].sumstate.value.split(";");
          const state = {
            state: parseInt(sumState[0]),
            position: Math.round(parseFloat(sumState[1])),
            angle: parseFloat(sumState[2]),
            sumState: parseInt(sumState[3]),
            slotRotationalArea: parseInt(sumState[4])
          };
          blinds[item] = state;
          //this.log.debug(item, state);
        }
        this.cache = { blinds };
        this.cacheTimer = setTimeout(this.dirtyCache.bind(this), 2000);
        this.log("CACHE DATA getter", this.getter.length);
        while (this.getter.length > 0) this.getter.pop()(null, this.cache);
      })
      .catch(error => {
        this.log.error(`Error: ${error.message}`);

        while (this.getter.length > 0) this.getter.pop()(new Error(error.message));
      }).finally(() => {
        this.isCalling = false;
      });
  }
}

module.exports = Cache;