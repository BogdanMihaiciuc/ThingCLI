import * as ts from 'typescript';
import * as fs from 'fs';

/**
 * An interface that describes a project in a multi-project repository.
 */
export interface TSProject {

    /**
     * The project's name.
     */
    name: string;

    /**
     * The path to the project's root folder.
     */
    path: string;
}



/**
 * The interface for a project that contains its dependencies.
 */
 interface TSProjectWithNamedDependencies extends TSProject {

    /**
     * The projects on which this project depends.
     */
    parentProjects: (TSProjectWithNamedDependencies | string)[];
}

/**
 * The interface for a project that contains its dependencies.
 */
interface TSProjectWithDependencies extends TSProjectWithNamedDependencies {

    /**
     * The projects on which this project depends.
     */
    parentProjects: TSProjectWithDependencies[];
}

/**
 * A class that contains various utility methods making it easier
 * to interact with the typescript compuler API.
 */
export class TSUtilities {

    /**
     * Creates and returns a typescript program located at the given path.
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

        // Create the typescript project
        return ts.createProgram({options: config.options, rootNames: config.fileNames, configFileParsingDiagnostics: config.errors});
    }

    /**
     * Returns an array of objects, each identifying a project in a multi project repository.
     * @returns     An array of projects.
     */
    static projects(): TSProject[] {
        const projects: TSProject[] = [];
        const cwd = process.cwd();

        const srcContents = fs.readdirSync(`${cwd}/src`);

        // Get the contents of the src folder and include each directory that contains
        // a tsconfig file
        for (const projectName of srcContents) {
            const path = `${cwd}/src/${projectName}`;
            if (fs.lstatSync(path).isDirectory() && fs.existsSync(`${path}/tsconfig.json`)) {
                projects.push({name: projectName, path});
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
    static dependencySortedProjects(): TSProjectWithDependencies[] {
        // Get the dependencies of each project
        const projectsWithNamedDependencies: TSProjectWithNamedDependencies[] = this.projects().map(p => {
            // The dependent projects are specified in tsconfig
            const tsConfig = require(`${p.path}/tsconfig.json`);
            const includePaths = tsConfig.include as string[];

            // Include paths in the form of "../<ProjectName>"
            const parentProjects = includePaths.map(p => p.split('/')).filter(components => {
                if (components.length != 2) return false;
                if (components[0] != '..') return false;
                if (components[1].includes('*') || components[1].includes('.')) return false;

                return true;
            }).map(c => c[1]);

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

            p.parentProjects = dependentProjects as TSProjectWithDependencies[];
        });

        const projectsWithDependencies = projectsWithNamedDependencies as TSProjectWithDependencies[];

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
     * Ensures that the given folder structure exists, creating it if it doesn't.
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
}