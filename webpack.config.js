const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const JavaScriptObfuscator = require('webpack-obfuscator');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: ['./neutron.js', './ui.js'],  // Updated entry to point to your existing JS files
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],  // Minifies JS
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],  // Bundles CSS
      },
      {
        test: /\.(png|svg|jpg|gif)$/i,
        type: 'asset/resource',  // Bundles image assets
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',  // Uses your root-level index.html
      minify: {
        collapseWhitespace: true,
      },
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'img', to: 'img' },  // Copies the img folder to the dist folder
      ],
    }),
    new JavaScriptObfuscator({
      rotateStringArray: true,
    }, ['bundle.js']),  // Obfuscates the JavaScript bundle
  ],
};
