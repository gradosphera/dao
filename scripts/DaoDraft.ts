import { Address, beginCell, toNano, Builder, Cell, Dictionary, Slice } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { sha256Hash } from '../tests/utils/Helpers';

enum Operations {
    'build profitable_addresses dict' = 1,
    'build pending_invitations dict',
}

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const operation = await ui.choose('Operation:', ['1', '2'], (v: string) => Operations[parseInt(v)]);
    switch (parseInt(operation)) {
        case 1:
            await buildProfitableAddressesContent(provider);
            break;
        case 2:
            await buildPendingInvitationsContent(provider);
            break;
    }
}

async function buildProfitableAddressesContent(provider: NetworkProvider) {
    const ui = provider.ui();

    const addresses_number = await ui.input('Enter the number of addresses you will extract profit from');

    const ProfitableAddressesDict = Dictionary.empty<bigint, Cell>();

    for (let i = 0; i < +addresses_number; i += 1) {
        const address = await ui.input('');

        ProfitableAddressesDict.set(
            sha256Hash(address),
            beginCell().storeAddress(Address.parseFriendly(address).address).endCell(),
        );
    }

    return ui.write(
        beginCell()
            .storeDictDirect(ProfitableAddressesDict, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
            .endCell()
            .toBoc()
            .toString('hex'),
    );
}

async function buildPendingInvitationsContent(provider: NetworkProvider) {
    const ui = provider.ui();

    const addresses_number = await ui.input('Enter the number of addresses you want to invite to dao');

    const PendingInvitationsDict = Dictionary.empty<bigint, Cell>();

    for (let i = 0; i < +addresses_number; i += 1) {
        const address = await ui.input('');
        const approval_blago = await ui.input('');
        const profit_blago = await ui.input('');

        PendingInvitationsDict.set(
            BigInt(i),
            beginCell()
                .storeAddress(Address.parseFriendly(address).address)
                .storeUint(+approval_blago, 32)
                .storeUint(+profit_blago, 32)
                .endCell(),
        );
    }

    return ui.write(
        beginCell()
            .storeDictDirect(PendingInvitationsDict, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
            .endCell()
            .toBoc()
            .toString('hex'),
    );
}
