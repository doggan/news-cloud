var webpack = require("webpack"),
    HtmlWebpackPlugin = require("html-webpack-plugin"),
    path = require("path");

var isProduction = process.env.NODE_ENV === "production";

var config = {
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
    filename: isProduction ? "bundle.min.js" : "bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
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
    }),
    new webpack.DefinePlugin({
      NEWS_API_HOST: isProduction ?
        JSON.stringify("https://gentle-ridge-44639.herokuapp.com") :
        JSON.stringify("http://localhost:5000"),
    }),
  ]
};

module.exports = config;
