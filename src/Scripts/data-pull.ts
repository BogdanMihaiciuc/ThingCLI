import * as Path from 'path';
import { TWConfig } from 'bm-thing-transformer';
import { TWDataConfig, TWProjectKind, TWProjectUtilities } from '../Utilities/TWProjectUtilities';
import { TWClient } from '../Utilities/TWClient';

const [, , , ...args] = process.argv;

/**
 * Pulls runtime data files from ThingWorx into the local project folders.
 * Reads the `data` array from each XML project's twconfig.json. These files are gitignored
 * and represent environment-specific migration data.
 */
export async function dataPull(): Promise<void> {
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;
    const projects = TWProjectUtilities.projectsWithArguments(args);

    if (twConfig.projectName == '@auto') {
        for (const project of TWProjectUtilities.projects()) {
            if (projects && !projects.includes(project.name)) continue;

            if (project.kind == TWProjectKind.XML && project.data.length > 0) {
                for (const dataConfig of project.data) {
                    await pullDataFile(project.path, dataConfig);
                }
            }
        }
    }
    else {
        throw new Error('data-pull is only supported in multi-project mode.');
    }
}

async function pullDataFile(projectPath: string, dataConfig: TWDataConfig): Promise<void> {
    const { entityType, entityName, file } = dataConfig;
    process.stdout.write(`\x1b[2m❯\x1b[0m Exporting data ${entityType}/${entityName} from ${TWClient.server}`);

    const localPath = Path.join(projectPath, file);
    TWProjectUtilities.ensurePath(Path.dirname(localPath), Path.dirname(localPath));
    await TWClient.dataExport(entityType, entityName, localPath);

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Exported data ${entityType}/${entityName} from ${TWClient.server} to ${localPath} \n`);
}
