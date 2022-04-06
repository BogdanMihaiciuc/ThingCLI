import Enquirer from 'enquirer';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { twConfigDefault, twConfigMethodHelperDefaults } from './init';

/**
 * An array containing the files that need to be removed in order to upgrade.
 */
const FilesToDelete = ['gulpfile.js', 'static/base'];

/**
 * An array containing the dependencies that should be removed in order to upgrade.
 */
const DependenciesToRemove = [
    'babel-plugin-remove-import-export', 
    'bm-thing-transformer', 
    'cli-progress', 
    'del', 
    'delete-empty', 
    'dotenv', 
    'gulp', 
    'gulp-babel', 
    'gulp-concat', 
    'gulp-terser', 
    'gulp-typescript', 
    'gulp-zip', 
    'request', 
    'typescript', 
    'xml2js'
];

/**
 * Upgrades the current repository from a gulpfile based build system to a
 * bm-thing-cli based build system.
 * @returns     A promise that resolves when the operation completes.
 */
export async function upgrade() {
    const cwd = process.cwd();

    // Ensure that a thingworx project exists at the current path, otherwise exist
    if (!projectExists(cwd)) {
        throw new Error(`🛑 \x1b[1;31mUnable to run the upgrade command because the current folder doesn't contain a thingworx project.\x1b[0m`);
    }

    // Older projects did not use a twconfig file, create one for them if they don't have it
    const hasTwConfig = fs.existsSync(`${cwd}/twconfig.json`);

    let projectName: {projectName: string} | undefined;
    if (!hasTwConfig) {
        projectName = await Enquirer.prompt<{projectName: string}>({
            type: 'input',
            name: 'projectName',
            message: 'Enter the name to use for your thingworx project:'
        });
    }

    // Handle any updates to the twconfig, like extra functionalities
    if(hasTwConfig) {
        const currentTwConfig = JSON.parse(fs.readFileSync(`${cwd}/twconfig.json`, 'utf-8'));
        // Add the method helpers options
        if(!currentTwConfig.methodHelpers) {
            currentTwConfig.methodHelpers = twConfigMethodHelperDefaults();
        }
        fs.writeFileSync(`${cwd}/twconfig.json`, JSON.stringify(currentTwConfig, undefined, 4));
    }

    // Explain what this does and ask the user if they want to continue
    const continueIfExists = await Enquirer.prompt<{continue: boolean}>({
        type: 'confirm',
        name: 'continue',
        message: 'This command will upgrade your project from a gulpfile based build system\n' + 
                    '  to a bm-thing-cli based build system.\n\nThe following files will be deleted:\n' +
                    `   - ${FilesToDelete.join(', ')}\n\n` +
                    'The following dev dependencies will be removed from the project:\n' + formattedDependenciesToRemove() +
                    'Continue?'
    });

    if (!continueIfExists.continue) {
        console.log(`\x1b[1;31m✖\x1b[0m Upgrade cancelled`);
        return;
    }

    // Add the new thingworx types directories to tsconfig
    const tsConfig = require(`${cwd}/tsconfig.json`);

    // Add the tw_imports directory if it didn't exist
    if (!tsConfig.include.includes('./tw_imports/**/*.d.ts')) {
        tsConfig.include.push('./tw_imports/**/*.d.ts');
    }

    // Add the new dependencies from thing transformer
    tsConfig.include.push(
        "./node_modules/bm-thing-transformer/static/**/*.d.ts",
        "./node_modules/bm-thing-cli/node_modules/bm-thing-transformer/static/**/*.d.ts"
    );
    fs.writeFileSync(`${cwd}/tsconfig.json`, JSON.stringify(tsConfig, undefined, 4));

    // Remove the gulpfile, since building is now handled by bm-thing-cli
    fs.rmSync(`${cwd}/gulpfile.js`);

    // Remove the static base directory, since dependencies are now included in bm-thing-transformer
    fs.rmSync(`${cwd}/static/base`, {force: true, recursive: true});

    // If a twconfig file was not used, create it
    if (projectName) {
        fs.writeFileSync(`${cwd}/twconfig.json`, JSON.stringify(twConfigDefault(projectName.projectName), undefined, 4));
    }

    // Update the build commands in package json, unless they have been modified
    const packageJSON = require(`${cwd}/package.json`);
    packageJSON.scripts = packageJSON.scripts || {};
    const scripts = packageJSON.scripts;

    if (scripts.build == 'gulp build') {
        scripts.build = 'twc build';
    }

    if (scripts.upload == 'gulp upload') {
        scripts.upload = 'twc upload';
    }

    // The debug scripts did not exist in previous versions, so they should be added if missing
    if (scripts.buildDebug == 'gulp build --debug' || !scripts.buildDebug) {
        scripts.buildDebug = 'twc build --debug';
    }

    if (scripts.uploadDebug == 'gulp upload --debug' || !scripts.uploadDebug) {
        scripts.uploadDebug = 'twc upload --debug';
    }

    // Previous versions did not have the watch script in package json so it can be added directly
    scripts['watch:declarations'] = 'twc watch';

    // Write the updated package json
    fs.writeFileSync(`${cwd}/package.json`, JSON.stringify(packageJSON, undefined, 4));

    // Uninstall all the dependencies that were used by the build script
    await new Promise((resolve, reject) => {
        spawn('npm', ['uninstall'].concat(DependenciesToRemove).concat('--save-dev'), {cwd, stdio: 'inherit', shell: true}).on('close', resolve);
    });

    // Install bm-thing-cli
    await new Promise((resolve, reject) => {
        spawn('npm', ['install', '--save-dev', 'bm-thing-cli'], {cwd, stdio: 'inherit', shell: true}).on('close', resolve);
    });
}

/**
 * Returns a string that represents the list of dependencies 
 * to remove for an upgrade, formatted in a 3 column table.
 * @returns     A string.
 */
function formattedDependenciesToRemove(): string {
    let result = '';

    const lines = DependenciesToRemove.length / 3;
    for (let i = 0; i < lines; i++) {
        result += '   - ' + DependenciesToRemove.slice(i * 3, Math.min(i * 3 + 3, DependenciesToRemove.length)).join(', ') + '\n';
    }

    return result;
}


/**
 * Verifies if a gulpfile-based thingworx project exists at the given path.
 * @param path      The path to verify.
 */
 function projectExists(path: string): boolean {
    // In order for a project to exist, it needs to have the following files:
    // - package.json:      standard npm package file
    // - tsconfig.json:     typescript project options
    // - gulpfile:          the buildscript
    // - metadata.xml:      thingworx metadata template
    // - src:               the sources folder

    if (fs.existsSync(`${path}/package.json`)) {
        // For this to be a gulp based thingworx project, it needs to have gulp as a dev dependency.
        const packageJSON = require(`${path}/package.json`);
        const devDependencies = packageJSON.devDependencies;

        if (!devDependencies) return false;
        
        const dependencies = Object.keys(devDependencies);
        if (!dependencies.includes('gulp')) {
            return false;
        }
    }
    else {
        return false;
    }

    // Most of the options in tsconfig are optional for this project, the default ones are just recommendations
    // so its only required that such a file exists
    if (!fs.existsSync(`${path}/tsconfig.json`)) {
        return false;
    }

    // A template metadata file must exist
    if (!fs.existsSync(`${path}/metadata.xml`)) {
        return false;
    }

    // A gulpfile build script must exist
    if (!fs.existsSync(`${path}/gulpfile.js`)) {
        return false;
    }

    return true;
}