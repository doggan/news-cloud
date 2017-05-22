var webpack = require("webpack"),
    HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: {
    app: "./src/app.js",
    vendor: [
      "d3",
      "d3.layout.cloud",
      "jquery"
    ]
  },
  output: {
    path: "./dist",
    filename: "bundle.js"
  },
  module: {
    preLoaders: [
      {
        test: /\.js/,
        loader: "eslint",
      }
    ],
    loaders: [
      {
        test: /\.scss$/,
        loaders: ["style-loader", "css-loader", "sass-loader"]
      }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin("vendor", "vendor.bundle.js"),
    new HtmlWebpackPlugin({
      template: __dirname + "/src/index.ejs",
    })
  ]
};
