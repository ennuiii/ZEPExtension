const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    // Remove entry points since we're using standalone HTML files
    entry: {},
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      publicPath: './',
      clean: true
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource'
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/workitem-group/workitem-group.html',
        filename: 'workitem-group.html',
        chunks: []
      }),
      new HtmlWebpackPlugin({
        template: './src/settings/settings.html',
        filename: 'settings.html',
        chunks: []
      })
    ],
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    mode: argv.mode || 'development',
    optimization: {
      minimize: isProduction,
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    externals: {
      // Azure DevOps extension SDK is loaded externally
      'azure-devops-extension-sdk': 'SDK'
    }
  };
}; 