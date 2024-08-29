# Overview

This extension will allow you to share your Kanban board with another team in your project. You will also be able to grab the settings from another team's board.

# Documentation

For instructions on using the Azure Boards Kanban Tools extension, please refer to the official documentation. You can access the the documentation from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=alm-devops-rangers.KanbanBoardTools).

# Support

## How to file issues and get help

This project uses [GitHub Issues](https://github.com/ALM-Rangers/azure-boards-kanban-tools/issues) to track bugs and feature requests. Please search the existing issues before filing new issues to avoid duplicates. For new issues, file your bug or feature request as a new Issue.

# Contributing

We welcome contributions to improve the extension. If you would like to contribute, please fork the repository and create a pull request with your changes. Your
contributions help enhance the functionality and usability of the extension for the entire community.

**Note:** do not publish the extension as a public extension under a different publisher as this will create a clone of the extension and it will be unclear to the
community which one to use. If you feel you don't want to contribute to this repository then publish a private version for your use-case.

Check out https://learn.microsoft.com/en-us/azure/devops/extend/get-started to learn how to develop Azure DevOps extensions.

## Development

To build this extension, in the **azure-boards-kanban-tools** folder, run the command

```
npm install
```

Running the following command will generate a development package to use

```
npm run package:dev
```

This will produce a `.vsix` package available for use. Go to the [Marketplace management portal](https://marketplace.visualstudio.com/manage) and upload the new extension there. Once uploaded, you can share the extension with your instance.

This is built to run against localhost on port 9090. To start a development server to test against, run the command

```
npm run dev
```

You can run the Webpack dev server from Visual Studio as well if you install the [NPM Task Runner](https://marketplace.visualstudio.com/items?itemName=MadsKristensen.NPMTaskRunner) extension.

## VS Code / Chrome Debugging

You can use Chrome to debug the local instance through the use of the [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome) extension. After starting the development server, in VS Code, hit *F5* to open Chrome in a debug instance. The first time you launch the debugger, you will have to accept the untrusted https connection. Once the connection is trusted, you will be able to navigate to your team project:

```
https://{instance}.visualstudio.com/{project}/_backlogs/board
```

And see the extension available for use. Setting breakpoints in VS Code should allow them to be hit from Chrome.

This should work with other browsers as well but has currently only been tested with Chrome.

## Release Deployment
To prep a release, you can run one of the following commands:

```
npm run build:release
```

Or

```
npm run package:release
```

The first command compiles the typescript files, and preps all outputs in the `**dist/**` folder. The second command runs the build but also creates a vsix that can be uploaded to the marketplace.
