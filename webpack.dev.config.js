const { merge } = require("webpack-merge");
const CommonConfig = require("./webpack.base.config");

module.exports = merge(CommonConfig, {
  mode: 'development',
  output: {
    publicPath: "https://localhost:9090/dist"
  },
  devServer: {
    https: true,
    port: 9090,
    open: true
  },
  stats: {
    warnings: false
  }

});
