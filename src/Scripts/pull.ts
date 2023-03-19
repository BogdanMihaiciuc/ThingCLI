import * as FS from 'fs';
import * as Path from 'path';
import { TWConfig } from 'bm-thing-transformer';
import { TWProjectKind, TWProjectUtilities } from '../Utilities/TWProjectUtilities';
import { TWClient } from '../Utilities/TWClient';
import AdmZip from 'adm-zip';

const [path, bin, command, ...args] = process.argv;

/**
 * Pulls xml files from thingworx into the target folders
 */
export async function pull(): Promise<void> {
    // Load the twconfig file which contains compilation options.
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;

    // This command requires that the --xml argument be specified
    if (!args.includes('--xml')) {
        throw new Error('Unable to pull entities because a format has not been specified.');
    }

    const projects = TWProjectUtilities.projectsWithArguments(args);

    if (twConfig.projectName == '@auto') {
        // In multi-project mode, export each xml-only project
        for (const project of TWProjectUtilities.projects()) {
            // If an array of projects was specified, only build the specified projects
            if (projects && !projects.includes(project.name)) {
                continue;
            }

            if (project.kind == TWProjectKind.XML) {
                pullProjectToFolder(Path.join(project.path, 'src'), project.name);
            }
        };
    }
    else {
        throw new Error('Pull is only supported in multi-project mode.')
    }
}

/**
 * Exports a given ThingWorx project into a local folder
 * @param path Path to where the exported XMLs are emitted
 * @param projectName Name of the ThingWorx project to export
 */
async function pullProjectToFolder(path: string, projectName: string) {
    process.stdout.write(`\x1b[2m❯\x1b[0m Exporting ${projectName} from ${TWClient.server} to path ${path}`);

    // Details for where the entities are imported into thingworx
    const repositoryName = process.env.THINGWORX_REPO ?? 'SystemRepository';
    const repositoryPath = process.env.THINGWORX_REPO_PATH ?? '/';

    // step 1: ask twx to do a source control export, and get the link to the zip file
    const fileUrl = await TWClient.sourceControlExport(projectName, repositoryName, repositoryPath, projectName);
    // step 2: download the file from thingworx
    if (!FS.existsSync("temp")) {
        FS.mkdirSync("temp");
    }
    await TWClient.downloadFile(fileUrl, `temp/${projectName}.zip`);
    // step 3: Unzip the file into the target folder
    var zip = new AdmZip(`temp/${projectName}.zip`);
    // The Zip file will contain a subfolder with the project name
    zip.extractAllTo('temp', true);
    // Move the contents of that folder into the project path
    FS.cpSync(`temp/${projectName}`, path, { recursive: true, });
    // step 4: cleanup
    FS.rmSync("temp", { recursive: true, force: true })
    await TWClient.deleteRemoteDirectory(repositoryName, `${repositoryPath}/${projectName}`);

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Exported ${projectName} from ${TWClient.server} to path ${path} \n`);
}
