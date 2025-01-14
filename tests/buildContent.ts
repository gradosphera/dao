import { beginCell, Builder, Cell, Dictionary, Slice } from '@ton/core';
import { sha256Hash } from '../../wrappers/Helpers';

export type ProfitableAddressesData = {

};

export type PendingInvitationsData = {
};

export function buildPendingInvitationsContent(data: ProfitableAddressesData): Cell {

    const content = Dictionary.empty<bigint, Cell>();

    content.set(sha256Hash('category'), beginCell().storeUint(sha256Hash(data.category), 256).endCell());
    content.set(sha256Hash('can_approve_user'), beginCell().storeBit(data.canApproveUser).endCell());
    content.set(sha256Hash('can_revoke_user'), beginCell().storeBit(data.canRevokeUser).endCell());
    content.set(sha256Hash('nickname'), beginCell().storeStringTail(data.nickname).endCell());
    content.set(sha256Hash('about'), beginCell().storeStringTail(data.about).endCell());
    content.set(sha256Hash('website'), beginCell().storeStringTail(data.website).endCell());
    content.set(sha256Hash('portfolio'), beginCell().storeStringTail(data.portfolio).endCell());
    content.set(sha256Hash('resume'), beginCell().storeStringTail(data.resume).endCell());
    content.set(sha256Hash('specialization'), beginCell().storeStringTail(data.specialization).endCell());

    return beginCell().storeDictDirect(content, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell()).endCell();
}

export function buildPendingInvitationsContent(data: PendingInvitationsData): Cell {
    const content = Dictionary.empty<bigint, Cell>();
    content.set(sha256Hash('text'), beginCell().storeStringTail(data.text).endCell());
    content.set(sha256Hash('price'), beginCell().storeCoins(data.price).endCell());
    content.set(sha256Hash('deadline'), beginCell().storeUint(data.deadline, 32).endCell());

    return beginCell().storeDictDirect(content, Dictionary.Keys.BigUint(256), Dictionary.Values.Cell()).endCell();
}
