import { toNano } from '@ton/core';
import { DAO } from '../wrappers/DAO';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const dAO = provider.open(DAO.createFromConfig({}, await compile('DAO')));

    await dAO.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(dAO.address);

    // run methods on `dAO`
}
