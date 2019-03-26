# Import Export Kanban Boards

## About
This extension will allow you to share your Kanban board with another team in your project. You will also be able to grab the settings from another team's board.

## Development
Inside the .npmrc the NPM registry is set to the "Release" view of the ALM Rangers NPM registry. Before you can run `npm install` you will need to authenticate to that registry. To do so, execute the following:

```
npm install -g vsts-npm-auth --registry https://registry.npmjs.com
vsts-npm-auth -config .npmrc
```
Enter your credentials for the ALM Rangers VSTS account, and you're good to go. This is a one-time action.

### Build
To build this extension, in the **Import-Export-Kanban** folder, run the command

```
npm install
```

### Dev Deployment
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

#### VS Code / Chrome Debugging
You can use Chrome to debug the local instance through the use of the [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome) extension. After starting the development server, in VS Code, hit *F5* to open Chrome in a debug instance. The first time you launch the debugger, you will have to accept the untrusted https connection. Once the connection is trusted, you will be able to navigate to your team project:

```
https://{instance}.visualstudio.com/{project}/_backlogs/board
```

And see the extension available for use. Setting breakpoints in VS Code should allow them to be hit from Chrome.

This should work with other browsers as well but has currently only been tested with Chrome.

### Release Deployment
To prep a release, you can run one of the following commands:

```
npm run build:release
```

Or

```
npm run package:release
```

The first command compiles the typescript files, and preps all outputs in the `**dist/**` folder. The second command runs the build but also creates a vsix that can be uploaded to the marketplace.
