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
    open: true,
    static: [
      {
        directory: './dist',
        publicPath: '/dist'
      },
      {
        directory: './dist',
        publicPath: '/'
      }
    ],
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    },
    allowedHosts: 'all'
  },
  stats: {
    warnings: false
  }

});
