const path = require('path');

module.exports = {
    mode: 'production',
    entry: '/src/index.js',
    output: {
        filename: 'fits-reader.js',
        globalObject: 'this',
        library: {
            name: 'FITSReader',
            type: 'umd',
        },
        path: path.resolve(__dirname, 'dist', 'fits-reader'),
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
};