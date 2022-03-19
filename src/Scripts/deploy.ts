import { TWClient } from '../Utilities/TWClient';

/**
 * Invokes the given array of deployment endpoints.
 * @param endpoints         The endpoints to invoke.
 * @returns                 A promise that resolves when this operation finishes.
 */
export async function deploy(endpoints: string[]): Promise<void> {
    for (const endpoint of endpoints) {
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
}