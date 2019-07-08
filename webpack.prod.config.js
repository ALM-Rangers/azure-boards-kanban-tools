var path = require("path");
var webpack = require("webpack");
var CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    target: "web",
    entry: {
        kanban: "./src/Kanban.ts",
        kanbanDialog: "./src/KanbanDialog.tsx"
    },
    output: {
        filename: "src/[name].js",
        libraryTarget: "amd"
    },
    externals: [
        {
            "q": true,
            "react": true,
            "react-dom": true
        },
        /^VSS\/.*/, /^TFS\/.*/, /^q$/
    ],
    resolve: {
        moduleExtensions: ["-loader"],
        extensions: [
            ".webpack.js",
            ".web.js",
            ".ts",
            ".tsx",
            ".js"],
        alias: {
            "OfficeFabric": path.resolve(__dirname, "node_modules/office-ui-fabric-react/lib"),
            "VSSUI": path.resolve(__dirname, "node_modules/vss-ui")
        },
        modules: [path.resolve("."), "node_modules"]
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: "tslint-loader",
                enforce: "pre",
                options: {
                    emitErrors: true,
                    failOnHint: true
                }
            },
            {
                test: /\.tsx?$/,
                loader: "ts-loader",
            },
            {
                test: /\.s?css$/,
                loaders: ["style-loader", "css-loader", "sass-loader"]
            },
            {
                test: /\.(otf|eot|svg|ttf|woff|woff2|gif)(\?.+)?$/,
                use: "url-loader?limit=4096&name=[name].[ext]"
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin([
            { from: "./node_modules/vss-web-extension-sdk/lib/VSS.SDK.min.js", to: "src/3rdParty/VSS.SDK.min.js" },
            { from: "./node_modules/es6-promise/dist/es6-promise.min.js", to: "src/3rdParty/es6-promise.min.js" },
            { from: "./node_modules/office-ui-fabric-react/dist/css/fabric.min.css", to: "src/3rdParty/fabric.min.css" },

            { from: "./src/*.html", to: "./" },
            { from: "./marketplace", to: "marketplace" },
            { from: "./img", to: "img" },
            { from: "./vss-extension.json", to: "vss-extension.json" }
        ])
    ]
}