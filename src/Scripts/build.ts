import { TWThingTransformerFactory, TWConfig, TWThingTransformer, DiagnosticMessageKind, DiagnosticMessage, DeploymentEndpoint } from 'bm-thing-transformer';
import { randomUUID } from 'crypto';
import * as FS from 'fs';
import * as Path from 'path';
import { Builder, parseStringPromise } from 'xml2js';
import { TWProjectKind, TWProjectUtilities, TWProjectWithDependencies } from '../Utilities/TWProjectUtilities';
import ts from 'typescript';
import { ProgressBar } from '../Utilities/ProgressBar';
import readline from 'readline';

const [path, bin, command, ...args] = process.argv;

/**
 * Prints the specified diagnostic message to the console.
 * @param message   The message to print.
 */
function PrintDiagnosticMessage(message: DiagnosticMessage): void {
    let messageText: string;
    switch (message.kind) {
        case DiagnosticMessageKind.Error:
            messageText = (`🛑 \x1b[1;31mError\x1b[0m ${message.message}`);
            break;
        case DiagnosticMessageKind.Warning:
            messageText = (`🔶 \x1b[1;33mWarning\x1b[0m ${message.message}`);
            break;
        default:
            return;
    }

    // If a line and column position is specified, print out the relevant line
    if (message.line && message.file) {
        const text = FS.readFileSync(message.file, {encoding: 'utf-8'}).split('\n');
        const column = message.column || 0;
        const spaceBeforeCaret = message.line.toFixed().length + 2 + column;
        messageText = `\n\x1b[36m${message.file}\x1b[0m:\x1b[33m${message.line + 1}\x1b[0m:\x1b[33m${column + 1}\x1b[0m\n${messageText}\n\x1b[90m${message.line + 1}\x1b[0m ${text[message.line]}\n${new Array(spaceBeforeCaret).join(' ')}\x1b[31m^\x1b[0m\n`
    }

    console.log(messageText);
}

/**
 * Builds the thingworx entity xml files from the typescript project.
 * @returns             A promise that resolves with an array of deployment
 *                      endpoints when the operation completes.
 */
export async function build(): Promise<DeploymentEndpoint[]> {
    const cwd = process.cwd();

    // The array of deployment endpoints discovered while building
    const deploymentEndpoints: DeploymentEndpoint[] = [];

    // Load the twconfig file which contains compilation options.
    const twConfig = require(`${process.cwd()}/twconfig.json`) as TWConfig;
    const packageJSON = require(`${process.cwd()}/package.json`);

    // In multi project mode, a build mode should be specified, defaulting to separate if one is not provided
    const isMerged = args.includes('--merged');
    const isSeparate = args.includes('--separate') || !isMerged;

    // If the entity import flag is set, don't create the metadata.xml files and use source control imports
    const isEntityImport = args.includes("--entityImport") || args.includes("--entity-import") ;

    if (twConfig.projectName == '@auto') {
        // If both modes merged and separate are specified throw an error
        if (isMerged && isSeparate) {
            throw new Error(`🛑 \x1b[1;31mThe --merged and --separate arguments cannot be used together.\x1b[0m`);
        }
        // Having merged and entityImport specified makes no sense, since entityImport would end up ignored
        if (isMerged && isEntityImport) {
            throw new Error(`🛑 \x1b[1;31mThe --entityImport and --merged arguments cannot be used together.\x1b[0m`);
        }
    }

    // If the debug flag is specified, apply it to the config
    const isDebugBuild = args.includes('--debug');
    twConfig.debug = isDebugBuild;

    // If the trace flag is specified, apply it to the config
    const isTraceBuild = args.includes('--trace');
    twConfig.trace = isTraceBuild;

    // Clear the build output folder to remove any entities which may have been removed from the project
    if (FS.existsSync(`${cwd}/build`)) {
        FS.rmSync(`${cwd}/build`, {force: true, recursive: true});
    }

    if (twConfig.projectName == '@auto') {
        // If running in multi-project mode, run against each project separately
        const baseOutPath = `${cwd}/build`;

        // Before starting a build, ensure that the base out path exists
        if (!FS.existsSync(baseOutPath)) FS.mkdirSync(baseOutPath)

        for (const p of TWProjectUtilities.dependencySortedProjects()) {
            // For merged builds, everything ends up in the same extension while for
            // separate builds, each project is its own extension
            const outPath = isMerged ? baseOutPath : `${baseOutPath}/${p.name}`;
            await buildProject(p, outPath);
        }
    }
    else {
        // If running in single project mode, run against the whole repository, and assume it's typescript
        const outPath = `${cwd}/build`;
        buildProject({ name: twConfig.projectName, path: cwd, kind: TWProjectKind.TypeScript, parentProjects: [] }, outPath);
    }

    /**
     * Builds the project at the given path.
     * @param project           Information about the project
     * @param outPath           The project's target path.
     */
    async function buildProject(project: TWProjectWithDependencies, outPath: string): Promise<void> {
        // Ensure the outpath exists
        if (!FS.existsSync(outPath)) {
            FS.mkdirSync(outPath);
        }

        // Create a new store for each project
        twConfig.store = {};

        process.stdout.write(`\x1b[2m❯\x1b[0m Building ${project.name || 'project'}`);

        let tsConfig: any;
        if (FS.existsSync(`${project.path}/tsconfig.json`)) {
            tsConfig = require(`${project.path}/tsconfig.json`);
        }

        // Measure the time it takes to build
        const timeStart = process.hrtime();

        let formattedDiagnostics = '';
        const diagnosticMessages: DiagnosticMessage[] = []
    
        if (project.kind == TWProjectKind.TypeScript) {
            // Create the typescript project and emit using both transformers
            const program = TWProjectUtilities.programWithPath(project.path, true);

            // Display a progress bar that tracks the compilation progress on the next line
            process.stdout.write('\n');

            // The total count of files to be processed will be the number of files that don't
            // end in d.ts
            const total = program.getRootFileNames().filter(f => !f.endsWith('.d.ts')).length;
            let current = 0;

            const progress = new ProgressBar;
            progress.start();
            progress.update(0, 'Preparing project...');

            // Set up the callbacks for when the transformer starts and finishes transforming
            // files, used to advance the progress bar
            twConfig.transformerWillStartFile = function (file: string): void {
                const name = file.split('/').at(-1);
                progress.update(current / total, name || file);
            };

            twConfig.transformerDidFinishFile = function (file: string): void {
                current++;
                const name = file.split('/').at(-1);
                progress.update(current / total, name || file);
            };

            // Apply the transformers
            const emitResult = program.emit(undefined, () => {}, undefined, undefined, {
                before: [
                    TWThingTransformerFactory(program, project.path, false, false, twConfig)
                ],
                after: [
                    TWThingTransformerFactory(program, project.path, true, false, twConfig)
                ]
            });

            // Clear the progress bar and move the cursor back to the previous line
            progress.destroy();
            readline.moveCursor(process.stdout, 0, -1);
            readline.clearLine(process.stdout, 1);
            readline.moveCursor(process.stdout, 0, -1);

            // Get and store all diagnostic messages generated by typescript to display them when the task
            // finishes
            const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
            const defaultFormatHost: ts.FormatDiagnosticsHost = {
                getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
                getCanonicalFileName: fileName => fileName,
                getNewLine: () => ts.sys.newLine
            };

            formattedDiagnostics = ts.formatDiagnosticsWithColorAndContext(allDiagnostics, defaultFormatHost);

            // If an error causes a compilation failure, display the diagnostic messages and fail
            if (emitResult.emitSkipped) {
                process.stdout.write(`\r\x1b[1;31m✖\x1b[0m Failed building ${project.name || 'project'}\n`);

                console.log(formattedDiagnostics);

                throw new Error('Compilation failed.');
            }

            // Validate thingworx-specific constraints
            for (const key in twConfig.store) {
                if (key.startsWith('@')) continue;

                const transformer = twConfig.store[key];
                transformer.firePostTransformActions();
            }

            const diagnosticMessages = twConfig.store['@diagnosticMessages'] as unknown as DiagnosticMessage[] || [];

            // If any errors were reported, display them and fail
            if (diagnosticMessages.some(m => m.kind == DiagnosticMessageKind.Error)) {
                process.stdout.write(`\r\x1b[1;31m✖\x1b[0m Failed building ${project.name || 'project'}\n`);

                for (const message of diagnosticMessages) {
                    PrintDiagnosticMessage(message);
                }

                throw new Error('Validation failed.');
            }

            // Store an array of all transformers created, to be used to extract
            // debug information for the whole project
            const transformers: TWThingTransformer[] = [];

            // Write out the entity XML files
            for (const key in twConfig.store) {
                if (key.startsWith('@')) continue;

                // Write the entity XML
                const transformer = twConfig.store[key];
                transformer.write(outPath);

                // Store any declared deployment endpoints
                if (transformer.deploymentEndpoints.length) {
                    deploymentEndpoints.push(...transformer.deploymentEndpoints);
                }

                transformers.push(transformer);
            }

            // If project entity generation is enabled, create and write the project entity
            if (twConfig.generateProjectEntity) {
                const projectEntity = projectEntityNamed(project, twConfig);

                // Write the debug entity in the appropriate subfolder
                TWProjectUtilities.ensurePath(`${outPath}/Entities/Projects`, outPath);
                FS.writeFileSync(`${outPath}/Entities/Projects/${project.name}.xml`, projectEntity);
            }

            // If this is a debug build, create a notifier thing that informs the debugger runtime that new source files are available
            if (isDebugBuild) {
                // Generate a random name for the debug entity and get its contents from the transformer
                const debugEntityName = randomUUID();
                const debugEntity = TWThingTransformer.projectDebugThingXML(debugEntityName, transformers, project.name);
                
                // Write the debug entity in the appropriate subfolder
                TWProjectUtilities.ensurePath(`${outPath}/Entities/Things`, outPath);
                FS.writeFileSync(`${outPath}/Entities/Things/${debugEntityName}.xml`, debugEntity);
            }
        }


        // Emit the metadata.xml for typescript projects and for xml projects with entity import is disabled
        if (project.kind == TWProjectKind.TypeScript || (!isEntityImport && project.kind == TWProjectKind.XML)) {
            // Copy and update the metadata file
            const metadataFile = FS.readFileSync(`${process.cwd()}/metadata.xml`, 'utf8');
            const metadataXML = await parseStringPromise(metadataFile);

            // In multi project mode, for separate builds, append the project name to the package name
            let packageName = packageJSON.name;
            if (isSeparate && twConfig.projectName == '@auto') {
                packageName += `-${project.name}`;
            }

            const extensionPackage = metadataXML.Entities.ExtensionPackages[0].ExtensionPackage[0];
            extensionPackage.$.name = packageName;
            if (packageJSON.author) {
                extensionPackage.$.vendor = packageJSON.author;
            }
            extensionPackage.$.minimumThingWorxVersion = twConfig.minimumThingWorxVersion || packageJSON.minimumThingWorxVersion || '9.0.0';
            // For the package version, omit any beta or alpha suffix
            extensionPackage.$.packageVersion = packageJSON.version.split('-')[0];
            extensionPackage.$.description = packageJSON.description;
            extensionPackage.$.buildNumber = JSON.stringify({gitHubURL: packageJSON.autoUpdate?.gitHubURL || ''});

            const builder = new Builder();
            const outXML = builder.buildObject(metadataXML);

            FS.writeFileSync(`${outPath}/metadata.xml`, outXML);
        }

        // If entity copying is enabled, look for XML files in the project path and copy them to the build directory
        if (twConfig.copyEntities) {
            process.stdout.write(`\x1b[2m❯\x1b[0m Copying ${project.name || 'project'} entities`);

            /**
             * Finds and copies any XML files in the specified directory to the project's
             * build directory. Recursively looks into any subdirectories.
             * @param path      The path in which to start looking for XML files.
             */
            function copyXMLFilesInDirectory(path: string): void {
                // Get all files in the directory
                const files = FS.readdirSync(path);

                for (const file of files) {
                    const filePath = Path.join(path, file);
                    // Recursively look into subdirectories
                    if (FS.statSync(filePath).isDirectory()) {
                        copyXMLFilesInDirectory(filePath);
                        continue;
                    }

                    // If the file is an xml, copy it to the build directory
                    if (file.toLowerCase().endsWith('.xml')) {
                        FS.cpSync(filePath, `${outPath}/Entities/${file}`);
                    }
                }
            }

            // Copy any XML files to the build directory
            copyXMLFilesInDirectory(Path.join(project.path, 'src'));
            readline.clearLine(process.stdout, -1);
            process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Copied ${project.name || 'project'} entities  \n`);
        }

        const timeEnd = process.hrtime();
        const duration = (timeEnd[0] + timeEnd[1] / 1_000_000_000 - timeStart[0] - timeStart[1] / 1_000_000_000)
        process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Built ${project.name || 'project'} in \x1b[1;32m${duration.toFixed(1)}s\x1b[0m${formattedDiagnostics.length ? ` (with warnings):` : '     '}\n`);

        // Write out the diagnostic messages at the end of the task
        if (formattedDiagnostics) {
            console.log(formattedDiagnostics);
        }

        // If any validation errors were reported, display them at the end of the task
        for (const message of diagnosticMessages) {
            PrintDiagnosticMessage(message);
        }
    }
    return deploymentEndpoints;
}

/**
 * Creates and returns an XML string containing a project entity with the given name.
 * @param project       Information about the project.
 * @param twConfig      The twconfig.json file containing the project's dependencies.
 * @returns             A string.
 */
function projectEntityNamed(project: TWProjectWithDependencies, twConfig: TWConfig) {
    const builder = new Builder();
    const dependencies = {extensions: '', projects: ''};

    if (twConfig.includeProjectDependencies) {
        dependencies.extensions = (twConfig.extensionDependencies || []).join(',');
        dependencies.projects = (twConfig.projectDependencies || []).join(',');

        // If this is a sub-project, include any other sub-projects referenced in "include"
        if (project.parentProjects.length) {
            if (dependencies.projects.length) {
                dependencies.projects += ',' + project.parentProjects.join(',');
            }
            else {
                dependencies.projects = project.parentProjects.join(',');
            }
        }
        
    }

    const projectEntity = {
        Entities: {
            Projects: [
                {
                    Project: [
                        {
                            $: {
                                artifactId: "",
                                "aspect.projectType": "Component",
                                dependsOn: JSON.stringify(dependencies),
                                description: "",
                                documentationContent: "",
                                groupId: "",
                                homeMashup: "",
                                minPlatformVersion: "",
                                name: project.name,
                                packageVersion: "1.0.0",
                                projectName: project.name,
                                publishResult: "",
                                state: "DRAFT",
                                tags: "",
                            },
                        },
                    ],
                },
            ],
        },
    };

    return builder.buildObject(projectEntity);
}