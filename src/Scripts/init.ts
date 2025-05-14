import Enquirer from "enquirer";
import * as FS from 'fs';
import { TWConfig, MethodHelpers } from 'bm-thing-transformer';
import { URL } from "url";
import { spawn } from 'child_process';

/**
 * An interface that describes the parameters that users must provide in order to
 * create a new project.
 */
interface InitParameters {

    /**
     * The name of the npm project and thingworx extension package.
     */
    packageName: string;

    /**
     * The author of the npm project and thingworx extension package.
     */
    author: string;

    /**
     * An optional but recommended description of the extension package.
     */
    description?: string;

    /**
     * The name of the thingworx project.
     */
    projectName: string;

    /**
     * The URL of the thingworx server.
     */
    thingworxServer: string;
}

/**
 * An interface that describes the authentication parameters.
 */
type AuthenticationParameters = AppKeyAuthenticationParameters | UsernameAuthenticationParameters;

/**
 * An interface that describes the parameters that users must provide in order to
 * connect to thingworx using an app key.
 */
interface AppKeyAuthenticationParameters {

    /**
     * The authentication type.
     */
    authenticationKind: 'appKey';

    /**
     * The app key of the thingworx server.
     */
    thingworxAppKey?: string;
}

/**
 * An interface that describes the parameters that users must provide in order to
 * connect to thingworx using a username and password combo.
 */
interface UsernameAuthenticationParameters {

    /**
     * The authentication type.
     */
    authenticationKind: 'username';

    /**
     * The thingworx username.
     */
    thingworxUser?: string;

    /**
     * The thingworx password.
     */
    thingworxPassword?: string;
}

/**
 * The complete information needed to initialize a project.
 */
type CreationParameters = InitParameters & AuthenticationParameters;

/**
 * Initializes a thingworx vs code project in the current directory.
 * @returns         A promise that resolves when this operation completes.
 */
export async function init() {
    const cwd = process.cwd();

    process.stdout.write(`\x1b[2m❯\x1b[0m Creating a new project\n`);

    // The amount of lines to go up to edit the initial task line.
    let lines = 1;

    // Check if a project already exists to avoid overriding user data
    if (projectExists(cwd)) {
        const continueIfExists = await Enquirer.prompt<{continue: boolean}>({
            type: 'confirm',
            name: 'continue',
            message: 'The current folder already appears to contain a thingworx project.\n  Continuing will replace some of the existing files.\n  Continue?'
        });

        lines += 3;

        if (!continueIfExists.continue) {
            process.stdout.write(`\u001b[${lines.toFixed()}A\x1b[1;31m✖\x1b[0m Project creation cancelled  ${Array(lines + 1).join('\n')}`);
            return;
        }
    }

    // Request the information needed to create the project
    const baseDetails = await Enquirer.prompt<InitParameters>([
        {
            type: 'input',
            name: 'packageName',
            message: 'Extension package name:',
        },
        {
            type: 'input',
            name: 'description',
            message: 'Extension description (optional):',
        },
        {
            type: 'input',
            name: 'author',
            message: 'Author:',
        },
        {
            type: 'input',
            name: 'projectName',
            message: 'Thingworx project name:',
        },
        {
            type: 'input',
            name: 'thingworxServer',
            message: 'Thingworx server URL:',
            initial: 'http://localhost:8015'
        },
    ]);

    // Ask whether connection uses an app key or username & password combo
    const connectionPreference = await Enquirer.prompt<{type: 'appKey' | 'password'}>({
        type: 'select',
        name: 'type',
        message: 'Authentication mode:',
        choices: [
            {name: 'App Key \x1b[2m(Required for debugging)\x1b[0m', value: 'appKey'}, 
            {name: 'Username & Password', value: 'password'}
        ],
        result(this:any) {
            return this.focused.value;
        }
    });

    lines += 5;

    const authenticationType = connectionPreference.type;

    // Request the authentication details based on the user's previous choice
    let authenticationDetails: AuthenticationParameters;
    switch (authenticationType) {
        case 'appKey':
            authenticationDetails = await Enquirer.prompt<AppKeyAuthenticationParameters>([
                {
                    type: 'input',
                    name: 'thingworxAppKey',
                    message: 'App Key:'
                }
            ]);
            authenticationDetails.authenticationKind = 'appKey';
            lines += 1;
            break;
        case 'password':
            authenticationDetails = await Enquirer.prompt<UsernameAuthenticationParameters>([
                {
                    type: 'input',
                    name: 'thingworxUser',
                    message: 'Username:',
                    initial: 'Administrator'
                },
                {
                    type: 'password',
                    name: 'thingworxPassword',
                    message: 'Password:',
                    initial: 'Administrator12345'
                }
            ]);
            authenticationDetails.authenticationKind = 'username';
            lines += 2;
            break;
    }

    const creationParameters: CreationParameters = Object.assign({}, baseDetails, authenticationDetails);

    // Create the necessary files
    FS.writeFileSync(`${cwd}/package.json`, JSON.stringify(packageDefault(creationParameters), undefined, 4));
    FS.writeFileSync(`${cwd}/tsconfig.json`, JSON.stringify(TSConfigDefault(), undefined, 4));
    FS.writeFileSync(`${cwd}/twconfig.json`, JSON.stringify(TWConfigDefault(creationParameters.projectName), undefined, 4));
    FS.writeFileSync(`${cwd}/metadata.xml`, metadataXMLDefault());
    FS.writeFileSync(`${cwd}/.gitignore`, gitignoreDefault());

    FS.mkdirSync(`${cwd}/src`);

    // Create an env file with the authentication details
    if (creationParameters.thingworxServer) {
        FS.writeFileSync(`${cwd}/.env`, envDefault(creationParameters));

        // If an app key authentication was selected, create an attach launch configuration
        if ('thingworxAppKey' in creationParameters) {
            FS.mkdirSync(`${cwd}/.vscode`);
            FS.writeFileSync(`${cwd}/.vscode/launch.json`, JSON.stringify(launchConfigurationDefault(creationParameters), undefined, 4));
        }
    }

    // Mark creation as complete
    process.stdout.write(`\u001b[${lines.toFixed()}A\x1b[1;32m✔\x1b[0m Initialized project "${creationParameters.packageName}" ${Array(lines + 1).join('\n')}`);

    // Run npm install to add the required dependencies
    await new Promise((resolve, reject) => {
        spawn('npm', ['install', '--save-dev', 'bm-thing-cli'], {cwd, stdio: 'inherit', shell: true}).on('close', resolve);
    });
}

/**
 * Verifies if a thingworx project exists at the given path.
 * @param path      The path to verify.
 */
function projectExists(path: string): boolean {
    // In order for a project to exist, it needs to have the following files:
    // - package.json:      standard npm package file
    // - tsconfig.json:     typescript project options
    // - twconfig.json:     thingworx project options
    // - metadata.xml:      thingworx metadata template
    // - src:               the sources folder

    if (FS.existsSync(`${path}/package.json`)) {
        // For this to be a thingworx project, it needs to have bm-thing-cli as a dev dependency.
        const packageJSON = require(`${path}/package.json`);
        const devDependencies = packageJSON.devDependencies;

        if (!devDependencies) return false;
        
        const dependencies = Object.keys(devDependencies);
        if (!dependencies.includes('bm-thing-cli')) {
            return false;
        }
    }
    else {
        return false;
    }

    // Most of the options in tsconfig are optional for this project, the default ones are just recommendations
    // so its only required that such a file exists
    if (!FS.existsSync(`${path}/tsconfig.json`)) {
        return false;
    }

    // A twconfig.json file must exist and contain at least the "projectName" key
    if (!FS.existsSync(`${path}/twconfig.json`)) {
        return false;
    }
    else {
        const twConfigJSON = require(`${path}/twconfig.json`) as TWConfig;
        if (!twConfigJSON.projectName) {
            return false;
        }
    }

    // A template metadata file must exist
    if (!FS.existsSync(`${path}/metadata.xml`)) {
        return false;
    }

    return true;
}

/**
 * Returns the default package.json file to be used for new project.
 * @param args      An object that contains the parameters from which the project is created.
 */
function packageDefault(args: CreationParameters) {
    return {
        name: args.packageName,
        version: "1.0.0",
        description: args.description || '',
        author: args.author || '',
        scripts: {
            build: "twc build",
            buildDebug: "twc build --debug",
            upload: "twc upload",
            uploadDebug: "twc upload --debug"
        }
    };
}

/**
 * Returns the default twconfig.json file to be used for the new project.
 * @param projectName       The project name to use.
 * @returns                 An object with the contents of a twconfig.json file.
 */
export function TWConfigDefault(projectName: string) {
    return {
        "$schema": "https://bogdanmihaiciuc.com/twconfig.schema.json",
        experimentalGlobals: false,
        projectName,
        generateProjectEntity: true,
        generateThingInstances: true,
        includeProjectDependencies: true,
        autoGenerateDataShapeOrdinals: false,
        minimumThingWorxVersion: '9.0.0',
        repositroyPath: './repository',
        methodHelpers: TWConfigMethodHelperDefaults(),
        projectDependencies: [
        ],
        entityDependencies: [
        ],
        extensionDependencies: [
        ]
    };
}

/**
 * Returns the default settings for the methodHelpers section of a TWConfig
 * @returns     An object with the method helper defaults
 */
 export function TWConfigMethodHelperDefaults(): MethodHelpers {
    return  {
        methodName: true,
        className: false,
        filePath: false,
        logPrefix: "me.name + '::' + METHOD_NAME + ':: '",
    };
}

/**
 * Returns the default tsconfig.json file to be used for the new project.
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
            jsx: "react",
            jsxFactory: "defineWidget",
            jsxFragmentFactory: "defineWidget",
            skipLibCheck: true,
            moduleResolution: "Node",
            lib: [
                "esnext"
            ],
            typeRoots: [
                "./typings/",
                "./node_modules/@types/"
            ]
        },
        include: [
            "./static/**/*.d.ts",
            "./src/**/*.d.ts",
            "./src/**/*.ts",
            "./tw_imports/**/*.d.ts",
            "./node_modules/bm-thing-transformer/static/**/*.d.ts",
            "./node_modules/bm-thing-cli/node_modules/bm-thing-transformer/static/**/*.d.ts",
        ]
    };
}

/**
 * Returns the default launch.json that contains a thingworx attach command
 * for debugging the typescript project.
 * @param args          An object that contains the parameters from which the project is created.
 * @returns             An object with the contents of a launch.json file.
 */
function launchConfigurationDefault(args: CreationParameters) {
    if (args.authenticationKind != 'appKey' || !args.thingworxAppKey) {
        throw new Error(`🛑 \x1b[1;31mAn attach launch configuration cannot be created without an app key.\x1b[0m`);
    }

    // Extract the necessary information from the URL
    const url = new URL(args.thingworxServer);

    return {
        version: "0.2.0",
        configurations: [
            {
                type: "thingworx-vscode",
                request: "attach",
                name: "Attach to Thingworx",
                thingworxDomain: url.hostname,
                thingworxPort: url.port || (url.protocol == 'https' ? 443 : 80),
                thingworxAppKey: args.thingworxAppKey,
                useSSL: url.protocol == 'https' ? true : false
            }
        ]
    }
}

/**
 * Returns a metadata.xml file that represents a template from which an extension's metadata
 * is generated.
 * @returns     A string with the contents of a metadata.xml file.
 */
function metadataXMLDefault(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Entities>
      <ExtensionPackages>
        <ExtensionPackage name="" description="" vendor="" packageVersion="" minimumThingWorxVersion="6.0.0" buildNumber=""/>
      </ExtensionPackages>
    </Entities>
    `;
}

/**
 * Returns the default .env file to be used for the new project.
 * @param projectName       The project name to use.
 * @returns                 A string with the contents of an .env file.
 */
function envDefault(args: CreationParameters): string {
    let env = `THINGWORX_SERVER=${args.thingworxServer}\n`;

    if (args.authenticationKind == 'username') {
        env += `THINGWORX_USER=${args.thingworxUser}\n`;
        env += `THINGWORX_PASSWORD=${args.thingworxPassword}\n`;
    }
    else {
        env += `THINGWORX_APPKEY=${args.thingworxAppKey}`;
    }

    return env;
}

/**
 * Returns the contents of a default .gitignore file.
 * @returns     A string with the contents of a .gitignore file.
 */
function gitignoreDefault(): string {
    return 'node_modules\nbuild\nzip\nstatic/gen\n.env\n.DS_Store'
}