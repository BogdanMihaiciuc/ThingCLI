import * as fs from 'fs';

/**
 * Increments the minor version declared in package.json by 1.
 */
export function incrementVersion(): void {
    const cwd = process.cwd();

    // Load the tsconfig file which contains the version information.
    const packageJSON = require(`${process.cwd()}/package.json`);

    const version = packageJSON.version.split('-');
    const versionComponents = version[0].split('.');

    const minorVersion = (parseInt(versionComponents[2]) || 0) + 1;
    versionComponents[2] = minorVersion.toString();

    version[0] = versionComponents.join('.');
    
    packageJSON.version = version.join('-');

    fs.writeFileSync(`${cwd}/package.json`, JSON.stringify(packageJSON, undefined, '\t'));

    console.log(`\x1b[1;32m✔\x1b[0m Incremented version to ${packageJSON.version}`);
}