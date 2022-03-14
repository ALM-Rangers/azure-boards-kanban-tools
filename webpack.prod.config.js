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
                use: "ts-loader"
            },
            {
                test: /\.scss$/,
                use: [
                    "style-loader",
                    "css-loader",
                    "azure-devops-ui/buildScripts/css-variables-loader",
                    "sass-loader"
                ]
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.woff$/,
                use: [
                    {
                        loader: "base64-inline-loader"
                    }
                ]
            },
            {
                test: /\.(png|svg|jpg|gif|html)$/,
                use: "file-loader"
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: "**/*.html", to: "./src", context: "src" },
                { from: "**/*.png", to: "./img", context: "img" },
                { from: "./marketplace", to: "./marketplace", context: "marketplace" },
                { from: "./vss-extension.json", to: "vss-extension.json" }
            ]
        })
    ]
}