import { Address, DictionaryValue } from "@ton/core"

export type DaoDictType = {
    daoMemberAddress: Address;
    voteStrength: number;
    revenueShare: bigint;
    canPropose: number;
}

export const DaoDictValue: DictionaryValue<DaoDictType> = {
    serialize(src, builder) {
        builder.storeAddress(src.daoMemberAddress)
        builder.storeUint(src.voteStrength, 32)
        builder.storeUint(src.revenueShare, 64)
        builder.storeUint(src.canPropose, 1)
    },
    parse() {
        return {
            daoMemberAddress: new Address(0, Buffer.alloc(32)),
            voteStrength: 0,
            revenueShare: 0n,
            canPropose: 0,
        }
    }
};