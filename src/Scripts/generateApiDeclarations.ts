import { TWThingTransformerFactory, TWConfig } from 'bm-thing-transformer';
import * as fs from 'fs';
import { TSUtilities } from '../Utilities/TSUtilities';

/**
 * Builds the thingworx collection declarations of the thingworx project.
 */
export function exposedApi() {

    const cwd = process.cwd();
    // Load the twconfig file which contains complication options.
    const twConfig = require(`${cwd}/twconfig.json`) as TWConfig;

    process.stdout.write(`\x1b[1;31m✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖\x1b[0m\n`);
    process.stdout.write(`\x1b[1;31m✖✖✖✖✖✖✖\x1b[0m Building exposed APIs is considered experimental and subject to change \x1b[1;31m✖✖✖✖✖✖✖\x1b[0m\n`);
    process.stdout.write(`\x1b[1;31m✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖✖\x1b[0m\n`);

    process.stdout.write(`\x1b[2m❯\x1b[0m Building exposed API`);
    
    // Create a new store for each project
    twConfig.store = {};

    // Create the typescript project and emit using a "watch" transformer
    const program = TSUtilities.programWithPath(cwd);
    program.emit(undefined, () => {}, undefined, undefined, {
        before: [
            TWThingTransformerFactory(program, cwd, false, false, twConfig)
        ],
    });

    // Accumulate the declarations into a single file
    let declarations = "import { ServiceResult, INFOTABLE, NOTHING, NUMBER, STRING, INTEGER } from './global';\n";
    
    for (const key in twConfig.store) {
        if (key == '@globalBlocks') continue;
        const entity = twConfig.store[key];
        declarations += `\n${entity.toApiDeclaration()}\n`;
    }

    // Write the declarations to a .d.ts file
    TSUtilities.ensurePath(`${cwd}/api`, cwd);
    fs.writeFileSync(`${cwd}/api/Generated.d.ts`, declarations);

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Built exposed API  \n`);
}