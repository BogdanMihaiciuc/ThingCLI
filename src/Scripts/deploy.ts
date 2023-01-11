import { DeploymentEndpoint, TWEntityKind } from 'bm-thing-transformer/dist/@types';
import { TWClient } from '../Utilities/TWClient';

/**
 * Invokes the given array of deployment endpoints.
 * @param endpoints         The endpoints to invoke.
 * @returns                 A promise that resolves when this operation finishes.
 */
export async function deploy(endpoints: DeploymentEndpoint[]): Promise<void> {
    for (const endpoint of endpoints) {
        switch (endpoint.kind) {
            case TWEntityKind.Thing:
                // For things, invoke the service directly
                await invokeEndpoint(`Things/${endpoint.name}/Services/${endpoint.service}`);
                break;
            case TWEntityKind.ThingTemplate:
            case TWEntityKind.ThingShape:
                // For templates and shapes, invoke the service on all things that inherit from it
                try {
                    const response = await TWClient.invokeEndpoint(`${endpoint.kind}s/${endpoint.name}/Services/GetImplementingThings`);
                    if (response.statusCode != 200) {
                        process.stdout.write(`\x1b[1;31m✖\x1b[0m Deployment script \x1b[1m${endpoint.service}\x1b[0m failed for ${endpoint.kind} ${endpoint.name}: \n`);
                        console.log(response.body);
                    }
                    else {
                        const result = JSON.parse(response.body);
                        for (const row of result.rows) {
                            await invokeEndpoint(`Things/${row.name}/Services/${endpoint.service}`);
                        }
                    }
                }
                catch (err) {
                    process.stdout.write(`\x1b[1;31m✖\x1b[0m Deployment script \x1b[1m${endpoint.service}\x1b[0m failed for ${endpoint.kind} ${endpoint.name}: \n`);
                    console.log(err);
                }
                break;
            default:
                process.stdout.write(`\x1b[1;31m✖\x1b[0m Skipping unsupported deployment script \x1b[1m${endpoint.service}\x1b[0m for entity kind "${endpoint.kind}". \n`);
                break;
        }
    }
}

async function invokeEndpoint(endpoint: string): Promise<void> {
    process.stdout.write(`\x1b[2m❯\x1b[0m Running deployment script \x1b[1m${endpoint}\x1b[0m`);
    try {
        const response = await TWClient.invokeEndpoint(endpoint);
        if (response.statusCode != 200) {
            process.stdout.write(`\r\x1b[1;31m✖\x1b[0m Deployment script \x1b[1m${endpoint}\x1b[0m failed:       \n`);
            console.log(response.body);
        }
        else {
            process.stdout.write(`\r\x1b[1;32m✔\x1b[0m Deployment script \x1b[1m${endpoint}\x1b[0m ran successfully\n`);
        }
    }
    catch (err) {
        process.stdout.write(`\r\x1b[1;31m✖\x1b[0m Deployment script \x1b[1m${endpoint}\x1b[0m failed:       \n`);
        console.log(err);
    }
}