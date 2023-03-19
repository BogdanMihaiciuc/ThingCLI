import { TWThingTransformerFactory, TWConfig } from 'bm-thing-transformer';
import * as FS from 'fs';
import * as ts from 'typescript';
import { TWProjectKind, TWProjectUtilities } from '../Utilities/TWProjectUtilities';

/**
 * Builds the thingworx collection declarations of the thingworx project.
 */
export function declarations() {

    // Load the twconfig file which contains compilation options.
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;

    process.stdout.write(`\x1b[2m❯\x1b[0m Building declarations`);

    function getMethodHelperDeclarations(): string {
        let declarations = '';
        if (twConfig.methodHelpers) {
            if (twConfig.methodHelpers.methodName) {
                declarations += `\n/**\n * Contains the name of the service or subscription being executed\n */\ndeclare const METHOD_NAME: string;\n`;
            }
            if (twConfig.methodHelpers.className) {
                declarations += `\n/**\n * Contains the name of the typescript class this service is a part of\n */\ndeclare const CLASS_NAME: string;\n`;
            }
            if (twConfig.methodHelpers.filePath) {
                declarations += `\n/**\n * Contains the relative file path of the to the file that contains this service\n */\ndeclare const FILE_PATH: string;\n`;
            }
            if (twConfig.methodHelpers.logPrefix) {
                declarations += `\n/**\n * Prefix that can be used in all log messages to identify the message source \n */\ndeclare const LOG_PREFIX: string;\n`;
            }
        }
        return declarations;
    }

    /**
     * Emits the declarations of the project at the given path.
     * @param path      The project's path.
     */
    function emitDeclarationsOfProject(path: string): void {
        // Create a new store for each project
        twConfig.store = {};

        // Create the typescript project and emit using a "watch" transformer
        const program = TWProjectUtilities.programWithPath(path);
        const tsFiles = program.getSourceFiles().filter(file => !file.fileName.endsWith('.d.ts'));
        for (const file of tsFiles) {
            ts.transform(file, [TWThingTransformerFactory(program, path, false, true, twConfig)], program.getCompilerOptions());
        }

        // Accumulate the declarations into a single file
        let declarations = twConfig.projectName != '@auto' ? getMethodHelperDeclarations() : '';

        for (const key in twConfig.store) {
            // Keys starting with @ are non-entity entries
            if (key.startsWith('@')) continue;
            const entity = twConfig.store[key];
            declarations += `\n${entity.toDeclaration()}\n`;
        }

        // Write the declarations to a .d.ts file
        TWProjectUtilities.ensurePath(`${path}/static/gen`, path);
        FS.writeFileSync(`${path}/static/gen/Generated.d.ts`, declarations);
    }

    const cwd = process.cwd();

    if (twConfig.projectName == '@auto') {
        TWProjectUtilities.ensurePath(`${cwd}/src/static/gen`, cwd);
        FS.writeFileSync(`${cwd}/src/static/gen/Generated.d.ts`, getMethodHelperDeclarations());
        // If running in multi-project mode, run against each project separately
        TWProjectUtilities.projects()
            .filter(p => p.kind == TWProjectKind.TypeScript)
            .forEach(p => { emitDeclarationsOfProject(p.path); });
    }
    else {
        // If running in single project mode, run against the whole repository
        emitDeclarationsOfProject(cwd);
    }


    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Built declarations   \n`);
}