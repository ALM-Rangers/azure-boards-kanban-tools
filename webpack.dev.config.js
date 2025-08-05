const { merge } = require("webpack-merge");
const CommonConfig = require("./webpack.base.config");

module.exports = merge(CommonConfig, {
  mode: 'development',
  output: {
    publicPath: "https://localhost:9090/dist/"
  },
  devServer: {
    server: 'https',
    port: 9090,
    open: true
  },
  stats: {
    warnings: false
  }

});
