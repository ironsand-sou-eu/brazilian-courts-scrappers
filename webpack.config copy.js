const path = require("path")

module.exports = {
  cache: false,
  entry: "./src/index.ts",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  resolve: {
    extensions: [".js", ".ts"],
  },

  module: {
    rules: [
      {
        test: /\.[jt]s$/,
        include: [path.resolve(__dirname, "src")],
        use: {
          loader: "ts-loader",
        },
      },
    ],
  }
}
