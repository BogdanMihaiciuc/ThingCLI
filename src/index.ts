#!/usr/bin/env node

import { Commands } from './Commands/Commands';
import { incrementVersion } from './Scripts/incrementVersion';
import { declarations } from './Scripts/declarations';
import { build } from './Scripts/build';
import { zip } from './Scripts/zip';
import { upload } from './Scripts/upload';
import { deploy } from './Scripts/deploy';
import { remove } from './Scripts/remove';
import { addProject } from './Scripts/add-project';
import { install } from './Scripts/install';
import { init } from './Scripts/init';
import { upgrade } from './Scripts/upgrade';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();
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
                if (filename.match(/(.*)[\/\\]static[\/\\]gen[\/\\]Generated\.d\.ts$/)) return;

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
        // The following 2 commands run a very similar sequence of steps
        case Commands.upload:
        case Commands.deploy:
            // If the argument is present, don't increment the version 
            if (!args.includes('--retainVersion')) {
                await incrementVersion();
            }
            await declarations();
            const endpoints = await build();
            await zip();

            // If the remove argument is specified, first remove the existing version
            if (args.includes('--remove')) {
                await remove();
            }
            await upload();
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
            await install();
            break;
        case Commands.init:
            await init();
            break;
        case Commands.upgrade:
            await upgrade();
            break;
        default:
            console.error(`Unknown command "${command}" specified.`);
    }
}


if (command) {
    console.log(`\x1b[1mRunning ${command}\x1b[0m`);
    main();
}
else {
    console.log(`Usage:
bm-thing-cli <command> [--argument] ...

Available commands:
 * \x1b[1mdeclarations\x1b[0m                                                            Builds the collection declarations
 * \x1b[1mwatch\x1b[0m                                                                   Watches the source folder and runs declarations on any change
 * \x1b[1mbuild\x1b[0m [--merged] [--separate] [--debug]                                 Builds the thingworx extension
 * \x1b[1mupload\x1b[0m [--merged] [--separate] [--debug] [--remove] [--retainVersion]   Builds and uploads the thingworx extension
 * \x1b[1mdeploy\x1b[0m [--merged] [--separate] [--debug] [--remove] [--retainVersion]   Uploads the extension then runs deployment scripts
 * \x1b[1mremove\x1b[0m [--merged] [--separate]                                          Removes the thingworx extension
 * \x1b[1madd-project\x1b[0m                                                             Adds a new project to the repository
 * \x1b[1minit\x1b[0m                                                                    Initializes a thingworx project in an empty folder
 * \x1b[1mupgrade\x1b[0m                                                                 Upgrades from a gulp project to a twc project`);
}
