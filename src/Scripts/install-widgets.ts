import { TWWidgetParser } from "../Utilities/TWWidgetParser";
import { TWProjectUtilities } from "../Utilities/TWProjectUtilities";
import * as FS from 'fs';

const [path, bin, command, file, ...args] = process.argv;

/**
 * Pulls widget types from the thingworx server through a file
 * downloaded via the widget export extension.
 * @returns     A promise that resolves when the operation completes.
 */
export async function installWidgets(): Promise<void> {
    process.stdout.write(`\x1b[2m❯\x1b[0m Installing widget definitions from "${file}".`);

    // Load the specified widget types file
    if (!file || !FS.existsSync(file)) {
        throw new Error(`File "${file}" does not exist.`);
    }

    const content = FS.readFileSync(file, 'utf-8');
    const definition = JSON.parse(content);

    // Parse the file into typings and defaults
    const parser = new TWWidgetParser();
    const definitionsFile = parser.definitionsWithWidgetProperties(definition.widgetTypings);
    const defaultsFile = definition.widgetDefaults;

    // Save the result in ui-defaults
    const cwd = process.cwd();
    TWProjectUtilities.ensurePath(`${cwd}/ui-static/`, cwd);
    FS.writeFileSync(`${cwd}/ui-static/widgets.d.ts`, definitionsFile);
    FS.writeFileSync(`${cwd}/ui-static/defaults.json`, JSON.stringify(defaultsFile));

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Installed widget defintions from "${file}". \n`);
}