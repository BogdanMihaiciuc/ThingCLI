#!/usr/bin/env node

import { Commands } from './Commands/Commands';
import { incrementVersion } from './Scripts/increment-version';
import { declarations } from './Scripts/declarations';
import { build } from './Scripts/build';
import { zip } from './Scripts/zip';
import { upload } from './Scripts/upload';
import { deploy } from './Scripts/deploy';
import { remove } from './Scripts/remove';
import { addProject } from './Scripts/add-project';
import { install } from './Scripts/install';
import { installWidgets } from './Scripts/install-widgets';
import { init } from './Scripts/init';
import { upgrade } from './Scripts/upgrade';
import { generateAPI } from './Scripts/generate-api';
import { pull } from './Scripts/pull';
import { help } from './Scripts/help';
import * as fs from 'fs';
import 'dotenv/config';

const [, , command, ...args] = process.argv;

Error.stackTraceLimit = 0;

async function main() {
    switch (command as Commands) {
        case Commands.declarations:
            await declarations();
            break;
        case Commands.watch:
            let declarationsRunning = false;
            fs.watch(`${process.cwd()}/src`, {recursive: true}, async (event: fs.WatchEventType, filename: string) => {
                if (declarationsRunning) return;

                // Don't process this if it's a change to the static directory, which is generated
                // by the declarations command
                if (filename.match(/(.*)[\/\\]?static[\/\\]gen[\/\\]Generated\.d\.ts$/)) return;

                // In certain cases the callback is invoked twice, so wait for a short while before running to avoid this
                declarationsRunning = true;
                await new Promise<void>((resolve) => {
                    setTimeout(async () => {
                        await declarations();
                        declarationsRunning = false;
                        resolve();
                    }, 500);
                });
            });
            break;
        case Commands.build:
            await declarations();
            await build();
            await zip();
            break;
        // The following 3 commands run a very similar sequence of steps
        case Commands.upload:
        case Commands.deploy:
        case Commands.push:
            const isPushCommand = command == Commands.push;

            // If the argument is present, don't increment the version 
            if (!args.includes('--retainVersion') && !args.includes('--retain-version')) {
                await incrementVersion();
            }
            await declarations();
            const endpoints = await build(isPushCommand);
            await zip();

            // If the remove argument is specified, first remove the existing version
            if (args.includes('--remove')) {
                await remove();
            }
            await upload(isPushCommand);
            if (command == Commands.deploy) {
                await deploy(endpoints);
            }
            break;
        case Commands.remove:
            await remove();
            break;
        case Commands.addProject:
            await addProject();
            break;
        case Commands.install:
            let UMLMode = false;
            if (args.includes('--uml')) {
                UMLMode = true;
            }
            await install(UMLMode);
            break;
        case Commands.installWidgets:
            await installWidgets();
            break;
        case Commands.init:
            await init();
            break;
        case Commands.upgrade:
            await upgrade();
            break;
        case Commands.generateAPI:
            await generateAPI();
            break;
        case Commands.pull:
            await pull();
            break;
        case Commands.help:
            // If used without an argument, just display the generic information
            if (args.length) {
                await help();
            }
            break;
        default:
            console.error(`Unknown command "${command}" specified.`);
    }
}


if (command) {
    const pkg = require('../package.json');
    console.log(`\x1b[1mRunning ${command} (v${pkg.version})\x1b[0m`);
    main();
}
else {
    const pkg = require('../package.json');
    console.log(`ThingCLI version ${pkg.version} usage:
twc <command> [--argument] ...

To get help on a specific command run:
twc help <command>

Available commands:
 * \x1b[1mdeclarations\x1b[0m
   Builds the collection declarations

 * \x1b[1mwatch\x1b[0m
   Watches the source folder and runs declarations on any change

 * \x1b[1mbuild\x1b[0m [--merged] [--separate] [--debug] [--trace] [--projects]
   Builds the thingworx extension

 * \x1b[1mupload\x1b[0m [--merged] [--separate] [--debug] [--trace] [--extensions] [--remove] [--retain-version] [--projects]
   Builds and uploads the thingworx extension

 * \x1b[1mdeploy\x1b[0m [--merged] [--separate] [--debug] [--trace] [--extensions] [--remove] [--retain-version] [--projects]
   Uploads the extension then runs deployment scripts

 * \x1b[1mpush\x1b[0m [--merged] [--separate] [--debug] [--trace] [--extensions] [--remove] [--retain-version] [--projects]
   Builds and uploads the thingworx extension for typescript projects and uploads xml projects as editable entities

 * \x1b[1mremove\x1b[0m [--merged] [--separate]
   Removes the thingworx extension

 * \x1b[1minstall\x1b[0m
   Pulls entity definitions for dependent projects from the thingworx server.

 * \x1b[1minstall-widgets\x1b[0m <file>
   Pulls widget types from the specified file to be used in mashups.

 * \x1b[1madd-project\x1b[0m [--ui]
   Adds a new project to the repository

 * \x1b[1mpull\x1b[0m --xml [--projects]
   Pulls xml projects from the thingworx server 

 * \x1b[1mgenerate-api\x1b[0m
   EXPERIMENTAL: Builds declarations out of exported entities that can be used in other projects

 * \x1b[1minit\x1b[0m
   Initializes a thingworx project in an empty folder
   
 * \x1b[1mupgrade\x1b[0m
   Upgrades from a gulp project to a twc project
   
 * \x1b[1mhelp\x1b[0m <command>
   Prints out information about the specified command`);
}

