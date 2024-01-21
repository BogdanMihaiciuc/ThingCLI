import Enquirer from "enquirer";
import * as FS from 'fs';
import { TWConfig } from 'bm-thing-transformer';
import { TWProjectUtilities } from "../Utilities/TWProjectUtilities";

/**
 * Adds a project to the repository. If the repository is in single-project mode,
 * this will first convert it to a multi-project repository.
 * @returns     A promise that resolves when the operation completes.
 */
export async function addProject(): Promise<void> {
    const cwd = process.cwd();

    // Load the twconfig file which contains the project configuration.
    const TWConfig = require(`${cwd}/twconfig.json`) as TWConfig;

    // If the repository is configured for a single project only warn the
    // user that their settings are about to change
    if (TWConfig.projectName != '@auto') {
        const response = await Enquirer.prompt<{continue: boolean}>({
            type: 'confirm',
            name: 'continue',
            message: 'This will convert your repository into a multi-project repository. Continue?',
            initial: false
        });

        // If the user chooses No, stop
        if (!response.continue) return;

        // If a project name wasn't previously specified, it must be now
        let projectName = TWConfig.projectName;
        if (!TWConfig.projectName) {
            const response = await Enquirer.prompt<{projectName: string}>({
                type: 'input',
                message: 'Enter the name of the existing project:',
                name: 'projectName'
            });

            projectName = response.projectName;
        }

        if (!projectName) throw new Error(`A project name must be provided.`);

        process.stdout.write(`\x1b[2m❯\x1b[0m Converting to multi-project`);

        // Copy the contents of the src folder into a subfolder with the current project name
        // First copy to a temporary folder, then clear out the contents of src
        FS.cpSync(`${cwd}/src`, `${cwd}/tmp`, {recursive: true});
        FS.rmSync(`${cwd}/src`, {recursive: true, force: true});

        // Then copy into the appropriate subfolder in src and clear the temporary folder
        TWProjectUtilities.ensurePath(`${cwd}/src/${projectName}/src`, cwd);
        FS.cpSync(`${cwd}/tmp`, `${cwd}/src/${projectName}/src`, {recursive: true});
        FS.rmSync(`${cwd}/tmp`, {recursive: true, force: true});

        // Create and save a default tsconfig.json file
        const TSConfig = JSON.stringify(TSConfigDefault(), undefined, 4);
        FS.writeFileSync(`${cwd}/src/${projectName}/tsconfig.json`, TSConfig);

        // Set the twconfig project name to '@auto' then save it
        TWConfig.projectName = '@auto';
        FS.writeFileSync(`${cwd}/twconfig.json`, JSON.stringify(TWConfig, undefined, 4));

        process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Converted to multi-project   \n`);
    }

    // Ask for the name of the new project
    const response = await Enquirer.prompt<{projectName: string}>({
        type: 'input',
        message: 'Project name:',
        name: 'projectName'
    });

    const name = response.projectName;

    if (!name) throw new Error(`A project name must be provided.`);

    process.stdout.write(`\x1b[2m❯\x1b[0m Creating project "${name}"`);

    // Create a folder in the src directory for this project
    FS.mkdirSync(`${cwd}/src/${name}`);

    // Add the default tsconfig file
    const TSConfig = JSON.stringify(TSConfigDefault(), undefined, 4);
    FS.writeFileSync(`${cwd}/src/${name}/tsconfig.json`, TSConfig);

    // Create a src directory for the project
    FS.mkdirSync(`${cwd}/src/${name}/src`);

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Created project "${name}"  \n`);
}

/**
 * Returns a default tsconfig.json file to be used for new project.
 * @returns         An object that can be written to a tsconfig.json file.
 */
function TSConfigDefault() {
    return {
        compilerOptions: {
            outDir: "./dist/",
            sourceMap: true,
            noImplicitAny: false,
            module: "ESNext",
            target: "es5",
            downlevelIteration: true,
            experimentalDecorators: true,
            noImplicitOverride: true,
            strict: true,
            declaration: true,
            lib: [
                "esnext"
            ],
            typeRoots: [
                "./typings/",
                "../../node_modules/@types/"
            ]
        },
        include: [
            "../static/gen/Generated.d.ts",
            "./static/**/*.d.ts",
            "./src/**/*.d.ts",
            "./src/**/*.ts",
            "../../tw_imports/**/*.d.ts",
            "../../node_modules/bm-thing-transformer/static/**/*.d.ts",
            "../../node_modules/bm-thing-cli/node_modules/bm-thing-transformer/static/**/*.d.ts",
        ]
    };
}