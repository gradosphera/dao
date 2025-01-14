import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type DAOConfig = {};

export function dAOConfigToCell(config: DAOConfig): Cell {
    return beginCell().endCell();
}

export class DAO implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new DAO(address);
    }

    static createFromConfig(config: DAOConfig, code: Cell, workchain = 0) {
        const data = dAOConfigToCell(config);
        const init = { code, data };
        return new DAO(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
