import * as FS from 'fs';
import * as Path from 'path';
import { TWConfig, TWEntityKind, JsonThingToTsTransformer } from 'bm-thing-transformer';
import { TWProjectKind, TWProjectUtilities } from '../Utilities/TWProjectUtilities';
import { TWClient } from '../Utilities/TWClient';
import AdmZip from 'adm-zip';
import { ProgressBar } from '../Utilities/ProgressBar';

const [path, bin, command, ...args] = process.argv;

/**
 * Pulls xml files from thingworx into the target folders
 */
export async function pull(): Promise<void> {
    // Load the twconfig file which contains compilation options.
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;

    // This command requires that the --xml argument be specified
    if (!args.includes('--xml') && !args.includes('--ts')) {
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
            if (project.kind == TWProjectKind.TypeScript && args.includes('--ts')) {
                pullProjectToTypescript(Path.join(project.path, 'src'), project.name);
            }
        };
    }
    else {
        if (args.includes('--ts')) {
            pullProjectToTypescript('src', twConfig.projectName);
        }
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

/**
 * Exports a given ThingWorx project entities as typescript files
 * @param path Path to where the exported typescript files are emitted
 * @param projectName Name of the project to export
 */
async function pullProjectToTypescript(path: string, projectName: string) {
    let progress = 0;
    let entity = '';
    const transformer = new JsonThingToTsTransformer();


    console.log(`\x1b[2m❯\x1b[0m Transforming project ${projectName} from ${TWClient.server} into Typescript\n`);

    // Create a progress bar to track installation
    const bar = new ProgressBar();
    bar.start();

    try {
        bar.update(0, `Getting project ${projectName} entities...`)

        // Get the list of entities in the project
        const projectEntities = await getProjectEntities(projectName);

        bar.update(0.1, 'Starting transformation...');
        let progress = 0;
        const slice = (1 - 0.1) / projectEntities.length;

        // First get the list of users in the project
        const users = await Promise.all(projectEntities
            .filter(e => e.parentType == "Users")
            .map(async e => JSON.parse((await TWClient.getEntity(e.name, e.parentType)).body))
        );
        progress += users.length * slice;
        bar.update(progress, 'Transforming users in the project...');

        // Then, the list of Groups
        const groups = await Promise.all(projectEntities
            .filter(e => e.parentType == "Groups")
            .map(async e => JSON.parse((await TWClient.getEntity(e.name, e.parentType)).body))
        );
    
        progress += groups.length * slice;
        bar.update(progress, 'Transforming groups in the project...');

        // Generate a user list containing all users and groups
        const userList = `
    class MyUserList extends UserList {
        ${users.map(u => {
            return `${u.name}: UserExtensionLiteral = {${u.configurationTables.UserExtensions.rows.map(r => `${r.name}: "${r.value}"`).join(', \n\t\t')}
        }`}).join(';\n\n\t')}
        ${groups.map(g => {
            return `${g.name} = [${g.members.map(r => `${r.type}s.${r.name}`).join(', ')}]`
        }).join(';\n\n\t')}
    }
    `
        // write the user list
        FS.mkdirSync(Path.join(path, 'UserLists'), { recursive: true });
        FS.writeFileSync(Path.join(path, 'UserLists', 'index.ts'), userList);

        // These are the entity types that we know how to handle, and their internal names
        const handledProperties = {
            Things: TWEntityKind.Thing,
            ThingTemplates: TWEntityKind.ThingTemplate,
            ThingShapes: TWEntityKind.ThingShape,
            DataShapes: TWEntityKind.DataShape,
            Organizations: TWEntityKind.Organization
        }
        // Iterate over each entity in the project, and convert it to typescript (if possible)
        for (const entity of projectEntities.filter(e => e.parentType != 'Users' && e.parentType != 'Groups')) {
            progress += slice;
            bar.update(progress, `${entity.parentType}/${entity.name}`);
            if(handledProperties[entity.parentType]) {
                const converted = await convertEntityToTs(entity.name, entity.parentType, handledProperties[entity.parentType], transformer);
                FS.mkdirSync(Path.join(path, entity.parentType), { recursive: true });
                FS.writeFileSync(Path.join(path, entity.parentType, `${entity.name}.ts`), converted.declaration);
            } else {
                bar.log(`\x1b[2m❯\x1b[0m Skipping over unsupported entity ${entity.parentType}/${entity.name}.`);
            }
        }

        bar.update(1, 'Completed. Keep in mind that manual changes need to be made to the generated files.');
    } finally {
        bar.stop();
    }

}

/**
 * Gets a listing of the entities in the given project, including their name, parent type.
 * @param name          The name of the project.
 * @returns             A promise that resolves with the infotable of entities in the project.
 */
async function getProjectEntities(name: string): Promise<{ name: string, parentType: string, isSystemObject: boolean }[]> {
    const response = await TWClient.getProjectEntities(name);

    if (response.statusCode != 200) {
        throw new Error(`Could not get the entity list for project ${name}.\nServer returned status code ${response.statusCode}\nbody:\n${response.body}`);
    }

    return JSON.parse(response.body).rows;
}

/**
 * Converts a JSON metadata from a ThingWorx entity into a typescript declaration.
 * @param entityName Name of the entity
 * @param entityType Type of entity, pluralized, as coming from ThingWorx
 * @param kind Internal name of the entity kind
 * @param transformer Transformer to use to convert the entity
 * @returns A promise that resolves with the typescript declaration for the entity
 */
async function convertEntityToTs(entityName: string, entityType: string, kind: TWEntityKind, transformer: JsonThingToTsTransformer): Promise<{ declaration: string, className: string }> {
    const response = await TWClient.getEntity(entityName, entityType);

    if (response.statusCode != 200) {
        throw new Error(`Could not get the entity definition for ${entityName}.\nServer returned status code ${response.statusCode}\nbody:\n${response.body}`);
    }

    const metadata = JSON.parse(response.body);
    return transformer.createTsDeclarationForEntity(metadata, kind);
}