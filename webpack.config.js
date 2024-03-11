/*
const webpackConfig = {
    mode: 'production',
    entry: '/src/index.js',
    output: {
        filename: 'library-architecture.js',
        path: 'dist',
        library: 'LibraryArchitecture',
        libraryTarget: 'umd',
        globalObject: 'this',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: '../node_modules',
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
*/

module.exports = {
    entry: '/src/index.js',
    output: {
        filename: 'fits.js',
        library: {
            name: 'fits-reader',
            type: 'umd',
        },
        libraryTarget: 'umd',
    },
};