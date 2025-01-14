import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { DAO } from '../wrappers/DAO';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('DAO', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('DAO');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let dAO: SandboxContract<DAO>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        dAO = blockchain.openContract(DAO.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await dAO.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: dAO.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and dAO are ready to use
    });
});
