import * as FS from 'fs';
import * as Path from 'path';
import { TWConfig } from 'bm-thing-transformer';
import { TWDataConfig, TWProjectKind, TWProjectUtilities } from '../Utilities/TWProjectUtilities';
import { TWClient } from '../Utilities/TWClient';

const [, , , ...args] = process.argv;

/**
 * Pushes runtime data files from the local project folders to ThingWorx.
 * Reads the `data` array from each XML project's twconfig.json. These files are gitignored
 * and represent environment-specific migration data.
 */
export async function dataPush(): Promise<void> {
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;
    const projects = TWProjectUtilities.projectsWithArguments(args);

    if (twConfig.projectName == '@auto') {
        for (const project of TWProjectUtilities.projects()) {
            if (projects && !projects.includes(project.name)) continue;

            if (project.kind == TWProjectKind.XML && project.data.length > 0) {
                for (const dataConfig of project.data) {
                    await pushDataFile(project.path, dataConfig);
                }
            }
        }
    }
    else {
        throw new Error('data-push is only supported in multi-project mode.');
    }
}

async function pushDataFile(projectPath: string, dataConfig: TWDataConfig): Promise<void> {
    const { entityType, entityName, file } = dataConfig;
    const localPath = Path.join(projectPath, file);

    if (!FS.existsSync(localPath)) {
        process.stdout.write(`\x1b[1;33m⚠\x1b[0m Skipping data import for ${entityType}/${entityName}: file not found at ${localPath}\n`);
        return;
    }

    process.stdout.write(`\x1b[2m❯\x1b[0m Importing data ${entityType}/${entityName} to ${TWClient.server}`);

    const fileName = Path.basename(localPath);
    await TWClient.dataImport(Path.dirname(localPath), fileName);

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Imported data ${entityType}/${entityName} to ${TWClient.server} \n`);
}
