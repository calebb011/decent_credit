const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

function initCanisterEnv() {
  let localCanisters, prodCanisters;
  const canisters = {
    decent_credit_backend: { local: "bkyz2-fmaaa-aaaaa-qaaaq-cai" },
    decent_credit_frontend: { local: "bd3sg-teaaa-aaaaa-qaaba-cai" },
    internet_identity: { local: "be2us-64aaa-aaaaa-qaabq-cai" }
  };

  try {
    localCanisters = require(path.resolve(__dirname, "../../.dfx", "local", "canister_ids.json"));
  } catch (error) {
    console.log("No local canister_ids.json found, using defaults");
    localCanisters = canisters;
  }

  try {
    prodCanisters = require(path.resolve(__dirname, "../../canister_ids.json"));
  } catch (error) {
    console.log("No production canister_ids.json found, using defaults");
    prodCanisters = canisters;
  }

  const network = process.env.DFX_NETWORK || "local";
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
    publicPath: '/'
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
      template: path.join(__dirname, "src", "index.html"),
      cache: false,
    }),
    new webpack.EnvironmentPlugin(initCanisterEnv()),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.DFX_NETWORK': JSON.stringify('local')
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ],
  devServer: {
    port: 8000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
        secure: false,
      },
      '/.well-known': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
        secure: false,
      },
      '/api/v2/canister': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
        secure: false,
      }
    },
    hot: true,
    liveReload: true,
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, 'src'),
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization",
      "Access-Control-Allow-Credentials": "true"
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      return middlewares;
    },
    compress: true,
    open: true,
  },
};