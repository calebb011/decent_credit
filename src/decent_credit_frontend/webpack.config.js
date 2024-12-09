const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
<<<<<<< HEAD

function initCanisterEnv() {
  let localCanisters, prodCanisters;

=======
const httpProxy = require('http-proxy'); // 需要添加这个导入

function initCanisterEnv() {
  let localCanisters, prodCanisters;
>>>>>>> dec-test
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

<<<<<<< HEAD
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

=======
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

>>>>>>> dec-test
module.exports = {
  target: "web",
  mode: "development",
  entry: {
    index: path.join(__dirname, "src", "index.js"),
  },
  output: {
    path: path.join(__dirname, "dist"),
<<<<<<< HEAD
    filename: "index.js",
    sourceMapFilename: "[name].js.map",
=======
    filename: '[name].[contenthash].js',
    publicPath: '/',
    clean: true,
>>>>>>> dec-test
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
<<<<<<< HEAD
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
=======
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
>>>>>>> dec-test
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
<<<<<<< HEAD
      template: path.join(__dirname, "public", "index.html"),
=======
      template: path.join(__dirname, "src", "index.html"),
>>>>>>> dec-test
      cache: false,
    }),
    new webpack.EnvironmentPlugin(initCanisterEnv()),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ],
  devServer: {
<<<<<<< HEAD
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
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "X-Requested-With, content-type, Authorization",
    },
  },
=======
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
>>>>>>> dec-test
};