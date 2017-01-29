module.exports = {
  entry: "./src/app.js",
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
  }
};
