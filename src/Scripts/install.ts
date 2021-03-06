import * as fs from 'fs';
import { TWConfig } from 'bm-thing-transformer';
import { TWClient } from '../Utilities/TWClient';
import { GenericThingPackages, NonAlphanumericRegexGlobal, TWMetadataParser } from '../Utilities/TWMetadataParser';
import { ProgressBar } from '../Utilities/ProgressBar';

/**
 * The interface for an object that can be used to update the install progress.
 */
interface InstallProgress {

    /**
     * A number between 0 and 1 that controls the install progress.
     */
    progress: number;

    /**
     * A string displayed at the end of the progess bar that indicates which entity
     * is currently being processed.
     */
    entity: string;
}

/**
 * The interface of an entity dependency response row.
 */
interface EntityDependency {
    
    /**
     * The name of the entity.
     */
    name: string;

    /**
     * The kind of entity.
     */
    parentName: string;
}

/**
 * The interface for an infotable response.
 */
declare interface JSONInfoTable<T> {
    rows: T[];
    dataShape: {
        fieldDefinitions: {[key: string]: unknown}
    }
}
/**
 * An object that keeps track of installed entities to avoid getting stuck in circular dependencies.
 */
const installedEntities: Record<string, Record<string, boolean>> = {};

/**
 * A map that keeps track of used entity names to make it possible to install entities that have the
 * same name but different entity kinds.
 * Its keys are the sanitized names and its values are the correponding thingworx names.
 */
const installedEntityNames: Set<string> = new Set;



/**
 * Installs the entity dependencies defined in twconfig.json.
 * @returns     A promise that resolves when the operation completes.
 */
export async function install() {
    // Load the twconfig file which contains depdencency list.
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;

    const cwd = process.cwd();

    // Get total packages to install
    const totalPackages = (twConfig.projectDependencies || []).length + (twConfig.entityDependencies || []).length + (twConfig.extensionDependencies || []).length;
    let progress = 0;
    let entity = '';

    console.log(`\x1b[2m???\x1b[0m Downloading Thingworx dependencies from ${TWClient.server}\n`);

    // Create a progress bar to track installation
    const bar = new ProgressBar();
    bar.start();

    try {

        // A higher level wrapper around the cli-progress api
        const installProgress = {
            get progress() {
                return progress;
            },
            set progress(p) {
                progress = p;
                bar.update(progress, entity);
            },

            get entity() {
                return entity;
            },
            set entity(e) {
                entity = e;
                bar.update(progress, entity);
            }
        }

        // Delete and fully recreate the tw_imports folder
        fs.rmSync(`${cwd}/tw_imports`, {recursive: true, force: true});
        fs.mkdirSync(`${cwd}/tw_imports`);

        for (const extension of (twConfig.extensionDependencies || [])) {
            const slice = 1 / totalPackages;

            await getExtension(extension, slice, installProgress);
        }

        for (const project of (twConfig.projectDependencies || [])) {
            const slice = 1 / totalPackages;
            installProgress.entity = 'Projects/' + project
            const entities = await getProjectEntities(project);
            const projectSlice = slice / (entities.rows.length + 1);

            installProgress.progress += projectSlice;

            for (const row of entities.rows) {

                // Don't import system objects as those are part of the default installation
                if (row.isSystemObject) {
                    installProgress.progress += projectSlice;
                    continue;
                }
                await getEntity(row.name, row.parentType, projectSlice, installProgress);
            }
        }

        for (const entity of (twConfig.entityDependencies || [])) {
            const components = entity.split('/');
            await getEntity(components[1], components[0], 1 / totalPackages, installProgress);
        }

        installProgress.progress = 1;
        installProgress.entity = 'Complete';
    }
    finally {
        bar.stop();
    }

    installedEntityNames.clear();
    process.stdout.write(`\u001b[4A\x1b[1;32m???\x1b[0m Installed Thingworx dependencies from ${TWClient.server}  \n\n\n\n`);
}

/**
 * Returns a name for the entity, based on its Thingworx entity name, that is a valid
 * javascript identifier and unique across the imported entities.
 * @param name 
 */
function sanitizedEntityName(name: string): string {
    // Replace non-alphanumeric characters with underscores
    let sanitizedName = name.replace(NonAlphanumericRegexGlobal, '_');

    // For duplicate names, add underscores at the end of the name
    while (installedEntityNames.has(sanitizedName)) {
        sanitizedName += '_';
    }

    // Add the new name to the set of unique names
    installedEntityNames.add(sanitizedName);
    return sanitizedName;
}

/**
 * Performs a request to get the metadata of the given entity, then parses the response and saves
 * a declaration of the entity's class to `tw_imports`.
 * @param name                  The name of the entity.
 * @param kind                  The kind of entity.
 * @param slice                 A number that represents how much of the install progress this entity represents.
 * @param installProgress       An install progress controller that will be updated based on this entity's slice amount.
 * @returns                     A promise that resolves when this operation completes.
 */
async function getEntity(name: string, kind: string, slice: number, installProgress: InstallProgress): Promise<void> {
    // Thing packages will be handled by templates
    if (kind == 'ThingPackages') return;

    // Skip if already installed
    if (installedEntities[kind] && installedEntities[kind][name]) return;

    installProgress.entity = `${kind}/${name}`;

    // Get the entity metadata
    const response = await TWClient.getEntity(name, kind);
    if (response.statusCode != 200) {
        installProgress.progress += slice;
        throw new Error(`Could not get the metadata for entity ${kind}.${name}.\nServer returned status code ${response.statusCode}\nbody:\n${response.body}`);
    }

    const metadata = JSON.parse(response.body);

    // Don't reimport system objects
    if (metadata.isSystemObject || (metadata.aspects && metadata.aspects.isSystemObject)) {
        installProgress.progress += slice;
        return;
    }

    // Parse the response based on the kind of entity
    switch (kind) {
        case 'Things':
            importThing(metadata);
            break;
        case 'ThingTemplates':
            importThingTemplate(metadata);
            break;
        case 'ThingShapes':
            importThingShape(metadata);
            break;
        case 'DataShapes':
            importDataShape(metadata);
            break;
        case 'Resources':
            importResource(metadata);
            break;
        case 'Organizations':
            importEntityDeclaration(name, kind, metadata.description, Object.keys(metadata.organizationalUnits).map(o => JSON.stringify(o)).join(' | '));
            break;
        default:
            importEntityDeclaration(name, kind, metadata.description);
    }

    // Import dependencies as well
    try {
        installProgress.entity = `${kind}/${name}/Dependencies`
        const dependencies = await getEntityDependencies(name, kind);
        const entitySlice = slice / (dependencies.rows.length + 1);
        installProgress.progress += entitySlice;

        try {
            for (const dependency of dependencies.rows) {
                await getEntity(dependency.name, dependency.parentName, entitySlice, installProgress);
            }
        }
        catch (e) {
            installProgress.progress += entitySlice;
        }
    }
    catch (e) {
        // If any indirect dependency can't be resolved, continue
    }
}

/**
 * Returns a promise that resolves to an infotable that contains the entities that the given
 * entity depends on.
 * @param name      The entity whose dependencies should be retrieved.
 * @param kind      The kind of entity.
 * @returns         A promise that resolves with the infotable of dependencies.
 */
async function getEntityDependencies(name, kind): Promise<JSONInfoTable<EntityDependency>> {
    const response = await TWClient.getEntityDependencies(name, kind);
    if (response.statusCode != 200) {
        throw new Error(`Could not get the dependency list for entity ${kind}.${name}.\nServer returned status code ${response.statusCode}\nbody:\n${response.body}`);
    }

    return JSON.parse(response.body);
}


/**
 * Gets a listing of the entities in the given project, then writes a project declaration for the project in tw_imports.
 * @param name          The name of the project.
 * @returns             A promise that resolves with the infotable of entities in the project.
 */
 async function getProjectEntities(name: string): Promise<JSONInfoTable<{name: string, parentType: string, isSystemObject: boolean}>> {
    const response = await TWClient.getProjectEntities(name);
   
    if (response.statusCode != 200) {
        throw new Error(`Could not get the entity list for project ${name}.\nServer returned status code ${response.statusCode}\nbody:\n${response.body}`);
    }

    const body = JSON.parse(response.body);
    // Add the declaration for this project
    if (!fs.existsSync('./tw_imports/Projects/')) {
        fs.mkdirSync('./tw_imports/Projects/');
    }

    installedEntities.Projects = installedEntities.Projects || {};
    installedEntities.Projects[name] = true;

    fs.writeFileSync(`./tw_imports/Projects/${name}.d.ts`, `declare interface Projects { ${JSON.stringify(name)}: ProjectEntity; }`)

    return body;
}

/**
 * Retrieves the given extension's type definitions if available, otherwise gets all the entities in the extension
 * package and writes them to tw_imports.
 * @param name                      The name of the extension package.
 * @param slice                     A number that represents the amount of progress getting this extension package
 *                                  would contribute to the overall install progress.
 * @param installProgress           An install progress controller used to update the installation status.
 * @returns                         A promise that resolves when the operation completes.
 */
async function getExtension(name: string, slice: number, installProgress: InstallProgress): Promise<void> {
    // Extensions may optionally have a version number attached to them, remove that before processing
    if (name.indexOf(':') >= 0) {
        name = name.substring(0, name.indexOf(':'))
    }

    // Don't process if this extension was already imported.
    if (installedEntities.Extensions && installedEntities.Extensions[name]) {
        installProgress.progress += slice;
        return;
    }

    installProgress.entity = `Extensions/${name}/@types`;

    // Attempt to get the typings for the extension if they exist
    const typesResponse = await TWClient.getExtensionTypes(name);
    if (typesResponse.statusCode != 200 && typesResponse.statusCode != 404) {
        installProgress.progress += slice;
        throw new Error(`Could not get the extension details for ${name}.\nServer returned status code ${typesResponse.statusCode}\nbody:\n${typesResponse.body}`);
    }

    if (typesResponse.statusCode == 200) {
        // If the typings exist, write the .d.ts file directly.
        const definition = typesResponse.body;

        if (!fs.existsSync(`./tw_imports/Extensions/`)) {
            fs.mkdirSync(`./tw_imports/Extensions/`);
        }
    
        installedEntities.Extensions = installedEntities.Extensions || {};
        installedEntities.Extensions[name] = true;
    
        fs.writeFileSync(`./tw_imports/Extensions/${name}.d.ts`, definition);

        installProgress.progress += slice / 2;
    }

    installProgress.entity = `Extensions/${name}/Entities`;

    // Regardless of whether the type definitions existed, it is necessary to load the entity list
    // provided by the extension
    const detailsResponse = await TWClient.getExtensionPackageDetails(name);
    if (detailsResponse.statusCode != 200) {
        throw new Error(`Could not get the entity list for extension ${name}.\nServer returned status code ${detailsResponse.statusCode}\nbody:\n${detailsResponse.body}`);
    }

    const packageDetails = JSON.parse(detailsResponse.body);

    if (typesResponse.statusCode == 200) {
        // If the extension provided a definition, just mark the entities as imported
        for (const row of packageDetails.rows) {
            if (row.parentName == 'Resources' || row.parentName == 'ThingPackages' || row.parentName == 'Widgets') continue;

            installedEntities[row.parentName] = installedEntities[row.parentName] || {};
            installedEntities[row.parentName][row.name] = true;
        }

        installProgress.progress += slice / 2;
    }
    else {
        // Otherwise, each entity has to be loaded separately
        const entitiesToLoad = packageDetails.rows.filter(row => (row.parentName != 'Resources' && row.parentName != 'ThingPackages' && row.parentName != 'Widgets'));
        const entitySlice = slice / (entitiesToLoad.length + 1);
        installProgress.progress += entitySlice;

        for (const row of entitiesToLoad) {
            await getEntity(row.name, row.parentName, entitySlice, installProgress);
        }
    }
}


/**
 * Parses the given thing metadata and writes a thing class to tw_imports.
 * @param body          An entity metadata json that represents a thing.
 */
function importThing(body: any): void {
    const name = body.name;
    const sanitizedName = sanitizedEntityName(body.name);

    const declaration = TWMetadataParser.declarationOfThing(body, sanitizedName);

    // Write out the thing
    if (!fs.existsSync(`./tw_imports/Things/`)) {
        fs.mkdirSync(`./tw_imports/Things/`);
    }

    installedEntities.Things = installedEntities.Things || {};
    installedEntities.Things[name] = true;

    fs.writeFileSync(`./tw_imports/Things/${name}.d.ts`, `${declaration}\n\ndeclare interface Things {
    /**
     * ${body.description}
     */ 
    ${JSON.stringify(name)}: ${sanitizedName}; 
}`
    );
}

/**
 * Parses the given thing template metadata and writes a thing template class to tw_imports.
 * @param body      An entity metadata json that represents a template.
 */
function importThingTemplate(body: any): void {
    const name = body.name;
    const sanitizedName = sanitizedEntityName(body.name);

    const declaration = TWMetadataParser.declarationOfThingTemplate(body, sanitizedName);
    const hasGenericArgument = GenericThingPackages.includes(body.effectiveThingPackage);

    // Write out the thing template
    if (!fs.existsSync(`./tw_imports/ThingTemplates/`)) {
        fs.mkdirSync(`./tw_imports/ThingTemplates/`);
    }

    installedEntities.ThingTemplates = installedEntities.ThingTemplates || {};
    installedEntities.ThingTemplates[name] = true;

    fs.writeFileSync(`./tw_imports/ThingTemplates/${name}.d.ts`, `${declaration}\n\ndeclare interface ThingTemplates {
    /**
     * ${body.description}
     */ 
    ${JSON.stringify(name)}: ThingTemplateEntity<${sanitizedName}${hasGenericArgument ? '<any>' : ''}>; 
}`
    );
}


/**
 * Parses the given thing shape metadata and writes a thing shape class to tw_imports.
 * @param body      An entity metadata json that represents a shape.
 */
function importThingShape(body: any): void {
    const name = body.name;
    const sanitizedName = sanitizedEntityName(body.name);

    const declaration = TWMetadataParser.declarationOfThingShape(body, sanitizedName);

    // Write out the thing shape
    if (!fs.existsSync(`./tw_imports/ThingShapes/`)) {
        fs.mkdirSync(`./tw_imports/ThingShapes/`);
    }

    installedEntities.ThingShapes = installedEntities.ThingShapes || {};
    installedEntities.ThingShapes[name] = true;

    fs.writeFileSync(`./tw_imports/ThingShapes/${name}.d.ts`, `${declaration}\n\ndeclare interface ThingShapes {
    /**
     * ${body.description}
     */ 
    ${JSON.stringify(name)}: ThingShapeEntity<${sanitizedName}>; 
}`
    );
}


/**
 * Parses the given data shape metadata and writes a data shape class to tw_imports.
 * @param body      An entity metadata json that represents a data shape.
 */
function importDataShape(body: any): void {
    const name = body.name;
    const sanitizedName = sanitizedEntityName(body.name);

    const declaration = TWMetadataParser.declarationOfDataShape(body, sanitizedName);

    // Write out the data shape
    if (!fs.existsSync(`./tw_imports/DataShapes/`)) {
        fs.mkdirSync(`./tw_imports/DataShapes/`);
    }

    installedEntities.DataShapes = installedEntities.DataShapes || {};
    installedEntities.DataShapes[name] = true;

    fs.writeFileSync(`./tw_imports/DataShapes/${name}.d.ts`, `${declaration}\n\ndeclare interface DataShapes {
    /**
     * ${body.description}
     */ 
    ${JSON.stringify(name)}: DataShapeEntity<${sanitizedName}>; 
}`
    );
}

/**
 * Parses the given resource metadata and writes a resource class to tw_imports.
 * @param body      An entity metadata json that represents a resource.
 */
function importResource(body: any): void {
    const name = body.name;
    const sanitizedName = sanitizedEntityName(body.name);
    let declaration = TWMetadataParser.declarationOfResource(body, sanitizedName);

    // Write out the resource
    if (!fs.existsSync(`./tw_imports/Resources/`)) {
        fs.mkdirSync(`./tw_imports/Resources/`);
    }

    installedEntities.Resources = installedEntities.Resources || {};
    installedEntities.Resources[name] = true;

    fs.writeFileSync(`./tw_imports/Resources/${name}.d.ts`, `${declaration}\n\ndeclare interface Resources {
    /**
     * ${body.description}
     */ 
    ${JSON.stringify(name)}: ${sanitizedName}; 
}`
    );
}

/**
 * Writes a generic entity class to tw_imports with the given parameters.
 * @param name              The name of the entity.
 * @param kind              The kind of entity.
 * @param description       A description to use as the JSDoc documentation.
 * @param genericArgument   If specified, a generic argument to apply to the entity type.
 */
function importEntityDeclaration(name: string, kind: string, description: string, genericArgument?: string): void {
    if (!fs.existsSync(`./tw_imports/${kind}/`)) {
        fs.mkdirSync(`./tw_imports/${kind}/`);
    }

    installedEntities[kind] = installedEntities[kind] || {};
    installedEntities[kind][name] = true;

    fs.writeFileSync(`./tw_imports/${kind}/${name}.d.ts`, `declare interface ${kind} { 
    /**
     * ${description}
     */
    ${JSON.stringify(name)}: ${kind.substring(0, kind.length - 1)}Entity${genericArgument ? `<${genericArgument}>` : ''}; 
}`
    );
}