"use strict";

var exec = require("child_process").exec;

// Package extension
var command = `tfx extension create --overrides-file ../configs/test.json --manifest-globs azure-devops-extension.json --no-prompt`;
exec(command, {
    "cwd": "./dist"
}, (error, stdout) => {
    if (error) {
        console.error(`Could not create package: '${error}'`);
        return;
    }

    console.log(`Package created`);
});