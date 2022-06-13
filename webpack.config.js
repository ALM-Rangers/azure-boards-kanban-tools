const webpack = require("webpack");

module.exports = function (env) {

  if (!env.dev) {
    return require(`./webpack.prod.config`);
  }
  else {
    return require(`./webpack.dev.config`);
  }

};