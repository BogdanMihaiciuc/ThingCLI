import { TWConfig } from 'bm-thing-transformer';
import * as FS from 'fs';
import AdmZip from 'adm-zip';
import { TWProjectUtilities } from '../Utilities/TWProjectUtilities';

const [, , command, ...args] = process.argv;

/**
 * Creates packages from the build results.
 */
export async function zip(): Promise<void> {

    const cwd = process.cwd();

    // Load the twconfig file which contains compilation options.
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;
    const packageJSON = require(`${process.cwd()}/package.json`);

    const zipName = `${packageJSON.name}-${packageJSON.version}.zip`;

    // In multi project mode, a build mode should be specified
    const isMerged = args.includes('--merged');
    const isSeparate = args.includes('--separate') || !isMerged;

    process.stdout.write(`\x1b[2m❯\x1b[0m Creating extension package`);

    // Clear the zip output folder to remove the previous build results
    if (FS.existsSync(`${cwd}/zip`)) {
        FS.rmSync(`${cwd}/zip`, {force: true, recursive: true});
    }

    FS.mkdirSync(`${cwd}/zip`);

    /**
     * Creates a zip archive with the contents of the given path.
     * @param name              The name of the archive.
     * @param path              The path to files to archive.
     * @param outPath           The path in which to save the archive.
     */
    async function zipPath(name: string, path: string, outPath: string): Promise<void> {
        const admArchive = new AdmZip();
        admArchive.addLocalFolder(path);

        return await new Promise<void>((resolve, reject) => {
            admArchive.writeZip(`${outPath}/${name}`, (error) => {
                if (error) return reject(error);

                resolve();
            });
        });
    }

    if (twConfig.projectName == '@auto' && isSeparate) {
        // If running in multi-project mode with separate projects
        // it is necessary to first zip each project individually, then create an archive
        // containing each of the previously created zips
        const baseOutPath = `${cwd}/zip/projects`;

        // Ensure that the base out path exists
        if (!FS.existsSync(baseOutPath)) FS.mkdirSync(baseOutPath)

        // List of projects included in the build
        const projects = TWProjectUtilities.projectsWithArguments(args);

        // Zip each project
        for (const p of TWProjectUtilities.projects()) {
            if (projects && !projects.includes(p.name)) {
              continue;
            }
            const zipName = `${packageJSON.name}-${p.name}-${packageJSON.version}.zip`;
            const path = `${cwd}/build/${p.name}`;
            await zipPath(zipName, path, baseOutPath);
        }

        // At the end of the build command, create a zip with each package and delete the temporary folder
        // For other commands, it is necessary to keep the zips separate and import them in the appropriate order
        if (command == 'build') {
            await zipPath(zipName, baseOutPath, `${cwd}/zip`);
            FS.rmSync(baseOutPath, {recursive: true, force: true});
        }
    }
    else {
        // If running in single project mode, run against the whole build directory
        const outPath = `${cwd}/zip`;

        await zipPath(zipName, `${cwd}/build`, outPath);
    }

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Created extension \x1b[2mzip/${zipName}\x1b[0m\n`);
}