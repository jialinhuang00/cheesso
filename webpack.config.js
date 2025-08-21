const path = require('path');

module.exports = {
  entry: './src/complete.ts',
  output: {
    filename: 'cheesso-complete.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'Cheesso',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this',
    clean: false, // Don't clean the entire dist folder, just add our file
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    // Don't bundle Firebase, expect it to be available globally or via CDN
    'firebase/app': {
      commonjs: 'firebase/app',
      commonjs2: 'firebase/app',
      amd: 'firebase/app',
      root: 'firebase'
    },
    'firebase/auth': {
      commonjs: 'firebase/auth', 
      commonjs2: 'firebase/auth',
      amd: 'firebase/auth',
      root: 'firebase.auth'
    },
    'firebase': {
      commonjs: 'firebase',
      commonjs2: 'firebase', 
      amd: 'firebase',
      root: 'firebase'
    }
  },
  optimization: {
    minimize: true,
  },
  mode: 'production',
};