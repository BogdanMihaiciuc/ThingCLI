# Intro

A command line utility that makes it easier to work with the [Thingworx VSCode Project Template](https://github.com/BogdanMihaiciuc/ThingworxVSCodeProject). Its purpose is to make it easer to update the project template by moving most files not directly related to the thingworx project itself into external dependencies. This way, whenever any improvements or bug fixes are made, developers will only need to update the dependencies and not do any changes to their actual project.

It includes the tasks that were previously defined in that project's `gulpfile` and will contain any future utilities.

# Usage

This is primarily meant to be used with a project based on the [Thingworx VSCode Project Template](https://github.com/BogdanMihaiciuc/ThingworxVSCodeProject). It can also be used with an empty project to initialize a thingworx project in it.

To use it, run `npm install --save-dev bm-thing-cli` then run any of the available commands with `npx twc <command>`. Running the tool with no command will print out a message listing the available commands. Alternatively, you may install this globally via `npm install -g bm-thing-cli` which will allow you to use it outside of thingworx projects (for example to run the `init` command) and without the `npx` prefix.

The available commands are detailed below:

## `declarations`

Usage: 
```bash
npx twc declarations
```

Builds the thingworx declarations for the project, making it possible to reference thingworx entities via their collections, e.g. `Things.MyThing`.

## `watch`

Usage: 
```bash
npx twc watch
```

Builds the thingworx declarations for the project, making it possible to reference thingworx entities via their collections, e.g. `Things.MyThing`, whenever there are any changes in the `src` folder.

## `build`

Usage:
```bash
npx twc build [--merged|--separate] [--debug]
```

Builds a thingworx extension package from the typescript project which can be installed on a thingworx server.
Arguments:
 - `--merged`: Can be used with a multi-project repository. Causes the projects to be bundled in a single extension.
 - `--separate`: Can be used with a multi-project repository and is the default if `--merged` isn't specified. Causes the projects to each have their own separate extension.
 - `--debug`: Creates a debug build.

## `upload`
Usage:
```bash
npx twc upload [--merged|--separate] [--debug] [--remove] [--retain-version]
```

Builds a thingworx extension package from the typescript project, then imports it on the server defined in either the environment or package.json.
Arguments:
 - `--remove`: If specified, the current version of the extension(s) will be removed prior to installing the new version.
 - `--retain-version`: If specified, the version of the extension(s) in the `package.json` is not incremented. Useful if the version is driven out of external tools

## `deploy`
Usage:
```bash
npx twc deploy [--merged|--separate] [--debug] [--remove] [--retain-version]
```

Builds a thingworx extension package from the typescript project, then imports it on the server defined in either the environment or package.json. After the installation is complete, it runs the services marked with the `@deploy` decorator.

## `remove`
Usage:
```bash
npx twc remove [--merged|--separate]
```

Removes the current version of the extension(s) from the thingworx server defined in either the environment or package.json.

## `add-project`
Usage
```bash
npx twc add-project
```

Adds a new thingworx project to the repository. If the repository is currently a single project, it will convert it into a multi-project repository.

## `init`
Usage
```bash
twc init
```

Creates a new thingworx project in the current folder. This will automatically create files such as `package.json` and `tsconfig.json`, but without the sample files included in the `Thingworx VSCode Project` repository. Unless you already have a `package.json` file with `bm-thing-cli` defined as a dependency in the current folder, this command requires that this cli utility be installed globally.

## `upgrade`
Usage
```bash
npx twc upgrade
```

Upgrades a thingworx project from the old gulp-based build script to using this utility, by removing the gulpfile and uninstalling its associated dependencies, and then installing `bm-thing-cli`.

# Development

### Pre-Requisites

The following software is required:

* [NodeJS](https://nodejs.org/en/): needs to be installed and added to the `PATH`. You should use the LTS version.

The following software is recommended:

* [Visual Studio Code](https://code.visualstudio.com/): An integrated developer enviroment with great javascript and typescript support. You can also use any IDE of your liking, it just that most of the testing was done using VSCode.

### Development Environment
In order to develop this extension you need to do the following:
1. Clone this repository
2. Run `npm install`. This will install the development dependencies for the project.
3. Start working on the project.

### File Structure
```
ThingCLI
│   readme.md         // this file
│   package.json      // node package details
│   license           // license file
└───scripts           // build scripts
│   │   clean.js            // script that cleans the dist folder
└───src               // main folder where your developement will take place
│   │   file1.ts            // typescript file
|   |   ...
└───dist              // files used in the distribution
```

### Build

To build the project, run `npm run build` in the root of the project. This will generate the appropriate files in the `dist` folder.

### Contributors

 - [stefan-lacatus](https://github.com/stefan-lacatus): retainVersion argument, method helpers, generate-api command

#  License

[MIT License](LICENSE)
