const jsStringify = require("javascript-stringify");
const _ = require("lodash");

const baseWebpack = {
    entry: './src/index.js',
    output: {
        path: "CODE:path.resolve(__dirname, 'dist')",
        filename: 'bundle.js'
    },
    mode: 'development'
}

const baseWebpackImports = [
    "const webpack = require('webpack');",
    "const path = require('path');"
];

function addPlugin(webpackConfig, plugin) {
    if (!webpackConfig.plugins) {
        return Object.assign({}, webpackConfig, {
            plugins: [plugin]
        })
    }
    return Object.assign({}, webpackConfig, {
        plugins: _.concat(webpackConfig.plugins, plugin)
    })
}

function addModuleRule(webpackConfig, rule) {
    if (!_.has(webpackConfig, "module.rules")) {
        return Object.assign({}, webpackConfig, {
            module: {
                rules: [rule]
            }
        })
    }

    const newWebpackConfig = _.cloneDeep(webpackConfig);
    newWebpackConfig.module.rules.push(rule);
    return newWebpackConfig;
}

export const features = (()=>{
    const features = {
        "React": {
            babel: (babelConfig) => Object.assign({}, babelConfig, {
                "presets": [['env', { modules: false }], "react"]
            }),
            npm: ["react", "react-dom", "babel-loader", "babel-preset-react", "babel-core", "babel-preset-env"],
            webpack: (webpackConfig) =>
                Object.assign({}, webpackConfig, addModuleRule(webpackConfig, {
                    test: /\.(js|jsx)$/,
                    exclude: /node_modules/,
                    use: 'babel-loader'
                }), {
                    resolve: {
                        extensions: ['.js', '.jsx']
                    }
                })
        },
        "CSS": {
            npm: ["style-loader", "css-loader"],
            webpack: (webpackConfig) => addModuleRule(webpackConfig, {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            })
        },
        "sass": {
            npm: ["style-loader", "css-loader", "sass-loader", "node-sass"],
            webpack: (webpackConfig) => addModuleRule(webpackConfig, {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader'
                ]
            })
        },
        "less": {
            npm: ["style-loader", "css-loader", "less-loader"],
            webpack: (webpackConfig) => addModuleRule(webpackConfig, {
                test: /\.less$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'less-loader'
                ]
            })
        },
        "stylus": {
            npm: ["style-loader", "css-loader", "stylus-loader"],
            webpack: (webpackConfig) => addModuleRule(webpackConfig, {
                test: /\.styl$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'stylus-loader'
                ]
            })
        },
        "SVG": {
            npm: ["file-loader"],
            webpack: (webpackConfig) => addModuleRule(webpackConfig, {
                test: /\.svg$/,
                use: [
                    "file-loader"
                ]
            })
        },
        "PNG": {
            npm: ["url-loader"],
            webpack: (webpackConfig) => addModuleRule(webpackConfig, {
                test: /\.png$/,
                use: [{
                    loader: 'url-loader',
                    options:{
                        mimetype:'image/png'
                    }
                }]
            })
        },
        "moment": {
            "npm": ["moment"],
            webpack: (webpackConfig) => addPlugin(webpackConfig, "CODE:new webpack.ContextReplacementPlugin(/moment[\\\/\\\\]locale$/, /en/)")
        },
        "lodash": {
            babel: _.identity,
            npm: ["lodash", "lodash-webpack-plugin"],
            webpackImports: ["const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');"],
            webpack:
            (webpackConfig) => addPlugin(webpackConfig, "CODE:new LodashModuleReplacementPlugin")
        },
        "Production mode": {
            webpack: (webpackConfig) => Object.assign({}, webpackConfig, {"mode": "production"})
        }
    }
    return _.mapValues(features, (item) => {
        if (!item.babel) {
            item.babel = _.identity;
        }
        if (!item.webpack) {
            item.webpack = _.identity;
        }
        if (!item.webpackImports) {
            item.webpackImports = [];
        }
        if (!item.npm) {
            item.npm = [];
        }
        return item;
    })
})()

function stringifyReplacer (value, indent, stringify) {
  if (typeof value === 'string' && value.startsWith("CODE:")) {
      return value.replace(/"/g, '\\"').replace(/^CODE:/, "");
  }

  return stringify(value);
}

function createConfig(configItems, configType) {
    const base = configType === "webpack" ? baseWebpack : {};
    return jsStringify(_.reduce(configItems, (acc, currentValue) => (features[currentValue][configType](acc)), base), stringifyReplacer, 2)
}

export function getNpmModules(configItems) {
    return _.chain(configItems)
        .reduce((acc, currentValue) => (_.concat(acc, features[currentValue]["npm"])), ["webpack"])
        .uniq()
        .values();
}

export function getWebpackImports(configItems) {
    return _.reduce(configItems, (acc, currentValue) => (_.concat(acc, features[currentValue]["webpackImports"])), [])
}

export function createBabelConfig(configItems) {
    const config = createConfig(configItems, "babel");
    return config === "{}" ? null : config;

}

export function createWebpackConfig(configItems) {
    const imports = _.concat(baseWebpackImports, getWebpackImports(configItems))
    return `${imports.join("\n")}

const config = ${createConfig(configItems, "webpack")}

module.exports = config;`;
}
