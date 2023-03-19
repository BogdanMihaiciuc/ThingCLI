import * as ts from 'typescript';
import * as fs from 'fs';

/**
 * An enum that contains constants describing what kind of sources a project uses.
 */
export enum TWProjectKind {

    /** 
     * Indicates that the project is a typescript project that needs to be compiled and transformed into XML entities.
     */
    TypeScript,

    /**
     * Indicates that the proejct is an XML projects whose files can be directly imported into Thingworx.
     */
    XML,
} 

/**
 * An interface that describes a project in a multi-project repository.
 */
export interface TWProject {

    /**
     * The project's name.
     */
    name: string;

    /**
     * The path to the project's root folder.
     */
    path: string;

    /**
     * The type of project, determined by the presence of the tsconfig.json file
     */
    kind: TWProjectKind;
}

/**
 * The interface for a project that contains its dependencies.
 */
 interface TWProjectWithNamedDependencies extends TWProject {

    /**
     * The projects on which this project depends.
     */
    parentProjects: (TWProjectWithNamedDependencies | string)[];
}

/**
 * The interface for a project that contains its dependencies.
 */
export interface TWProjectWithDependencies extends TWProjectWithNamedDependencies {

    /**
     * The projects on which this project depends.
     */
    parentProjects: TWProjectWithDependencies[];
}

/**
 * A class that contains various utility methods making it easier
 * to interact with the typescript compiler API.
 */
export class TWProjectUtilities {

    /**
     * Creates and returns a typescript program located at the specified path.
     * @param path      The typescript's project path.
     * @param strict    When set to `true`, the `noEmitOnError` flag will be enabled.
     * @returns         A typescript program.
     */
    static programWithPath(path: string, strict = false): ts.Program {
        // Load the typescript configuration file
        const tsConfigFile = ts.findConfigFile(path, ts.sys.fileExists, 'tsconfig.json');
        if (!tsConfigFile) {
            throw new Error('tsconfig.json file not found.');
        }
        const {config: tsConfig} = ts.readConfigFile(tsConfigFile, ts.sys.readFile);
        const config = ts.parseJsonConfigFileContent(tsConfig, ts.sys, path);

        if (strict) {
            config.options.noEmitOnError = true;
        }

        const host = ts.createCompilerHost(config.options, true);

        // Create the typescript project
        return ts.createProgram({options: config.options, rootNames: config.fileNames, configFileParsingDiagnostics: config.errors, host});
    }

    /**
     * Returns an array of objects, each identifying a project in a multi project repository.
     * @returns     An array of projects.
     */
    static projects(): TWProject[] {
        const projects: TWProject[] = [];
        const cwd = process.cwd();

        const srcContents = fs.readdirSync(`${cwd}/src`);

        // Get the contents of the src folder and determine if each folder represents a project
        for (const projectName of srcContents) {
            const path = `${cwd}/src/${projectName}`;
            if (fs.lstatSync(path).isDirectory()) {
                if(fs.existsSync(`${path}/tsconfig.json`)) {
                    // If a tsconfig.json file is found, then the project contains typescript entities
                    projects.push({name: projectName, path, kind: TWProjectKind.TypeScript});
                } else if(fs.existsSync(`${path}/twconfig.json`)) {
                    // If only a twconfig.json is found, then assume it's XML only
                    projects.push({name: projectName, path, kind: TWProjectKind.XML});
                }
            }
        }

        return projects;
    }

    /**
     * Returns an array of objects, each identifying a project in a multi project repository,
     * sorted in order of dependencies, such that projects that depend on other projects appear
     * before the projects they depend on.
     * @returns     An array of projects and their dependencies.
     */
    static dependencySortedProjects(): TWProjectWithDependencies[] {
        // Get the dependencies of each project
        const projectsWithNamedDependencies: TWProjectWithNamedDependencies[] = this.projects().map(p => {
            // The list of projects this project depends on
            const parentProjects: string[] = [];

            if (p.kind == TWProjectKind.TypeScript) {
                // The dependent projects are specified in tsconfig
                const tsConfig = require(`${p.path}/tsconfig.json`);
                const includePaths = tsConfig.include as string[];

                // Include paths in the form of "../<ProjectName>"
                parentProjects.push(...includePaths.map(p => p.split('/')).filter(components => {
                    if (components.length != 2) return false;
                    if (components[0] != '..') return false;
                    if (components[1].includes('*') || components[1].includes('.')) return false;

                    return true;
                }).map(c => c[1]));
            } 

            return {...p, parentProjects};
        });

        // Convert the dependencies from an array of names to an array of project references
        projectsWithNamedDependencies.forEach(p => {
            // Throw for improperly configured relative paths, which lead to errors when importing
            const dependentProjects = p.parentProjects.map(dependency => {
                const dependentProject = projectsWithNamedDependencies.find(p2 => p2.name == dependency);

                if (!dependentProject) {
                    throw new Error(`Project "${p.name}" depends on project "${dependency}" which does not exist.`);
                }

                return dependentProject;
            });

            p.parentProjects = dependentProjects as TWProjectWithDependencies[];
        });

        const projectsWithDependencies = projectsWithNamedDependencies as TWProjectWithDependencies[];

        // Sort the projects such that projects that depend on other projects appear before them in the array
        projectsWithDependencies.sort((p1, p2) => {
            if (p2.parentProjects.includes(p1)) {
                // If p2 depends on p1, sort p2 before p1
                return 1;
            }
            else if (p1.parentProjects.includes(p2)) {
                // If p1 depends on p2, sort p1 before p2
                return -1;
            }

            // Otherwise their order doesn't matter
            return 0;
        });

        return projectsWithDependencies;
    }

    /**
     * Ensures that the specified folder structure exists, creating it if it doesn't.
     * @param path              The folder structure to create.
     * @param basePath          The base path. The target path must begin with this path.
     *                          This path's enclosing folder is expected to exist.
     */
    static ensurePath(path: string, basePath: string): void {
        if (!path.startsWith(basePath)) {
            throw new Error('The given path does not start with the provided base path.');
        }

        // Check and create the base path if needed
        if (!fs.existsSync(basePath)) fs.mkdirSync(basePath);

        // Split the remaining path into components
        const remainingComponents = path.substring(basePath.length).split('/').filter(p => p);

        // Check and create each subsequent path component
        let currentPath = basePath;
        let component;
        while (component = remainingComponents.shift()) {
            currentPath = `${currentPath}/${component}`;
            if (!fs.existsSync(currentPath)) fs.mkdirSync(currentPath);
        }
    }

    /**
     * Extracts the value of the projects argument from the specified command line arguments.
     * @param args      The command line arguments.
     * @returns         An array that contains the specified projects, if the `--projects` argument was specified,
     *                  `undefined` otherwise.
     */
    static projectsWithArguments(args: string[]): string[] | undefined {
        for (const arg of args) {
            if (arg.startsWith('--projects=')) {
                const projects = arg.substring('--projects='.length);

                if (!projects) {
                    throw new Error(`No projects have been specified.`);
                }

                return projects.split(',').map(p => p.trim()).filter(p => p);
            }
        }
    }
}