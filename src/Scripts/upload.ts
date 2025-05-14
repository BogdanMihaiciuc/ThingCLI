import * as FS from 'fs';
import * as Path from 'path';
import readline from 'readline';
import { TWConfig, TWPropertyDataChangeKind } from 'bm-thing-transformer';
import { TWProjectKind, TWProjectUtilities } from '../Utilities/TWProjectUtilities';
import { TWClient } from '../Utilities/TWClient';
import AdmZip from 'adm-zip';

const [, , , ...args] = process.argv;

/**
 * Uploads the archive from the build folder to thingworx.
 * @param push          Defaults to `false`. When set to `true`, XML projects will be uploaded as regular
 *                      editable entities. When set to `false` all projects are uploaded as extensions.
 */
export async function upload(push: boolean = false): Promise<void> {
    const cwd = process.cwd();

    // Load the twconfig file which contains compilation options.
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;

    // When running separate in multi project mode, the zip files have to be imported
    // in the appropriate order
    const isMerged = args.includes('--merged');
    const isSeparate = args.includes('--separate') || !isMerged;

    // Load the twconfig file which contains the version and package name information.
    const packageJSON = require(`${process.cwd()}/package.json`);

    const projects = TWProjectUtilities.projectsWithArguments(args);

    // If extensions are specified, create a zip with them and upload them
    if (args.includes('--extensions')) {
        // Create a zip file with all of the extensions so thingworx can determine
        // the correct order in which they should install
        const admArchive = new AdmZip();
        admArchive.addLocalFolder(Path.join(cwd, 'extensions'));

        await new Promise<void>((resolve, reject) => {
            admArchive.writeZip(Path.join(cwd, 'zip', 'extensions.zip'), (error) => {
                if (error) return reject(error);

                resolve();
            });
        });

        // Deploy the extensions
        try {
            await uploadExtension(Path.join(cwd, 'zip', 'extensions.zip'), 'Extensions');
        }
        catch (e) {
            // The extensions failing is non-critical, so a project upload is attempted
            // even if an error occurs at this step
        }

        // Delete the combined extensions zip after installation
        FS.rmSync(Path.join(cwd, 'zip', 'extensions.zip'));
    }

    const repositoryNames: Record<string, string> = {};

    if (isSeparate && twConfig.projectName == '@auto') {
        // In separate mode, it is necessary to upload the projects in dependency order
        for (const project of TWProjectUtilities.dependencySortedProjects().reverse()) {
            // If an array of projects was specified, only upload the specified projects
            if (projects && !projects.includes(project.name)) {
                continue;
            }

            const zipName = `${packageJSON.name}-${project.name}-${packageJSON.version}.zip`;

            // Import either as an extension or a source control entities
            if (project.kind == TWProjectKind.XML && push) {
                await uploadSourceControlledZip(`${cwd}/zip/projects/`, zipName, project.name);
            }
            else {
                await uploadExtension(`${cwd}/zip/projects/${zipName}`, project.name);
            }

            // Discover the repository folders for each project
            if (twConfig.repositoryPath) {
                const repositoryPath = Path.resolve(project.path, twConfig.repositoryPath);
                if (FS.existsSync(repositoryPath)) {
                    // Enumerate all folders and add them to the repository names
                    const folders = FS.readdirSync(repositoryPath, {withFileTypes: true}).filter(d => d.isDirectory());
                    for (const folder of folders) {
                        repositoryNames[folder.name] = folder.name;
                    }
                }
            }
        };
    }
    else {
        // In merged mode, just upload the resulting zip as extension
        const zipName = `${packageJSON.name}-${packageJSON.version}.zip`;
        await uploadExtension(`${cwd}/zip/${zipName}`);

        // Discover the repository folders
        if (twConfig.repositoryPath) {
            const repositoryPath = Path.resolve(cwd, twConfig.repositoryPath);
            if (FS.existsSync(repositoryPath)) {
                // Enumerate all folders and add them to the repository names
                const folders = FS.readdirSync(repositoryPath, {withFileTypes: true}).filter(d => d.isDirectory());
                for (const folder of folders) {
                    repositoryNames[folder.name] = folder.name;
                }
            }
        }
    }

    // Upload the repository files to thingworx
    for (const repository in repositoryNames) {
        await uploadRepositoryFiles(`${cwd}/zip`, `files-${repository}-${packageJSON.version}.zip`, repository);
    }
}

/**
 * Uploads the repository files in the specified zip archive to the specified repository.
 * @param path              The folder containing the zip file.
 * @param zip               The name of the zip file.
 * @param repository        The repository to which the zip file should be uploaded.
 */
async function uploadRepositoryFiles(path: string, zip: string, repository: string): Promise<void> {
    process.stdout.write(`\x1b[2m❯\x1b[0m Uploading files to repository ${repository} in ${TWClient.server}`);

    try {
        // step 1: upload the file to Thingworx
        await TWClient.uploadFile(path, zip, repository, '/');
        // step 2: extract the uploaded file into a folder on the twx repository
        await TWClient.unzipAndExtractRemote(repository, `/${zip}`, `/`);
        // step 3: delete the zip archive
        await TWClient.deleteRemoteFile(repository, `/${zip}`);
    }
    catch (e) {
        process.stdout.write(`\r\x1b[1;31m✖\x1b[0m Unable to upload files to repository ${repository} in ${TWClient.server}\n`);
        throw new Error(`\x1b[1;31mFailed to upload files to thingworx file repository ${repository}\x1b[0m
${e}`);
    }

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Uploaded files to repository ${repository} in ${TWClient.server}   \n`);
}

/**
 * Import the specified zip file containing entities into ThingWorx using source control imports.
 * @param path          Path to the folder containing the zip file.
 * @param zipName       Name of the zip file to be uploaded.
 * @param projectName   Name of the project to which the entities in the specified archive belong.
 * @returns             A promise that resolves when the operation completes.
 */
async function uploadSourceControlledZip(path: string, zipName: string, projectName: string): Promise<void> {
    process.stdout.write(`\x1b[2m❯\x1b[0m Pushing entities in ${projectName} to ${TWClient.server}`);

    // Details for where the entities are imported into thingworx
    const repositoryName = process.env.THINGWORX_REPO;
    const repositoryPath = process.env.THINGWORX_REPO_PATH;

    if (!repositoryName || !repositoryPath) {
        throw new Error(`Unable to push entities because the file repository has not been properly configured in your environment.`);
    }

    // step 1: upload the file to Thingworx
    await TWClient.uploadFile(path, zipName, repositoryName, repositoryPath);
    // step 2: extract the uploaded file into a folder on the twx repository
    await TWClient.unzipAndExtractRemote(repositoryName, `${repositoryPath}/${zipName}`, `${repositoryPath}/${projectName}`);
    // step 3: ask ThingWorx to import the entities in the folder using source control import
    await TWClient.sourceControlImport(repositoryName, `${repositoryPath}/${projectName}`, projectName);
    // step 4: cleanup
    await TWClient.deleteRemoteDirectory(repositoryName, `${repositoryPath}/${projectName}`);
    
    readline.clearLine(process.stdout, -1);

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Pushed entities in ${projectName} to ${TWClient.server} \n`);
}

/**
 * Uploads an extension zip at the specified path to the thingworx server.
 * @param path      The path to the zip file to upload.
 * @param name      If specified, the name of the project that should appear in the console.
 * @returns         A promise that resolves when the operation completes.
 */
async function uploadExtension(path: string, name?: string): Promise<void> {
    process.stdout.write(`\x1b[2m❯\x1b[0m Uploading${name ? ` ${name}` : ''} to ${TWClient.server}`);

    const formData = new FormData();

    formData.append("file", new Blob([FS.readFileSync(path)]), path.toString().split("/").pop());

    const response = await TWClient.importExtension(formData);

    if (response.statusCode != 200) {
        process.stdout.write(`\r\x1b[1;31m✖\x1b[0m Unable to upload${name ? ` ${name}` : ''} to ${TWClient.server}\n`);
        throw new Error(`\x1b[1;31mFailed to upload project to thingworx with status code ${response.statusCode} (${response.statusMessage})\x1b[0m
${formattedUploadStatus(response.body)}`);
    }

    process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Uploaded${name ? ` ${name}` : ''} to ${TWClient.server}    \n`);
    process.stdout.write(formattedUploadStatus(response.body));
}


/**
 * Returns a formatted string that contains the validation and installation status extracted
 * from the specified server response.
 * @param response         The server response.
 * @returns                The formatted upload status.
 */
function formattedUploadStatus(response): string {
    let infotable;
    let result = '';
    try {
        infotable = JSON.parse(response);

        // The upload response is an infotable with rows with two possible properties:
        // validate - an infotable where each row contains the validation result for each attempted extension
        // install - if validation passed, an infotable where each row contains the installation result for each attempted extension
        const validations = infotable.rows.filter(r => r.validate);
        const installations = infotable.rows.filter(r => r.install);

        const validation = validations.length && { rows: Array.prototype.concat.apply([], validations.map(v => v.validate.rows)) };
        const installation = installations.length && { rows: Array.prototype.concat.apply([], installations.map(i => i.install.rows)) };

        // A value of 1 for extensionReportStatus indicates failure, 2 indicates warning, and 0 indicates success
        for (const row of validation.rows) {
            if (row.extensionReportStatus == 1) {
                result += `🛑 \x1b[1;31mValidation failed\x1b[0m for "${row.extensionPackage.rows[0].name}-${row.extensionPackage.rows[0].packageVersion}": "${row.reportMessage}"\n`;
            }
            else if (row.extensionReportStatus == 2) {
                result += `🔶 \x1b[1;33mValidation warning\x1b[0m for "${row.extensionPackage.rows[0].name}-${row.extensionPackage.rows[0].packageVersion}": "${row.reportMessage}"\n`;
            }
            else {
                result += `✅ \x1b[1;32mValidation passed\x1b[0m for "${row.extensionPackage.rows[0].name}-${row.extensionPackage.rows[0].packageVersion}": "${row.reportMessage}"\n`;
            }
        }

        if (!installation) return result;

        // If an installation status is provided, display it as well; it has the same format as validation
        for (const row of installation.rows) {
            if (row.extensionReportStatus == 1) {
                result += `🛑 \x1b[1;31mInstallation failed\x1b[0m for "${row.extensionPackage.rows[0].name}-${row.extensionPackage.rows[0].packageVersion}": "${row.reportMessage}"\n`;
            }
            else if (row.extensionReportStatus == 2) {
                result += `🔶 \x1b[1;33mInstallation warning\x1b[0m for "${row.extensionPackage.rows[0].name}-${row.extensionPackage.rows[0].packageVersion}": "${row.reportMessage}"\n`;
            }
            else {
                result += `✅ \x1b[1;32mInstalled\x1b[0m "${row.extensionPackage.rows[0].name}-${row.extensionPackage.rows[0].packageVersion}": "${row.reportMessage}"\n`;
            }
        }

        return result;
    }
    catch (e) {
        // If the response isn't a parsable response, it is most likely a simple message
        // that may be printed directly.
        return response;
    }
}