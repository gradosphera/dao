import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type DaoMasterConfig = {
    OwnerAddress: Address;
    DaoCode: Cell;
    NextDaoCreationFee: number | bigint;
    NextDaoTransactionFee: number | bigint;
    NextDaoCreationFeeDiscount: number | bigint;
    NextDaoTransactionFeeIncrease: number | bigint;
    MaxDaoTransactionFee: number | bigint;
    BlagoSeller: Cell;
    BlagoSellerCreationFee: number | bigint;
};

export function serializeDaoMasterConfigToCell(config: DaoMasterConfig): Cell {
    return beginCell()
        .storeAddress(config.OwnerAddress)
        .storeRef(config.DaoCode)
        .storeCoins(config.NextDaoCreationFee)
        .storeCoins(config.NextDaoTransactionFee)
        .storeCoins(config.NextDaoCreationFeeDiscount)
        .storeCoins(config.NextDaoTransactionFeeIncrease)
        .storeCoins(config.MaxDaoTransactionFee)
        .storeRef(config.BlagoSeller)
        .storeUint(0, 32)
        .storeCoins(config.BlagoSellerCreationFee)
        .endCell();
}

export class DaoMaster implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new DaoMaster(address);
    }

    static createFromConfig(config: DaoMasterConfig, code: Cell, workchain = 0) {
        const data = serializeDaoMasterConfigToCell(config);
        const init = { code, data };
        return new DaoMaster(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendDeployDao(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    async getDaoAddressByDeployerAddress(provider: ContractProvider, deployer_address: Address): Promise<Address> {
        const result = await provider.get('get_dao_address_by_deployer_address', [
            { type: 'slice', cell: beginCell().storeAddress(deployer_address).endCell() },
        ]);
        return result.stack.readAddress();
    }

    async getBlagoSellerAddressByIndex(provider: ContractProvider, index: bigint): Promise<Address> {
        const result = await provider.get('get_blago_seller_address_by_index', [{ type: 'int', value: index }]);
        return result.stack.readAddress();
    }
}
