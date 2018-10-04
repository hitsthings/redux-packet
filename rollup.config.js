var rollup = require("rollup");
var babel = require("rollup-plugin-babel");
var { sizeSnapshot } = require("rollup-plugin-size-snapshot");
import cleanup from 'rollup-plugin-cleanup';

const makeConfig = ({ file, minify } = {}) => ({
    input: "index.js",
    output: [{
        file,
        format: "umd",
        name: "ReactPacket",
        globals: {
            redux: 'Redux',
            'react-redux': 'ReactRedux'
        },
        sourcemap: true
    }],
    external: [
        'redux',
        'react-redux'
    ],
    plugins: [
        babel({
            presets: minify ? ["minify"] : []
        }),
        sizeSnapshot()
    ].concat(minify ? cleanup() : [])
});

const prod = makeConfig({ file: 'dist/redux-packet.js', minify: true });
const dev = makeConfig({ file: 'dist/redux-packet.dev.js', minify: false });

export default [
    prod,
    dev
];