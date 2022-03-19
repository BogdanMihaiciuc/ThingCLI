import { TWThingTransformerFactory, TWConfig } from 'bm-thing-transformer';
import * as fs from 'fs';
import { TSUtilities } from '../Utilities/TSUtilities';

/**
 * Builds the thingworx collection declarations of the thingworx project.
 */
export function declarations() {

    // Load the twconfig file which contains complication options.
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;

    process.stdout.write(`\x1b[2m❯\x1b[0m Building declarations`);
    
    /**
     * Emits the declarations of the project at the given path.
     * @param path      The project's path.
     */
    function emitDeclarationsOfProject(path: string): void {
        // Create a new store for each project
        twConfig.store = {};
    
        // Create the typescript project and emit using a "watch" transformer
        const program = TSUtilities.programWithPath(path);
        program.emit(undefined, () => {}, undefined, undefined, {
            before: [
                TWThingTransformerFactory(program, path, false, true, twConfig)
            ]
        });
    
        // Accumulate the declarations into a single file
        let declarations = '';
        
        for (const key in twConfig.store) {
            if (key == '@globalBlocks') continue;
            const entity = twConfig.store[key];
            declarations += `\n${entity.toDeclaration()}\n`;
        }

        // Write the declarations to a .d.ts file
        TSUtilities.ensurePath(`${path}/static/gen`, path);
        fs.writeFileSync(`${path}/static/gen/Generated.d.ts`, declarations);
    }
    
    const cwd = process.cwd();
    
    if (twConfig.projectName == '@auto') {
        // If running in multi-project mode, run against each project separately
        TSUtilities.projects().forEach(p => {
            emitDeclarationsOfProject(p.path);
        });
    }
    else {
        // If running in single project mode, run against the whole repository
        emitDeclarationsOfProject(cwd);
    }


    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Built declarations   \n`);
}