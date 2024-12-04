const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const httpProxy = require('http-proxy'); // 需要添加这个导入

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

  const network = process.env.DFX_NETWORK || "local";
  const canisterConfig = network === "local" ? localCanisters : prodCanisters;

  return {
    DFX_NETWORK: network,
    ...Object.entries(canisterConfig || {}).reduce((acc, [canisterName, config]) => {
      const name = canisterName.toUpperCase() + "_CANISTER_ID";
      acc[name] = config[network];
      return acc;
    }, {})
  };
}

// 创建代理实例
const proxy = httpProxy.createProxyServer();

module.exports = {
  target: "web",
  mode: "development",
  entry: {
    index: path.join(__dirname, "src", "index.js"),
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: '[name].[contenthash].js',
    publicPath: '/',
    clean: true,
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
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
            },
          },
          "postcss-loader",
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[hash][ext][query]'
        }
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[hash][ext][query]'
        }
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "src", "index.html"),
      cache: false,
    }),
    new webpack.EnvironmentPlugin(initCanisterEnv()),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ],
  devServer: {
    port: 8080,
    host: 'localhost',
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',  // 改回 8000 端口
        changeOrigin: true,
        secure: false,
      },
      '/.well-known': {
        target: 'http://127.0.0.1:8000',  // 改回 8000 端口
        changeOrigin: true,
        secure: false,
      }
    },
    static: {
      directory: path.join(__dirname, "dist"),
      publicPath: '/'
    },
    devMiddleware: {
      writeToDisk: true
    }
  }
};