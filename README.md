# Import Export Kanban Boards

## What
This extension will allow you to share your Kanban board with another team in your project. You will also be able to grab the settings from another team's board.

## Development

### Build
To build this extension, in the **Import-Export-Kanban** folder, run the command

> npm install

### Dev Deployment
Running the following command will generate a development package to use

> npm run package:dev

This will produce a *.vsix* package available for use. Go to the [Marketplace management portal](https://marketplace.visualstudio.com/manage) and upload the new extension there. Once uploaded, you can share the extension with your instance.

This is built to run against localhost. To start a development server to test against, run the command

> npm run dev

#### VS Code / Chrome Debugging
You can use Chrome to debug the local instance through the use of the [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome) extension. After starting the development server, in VS Code, hit *F5* to open Chrome in a debug instance. The first time you launch the debugger, you will have to accept the untrusted https connection. Once the connection is trusted, you will be able to navgiate to your team project:

> https://{instance}.visualstudio.com/{project}/_backlogs/board

And see the extension available for use.

### Release Deployment
To generate the release files, run the following command

> npm run package:release

This compiles the typescript files, and packages all outputs in the **dist/** folder and creates a vsix to use.