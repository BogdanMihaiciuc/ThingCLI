import { TWConfig } from 'bm-thing-transformer';
import { TSProject, TSUtilities } from '../Utilities/TSUtilities';
import { TWClient } from '../Utilities/TWClient';

const [, , , ...args] = process.argv;

/**
 * Builds the thingworx entity xml files from the typescript project.
 * @returns             A promise that resolves with an array of deployment
 *                      endpoints when the operation completes.
 */
export async function remove(): Promise<void> {
    // Load the twconfig file which contains compilation options.
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;
    const packageJSON = require(`${process.cwd()}/package.json`);

    // In multi project mode, for separate builds, append the project name to the package name
    const packageName = packageJSON.name;

    // In multi project mode, a build mode should be specified, defaulting to separate if one is not provided
    const isMerged = args.includes('--merged');
    const isSeparate = args.includes('--separate') || !isMerged;

    if (twConfig.projectName == '@auto' && isSeparate) {
        // Remove the projects in the order of their dependencies
        for (const project of TSUtilities.dependencySortedProjects()) {
            let projectPackageName = `${packageName}-${project.name}`;
            await uninstallPackage(projectPackageName);
        }
    }
    else {
        // If running in single project or merged mode, the single extension needs to be removed
        await uninstallPackage(packageName);
    }
}


/**
 * Uninstalls the given extension packge.
 * @param packageName       The extension package to uninstall.
 * @returns                 A promise that resolves when the operation finishes.
 */
async function uninstallPackage(packageName) {
    process.stdout.write(`\x1b[2m❯\x1b[0m Uninstalling ${packageName}`);
    try {
        const response = await TWClient.removeExtension(packageName);
        if (response.statusCode != 200) {
            process.stdout.write(`\r\x1b[1;31m✖\x1b[0m Unable to uninstall ${packageName}:    \n`);
            console.log(response.body);
        }
        else {
            process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Uninstalled ${packageName}   \n`);
        }
    }
    catch (err) {
        // This is non-fatal, likely this command was run when the project wasn't installed
        process.stdout.write(`\r\x1b[1;31m✖\x1b[0m Unable to uninstall ${packageName}:    \n`);
        console.log(err);
    }
}