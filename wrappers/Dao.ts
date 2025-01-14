import {
    Address,
    beginCell,
    Builder,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    DictionaryValue,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';
import { DaoInternalOperations, DaoMasterOperationCodes, DaoOperationCodes, DaoTransactionTypes } from './Config';
import { Slice } from '@ton/core';

export type DaoData = {
    active: number | bigint;
    root_address: Address;
    deployer_address: Address;
    transaction_fee: number | bigint;
    agreement_percent_numerator: number | bigint;
    agreement_percent_denominator: number | bigint;
    profit_reserve_percent_numerator: number | bigint;
    profit_reserve_percent_denominator: number | bigint;
    profitable_addresses: Cell | null;
    pending_invitations: Cell | null;
    pending_transactions: Cell | null;
    authorized_addresses: Cell | null;
    total_approval_blago: number | bigint;
    total_profit_blago: number | bigint;
    total_profit_reserved: number | bigint;
};

export type DaoConfig = {
    Active: number;
    RootAddress: Address;
    DeployerAddressSHA256: bigint;
};

export function serializeDaoConfigToCell(config: DaoConfig): Cell {
    return beginCell()
        .storeUint(config.Active, 1) // false value
        .storeAddress(config.RootAddress)
        .storeUint(config.DeployerAddressSHA256, 256)
        .endCell();
}

export type PendingInvitationsData = {
    authorized_address: Address;
    approval_blago: number | bigint;
    profit_blago: number | bigint;
};

export type PendingTransactionsData = {
    transaction_type: number | bigint;
    deadline: number | bigint;
    transaction_info: Cell;
    approvals: Cell | null;
    approval_blago_recieved: number | bigint;
};

export type AuthorizedAddressData = {
    authorized_address: Address;
    approval_blago: number | bigint;
    profit_blago: number | bigint;
    approved_transactions: Cell | null;
};

export function createPendingInvitationsData(): DictionaryValue<PendingInvitationsData> {
    return {
        serialize(src: PendingInvitationsData, builder: Builder) {
            builder.storeAddress(src.authorized_address);
            builder.storeUint(src.approval_blago, 32);
            builder.storeUint(src.profit_blago, 32);
        },
        parse: (src: Slice) => {
            return {
                authorized_address: src.loadAddress(),
                approval_blago: src.loadUint(32),
                profit_blago: src.loadUint(32),
            };
        },
    };
}

export class Dao implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Dao(address);
    }

    static createFromConfig(config: DaoConfig, code: Cell, workchain = 0) {
        const data = serializeDaoConfigToCell(config);
        const init = { code, data };
        return new Dao(contractAddress(workchain, init), init);
    }

    // Activate A Dao

    async sendActivateDao(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        AgreementPercentNumerator: bigint | number,
        AgreementPercentDenominator: bigint | number,
        ProfitReservePercentNumerator: bigint | number,
        ProfitReservePercentDenominator: bigint | number,
        ProfitableAddresses: Cell,
        PendingInvitations: Cell,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ActivateDao, 32)
                .storeUint(AgreementPercentNumerator, 32)
                .storeUint(AgreementPercentDenominator, 32)
                .storeUint(ProfitReservePercentNumerator, 32)
                .storeUint(ProfitReservePercentDenominator, 32)
                .storeMaybeRef(ProfitableAddresses)
                .storeMaybeRef(PendingInvitations)
                .endCell(),
        });
    }

    // General

    async sendTopUpBalance(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
        });
    }

    async sendAcceptInvitationToDao(provider: ContractProvider, via: Sender, value: bigint, Passcode: bigint | number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(DaoOperationCodes.AcceptInvitationToDao, 32).storeUint(Passcode, 32).endCell(),
        });
    }

    async sendQuitDao(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(DaoOperationCodes.QuitDao, 32).endCell(),
        });
    }

    async sendChangeMyAddress(provider: ContractProvider, via: Sender, value: bigint, NewAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(DaoOperationCodes.ChangeMyAddress, 32).storeAddress(NewAddress).endCell(),
        });
    }

    async sendFundsToCollect(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(DaoInternalOperations.CollectFunds, 32).endCell(),
        });
    }

    // Propose transaction

    async sendProposeInviteAddress(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        // cell transaction_info
        AddressToInvite: Address,
        Approvalblago: number | bigint,
        Profitblago: number | bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.InviteAddress, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell()
                        .storeAddress(AddressToInvite)
                        .storeUint(Approvalblago, 32)
                        .storeUint(Profitblago, 32)
                        .endCell(),
                )
                .endCell(),
        });
    }

    async sendProposeDeleteAddress(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        // cell transaction_info
        AddressToDelete: Address,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.DeleteAddress, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell().storeAddress(AddressToDelete).endCell(),
                )
                .endCell(),
        });
    }

    async sendProposeSendCollectFunds(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        ProfitableAddressPasscode: number | bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.SendCollectFunds, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell().storeUint(ProfitableAddressPasscode, 32).endCell(),
                )
                .endCell(),
        });
    }

    async sendProposeDistributeTon(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        DistributionAmount: number | bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.DistributeTon, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell().storeCoins(DistributionAmount).endCell(),
                )
                .endCell(),
        });
    }

    async sendProposeArbitraryTransaction(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        Destination: Address,
        Amount: number | bigint,
        MsgBody: Cell,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.ArbitraryTransaction, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell().storeAddress(Destination).storeCoins(Amount).storeRef(MsgBody).endCell(),
                )
                .endCell(),
        });
    }

    async sendProposeUpdateAgreementPercent(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        AgreementPercentNumerator: number | bigint,
        AgreementPercentDenumerator: number | bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.UpdateAgreementPercent, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell()
                        .storeUint(AgreementPercentNumerator, 32)
                        .storeUint(AgreementPercentDenumerator, 32)
                        .endCell(),
                )
                .endCell(),
        });
    }

    async sendProposeTransferblago(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        Recipient: Address,
        Approvalblago: number | bigint,
        Profitblago: number | bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.TransferBlago, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell()
                        .storeAddress(Recipient)
                        .storeUint(Approvalblago, 32)
                        .storeUint(Profitblago, 32)
                        .endCell(),
                )
                .endCell(),
        });
    }

    async sendPutUpblagoForSale(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        blagoBuyer: Address,
        Price: number | bigint,
        ApprovalblagoForSale: number | bigint,
        ProfitblagoForSale: number | bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.PutUpBlagoForSale, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell()
                        .storeAddress(blagoBuyer)
                        .storeCoins(Price)
                        .storeUint(ApprovalblagoForSale, 32)
                        .storeUint(ProfitblagoForSale, 32)
                        .endCell(),
                )
                .endCell(),
        });
    }

    async sendProposeDeletePendingInvitations(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        PendingInvitationsForRemoval: Cell,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.DeletePendingTransactions, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell().storeMaybeRef(PendingInvitationsForRemoval).endCell(),
                )
                .endCell(),
        });
    }

    async sendProposeDeletePendingTransactions(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        Deadline: number | bigint,
        PendingTransactionsForRemoval: Cell,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ProposeTransaction, 32)
                .storeUint(DaoTransactionTypes.DeletePendingTransactions, 32)
                .storeUint(Deadline, 32)
                .storeRef(
                    // cell transaction_info
                    beginCell().storeMaybeRef(PendingTransactionsForRemoval).endCell(),
                )
                .endCell(),
        });
    }

    // Approve transaction

    async sendApprove(provider: ContractProvider, via: Sender, value: bigint, TransactionIndex: number | bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(DaoOperationCodes.ApproveTransaction, 32)
                .storeUint(TransactionIndex, 32)
                .endCell(),
        });
    }

    // Get-methods

    async getDaoStatus(provider: ContractProvider): Promise<number> {
        const result = await provider.get('get_dao_status', []);
        return result.stack.readNumber(); // int1 active?
    }

    async getPendingInvitationData(provider: ContractProvider, passcode: bigint): Promise<PendingInvitationsData> {
        const result = await provider.get('get_pending_invitation_data', [{ type: 'int', value: passcode }]);

        const authorized_address = result.stack.readAddress();
        const approval_blago = result.stack.readBigNumber();
        const profit_blago = result.stack.readBigNumber();

        return {
            authorized_address,
            approval_blago,
            profit_blago,
        };
    }

    async getPendingTransactionsData(provider: ContractProvider, key: bigint): Promise<PendingTransactionsData> {
        const result = await provider.get('get_pending_transaction_data', [{ type: 'int', value: key }]);

        const transaction_type = result.stack.readBigNumber();
        const deadline = result.stack.readBigNumber();
        const transaction_info = result.stack.readCell();
        const approvals = result.stack.readCellOpt();
        const approval_blago_recieved = result.stack.readBigNumber();

        return {
            transaction_type,
            deadline,
            transaction_info,
            approvals,
            approval_blago_recieved,
        };
    }

    async getAuthorizedAddressData(
        provider: ContractProvider,
        authorized_address_cell: Cell,
    ): Promise<AuthorizedAddressData> {
        const result = await provider.get('get_authorized_address_data', [
            { type: 'cell', cell: authorized_address_cell },
        ]);

        const authorized_address = result.stack.readAddress();
        const approval_blago = result.stack.readBigNumber();
        const profit_blago = result.stack.readBigNumber();
        const approved_transactions = result.stack.readCellOpt();

        return {
            authorized_address,
            approval_blago,
            profit_blago,
            approved_transactions,
        };
    }

    async getDaoData(provider: ContractProvider): Promise<DaoData> {
        const result = await provider.get('get_dao_data', []);

        const active = result.stack.readNumber();
        const root_address = result.stack.readAddress();
        const deployer_address = result.stack.readAddress();
        const transaction_fee = result.stack.readBigNumber();
        const agreement_percent_numerator = result.stack.readBigNumber();
        const agreement_percent_denominator = result.stack.readBigNumber();
        const profit_reserve_percent_numerator = result.stack.readBigNumber();
        const profit_reserve_percent_denominator = result.stack.readBigNumber();
        const profitable_addresses = result.stack.readCellOpt();
        const pending_invitations = result.stack.readCellOpt();
        const pending_transactions = result.stack.readCellOpt();
        const authorized_addresses = result.stack.readCellOpt();
        const total_approval_blago = result.stack.readBigNumber();
        const total_profit_blago = result.stack.readBigNumber();
        const total_profit_reserved = result.stack.readBigNumber();

        return {
            active,
            root_address,
            deployer_address,
            transaction_fee,
            agreement_percent_numerator,
            agreement_percent_denominator,
            profit_reserve_percent_numerator,
            profit_reserve_percent_denominator,
            profitable_addresses,
            pending_invitations,
            pending_transactions,
            authorized_addresses,
            total_approval_blago,
            total_profit_blago,
            total_profit_reserved,
        };
    }
}
