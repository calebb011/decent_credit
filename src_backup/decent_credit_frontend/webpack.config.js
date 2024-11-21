const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

function initCanisterEnv() {
  let localCanisters, prodCanisters;

  try {
    localCanisters = require(path.resolve(".dfx", "local", "canister_ids.json"));
  } catch (error) {
    console.log("No local canister_ids.json found");
  }

  try {
    prodCanisters = require(path.resolve("canister_ids.json"));
  } catch (error) {
    console.log("No production canister_ids.json found");
  }

  const network =
    process.env.DFX_NETWORK ||
    (process.env.NODE_ENV === "production" ? "ic" : "local");
  const canisterConfig = network === "local" ? localCanisters : prodCanisters;

  const env = {
    DFX_NETWORK: network,
  };

  if (canisterConfig) {
    for (const canister in canisterConfig) {
      const canisterName = canister.toUpperCase() + "_CANISTER_ID";
      env[canisterName] = canisterConfig[canister][network];
      console.log(`Setting ${canisterName}:`, env[canisterName]);
    }
  }

  return env;
}

module.exports = {
  target: "web",
  mode: "development",
  entry: {
    index: path.join(__dirname, "src", "index.js"),
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "index.js",
    sourceMapFilename: "[name].js.map",
    publicPath: '/'  // 添加这行

  },
  devtool: "source-map",
  optimization: {
    minimize: false,
  },
  resolve: {
    extensions: [".js", ".jsx"],
    fallback: {
      assert: require.resolve("assert/"),
      buffer: require.resolve("buffer/"),
      events: require.resolve("events/"),
      stream: require.resolve("stream-browserify/"),
      util: require.resolve("util/"),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/i,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  require("tailwindcss"),
                  require("autoprefixer"),
                ],
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "public", "index.html"),
      cache: false,
    }),
    new webpack.EnvironmentPlugin(initCanisterEnv()),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ],
  devServer: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
        pathRewrite: {
          "^/api": "/api",
        },
      },
    },
    hot: true,
    historyApiFallback: true,
    static: {            // 添加静态文件配置
      directory: path.join(__dirname, 'public'),
  },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "X-Requested-With, content-type, Authorization",
    },
    compress: true,     // 启用 gzip 压缩
    open: true,         // 自动打开浏览器
  },
};