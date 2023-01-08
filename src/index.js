const { PluginName, Name, Platform } = require('./platform');

module.exports = (api) => {
  api.registerPlatform(PluginName, Name, Platform);
};
