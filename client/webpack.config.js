var webpack = require("webpack"),
    HtmlWebpackPlugin = require("html-webpack-plugin"),
    path = require("path");

module.exports = {
  entry: {
    app: "./src/app.js",
    vendor: [
      "d3",
      "d3-cloud",
      "jquery"
    ]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.js/,
        enforce: "pre",
        loader: "eslint-loader",
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          "css-loader",
          "sass-loader"
        ]
      }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({
      name: "vendor",
      filename: "vendor.bundle.js"
    }),
    new HtmlWebpackPlugin({
      template: __dirname + "/src/index.ejs",
    })
  ]
};
