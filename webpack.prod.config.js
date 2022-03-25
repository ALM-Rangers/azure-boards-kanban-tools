var path = require("path");
var webpack = require("webpack");
var CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    target: "web",
    mode: 'production',
    entry: {
        kanban: "./src/Kanban.ts",
        kanbanDialog: "./src/KanbanPanel.tsx"
      },
      output: {
        filename: "src/[name].js",
        path:  path.resolve(__dirname, 'dist'),
      },
    resolve: {
       extensions: [".ts", ".tsx", ".js"],
    alias: {
      "azure-devops-extension-sdk": path.resolve("node_modules/azure-devops-extension-sdk"),
      "VSSUI": path.resolve(__dirname, "node_modules/azure-devops-ui")
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
                { from: "./marketplace", to: "./marketplace", context: "./" },
                { from: "./azure-devops-extension.json", to: "azure-devops-extension.json" }
            ]
        })
    ]
}