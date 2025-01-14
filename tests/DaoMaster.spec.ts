import {
    Blockchain,
    BlockchainSnapshot,
    internal,
    SandboxContract,
    TreasuryContract,
    printTransactionFees,
} from '@ton/sandbox';
import { beginCell, Cell, Dictionary, Slice, toNano } from '@ton/core';
import { DaoMaster } from '../wrappers/DaoMaster';
import { Dao } from '../wrappers/Dao';
import { BlagoSeller } from '../wrappers/BlagoSeller';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { DaoInternalOperations, DaoOperationCodes, BlagoSellerOperations } from '../wrappers/Config';
import { createSliceValue } from './utils/Helpers';

describe('DaoMaster', () => {
    const blockchainStartTime = 100;

    let blockchain: Blockchain;

    let DaoMaster: SandboxContract<DaoMaster>;
    let firstDao: SandboxContract<Dao>;
    let secondDao: SandboxContract<Dao>;
    let deployer: SandboxContract<TreasuryContract>;
    let wallet0: SandboxContract<TreasuryContract>;
    let wallet1: SandboxContract<TreasuryContract>;
    let wallet2: SandboxContract<TreasuryContract>;
    let wallet3: SandboxContract<TreasuryContract>;
    let wallet4: SandboxContract<TreasuryContract>;
    let wallet5: SandboxContract<TreasuryContract>;
    let wallet6: SandboxContract<TreasuryContract>;
    let profitableAddress: SandboxContract<TreasuryContract>;

    let DaoMasterCode: Cell;
    let DaoCode: Cell;
    let BlagoSellerCode: Cell;

    beforeAll(async () => {
        DaoMasterCode = await compile('DaoMaster');
        DaoCode = await compile('Dao');
        BlagoSellerCode = await compile('BlagoSeller');

        blockchain = await Blockchain.create();
        blockchain.now = blockchainStartTime;

        deployer = await blockchain.treasury('deployer');
        wallet0 = await blockchain.treasury('wallet0');
        wallet1 = await blockchain.treasury('wallet1');
        wallet2 = await blockchain.treasury('wallet2');
        wallet3 = await blockchain.treasury('wallet3');
        wallet4 = await blockchain.treasury('wallet4');
        wallet5 = await blockchain.treasury('wallet5');
        wallet6 = await blockchain.treasury('wallet5');
        profitableAddress = await blockchain.treasury('profitableAddress');

        // Params

        DaoMaster = blockchain.openContract(
            DaoMaster.createFromConfig(
                {
                    OwnerAddress: deployer.address,
                    DaoCode: DaoCode,
                    BlagoSeller: BlagoSellerCode,
                    NextDaoCreationFee: toNano('10'),
                    NextDaoTransactionFee: toNano('0'),
                    NextDaoCreationFeeDiscount: toNano('0.00001'),
                    NextDaoTransactionFeeIncrease: toNano('0.000001'),
                    MaxDaoTransactionFee: toNano('1'),
                    BlagoSellerCreationFee: toNano('1'),
                },
                DaoMasterCode,
            ),
        );

        const DaoMasterDeployResult = await DaoMaster.sendDeploy(deployer.getSender(), toNano('22'));

        expect(DaoMasterDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: DaoMaster.address,
            deploy: true,
            success: true,
        });

        const firstDaoAddresss = await DaoMaster.getDaoAddressByDeployerAddress(deployer.address);

        printTransactionFees(DaoMasterDeployResult.transactions);

        expect(DaoMasterDeployResult.transactions).toHaveTransaction({
            from: DaoMaster.address,
            to: firstDaoAddresss,
            deploy: true,
            success: true,
        });

        firstDao = blockchain.openContract(Dao.createFromAddress(firstDaoAddresss));

        const DaoDataBeforeActivation = await firstDao.getDaoData();
        expect(DaoDataBeforeActivation.active).toStrictEqual(0);

        // Activate dao

        const ProfitableAddressesDict = Dictionary.empty<bigint, Cell>();
        ProfitableAddressesDict.set(BigInt(0), beginCell().storeAddress(profitableAddress.address).endCell());
        const ProfitableAddresses = beginCell()
            .storeDictDirect(ProfitableAddressesDict, Dictionary.Keys.BigUint(32), Dictionary.Values.Cell())
            .endCell();

        const PendingInvitationsDict = Dictionary.empty<bigint, Cell>();
        PendingInvitationsDict.set(
            BigInt(0),
            beginCell().storeAddress(wallet0.address).storeUint(28, 32).storeUint(37, 32).endCell(),
        );
        PendingInvitationsDict.set(
            BigInt(1),
            beginCell().storeAddress(wallet1.address).storeUint(35, 32).storeUint(28, 32).endCell(),
        );
        PendingInvitationsDict.set(
            BigInt(2),
            beginCell()
                .storeAddress(wallet2.address)
                .storeUint(37, 32)
                .storeUint(35, 32)
                .storeDict(Dictionary.empty())
                .endCell(),
        );
        const PendingInvitations = beginCell()
            .storeDictDirect(PendingInvitationsDict, Dictionary.Keys.BigUint(32), Dictionary.Values.Cell())
            .endCell();

        const DaoMasterActivationResult = await firstDao.sendActivateDao(
            deployer.getSender(),
            toNano('0.33'),
            51, // AgreementPercentNumerator
            100, // AgreementPercentDenominator
            10, // ProfitReservePercentNumerator
            100, // ProfitReservePercentDenominator
            ProfitableAddresses, // ProfitableAddresses
            PendingInvitations, // PendingInvitations
        );

        expect(DaoMasterActivationResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: firstDao.address,
            success: true,
        });

        expect(DaoMasterActivationResult.transactions).toHaveTransaction({
            from: firstDao.address,
            to: wallet0.address,
            success: true,
            op: DaoOperationCodes.InviteToDao,
            body: beginCell()
                .storeUint(DaoOperationCodes.InviteToDao, 32)
                .storeUint(0, 32)
                .storeUint(28, 32)
                .storeUint(37, 32)
                .endCell(),
        });

        expect(DaoMasterActivationResult.transactions).toHaveTransaction({
            from: firstDao.address,
            to: wallet1.address,
            success: true,
            op: DaoOperationCodes.InviteToDao,
            body: beginCell()
                .storeUint(DaoOperationCodes.InviteToDao, 32)
                .storeUint(1, 32)
                .storeUint(35, 32)
                .storeUint(28, 32)
                .endCell(),
        });

        expect(DaoMasterActivationResult.transactions).toHaveTransaction({
            from: firstDao.address,
            to: wallet2.address,
            success: true,
            op: DaoOperationCodes.InviteToDao,
            body: beginCell()
                .storeUint(DaoOperationCodes.InviteToDao, 32)
                .storeUint(2, 32)
                .storeUint(37, 32)
                .storeUint(35, 32)
                .endCell(),
        });

        printTransactionFees(DaoMasterActivationResult.transactions);

        const DaoDataAfterActivation = await firstDao.getDaoData();
        expect(DaoDataAfterActivation.active).toStrictEqual(1);
        const profitable_addresses_dict = DaoDataAfterActivation.profitable_addresses;
        const result = profitable_addresses_dict!
            .beginParse()
            .loadDictDirect(Dictionary.Keys.BigUint(32), Dictionary.Values.Cell());
        expect(result.get(BigInt(0))?.beginParse().loadAddress()).toEqualAddress(profitableAddress.address);

        expect((await firstDao.getPendingInvitationData(BigInt(0))).authorized_address).toEqualAddress(wallet0.address);
        expect((await firstDao.getPendingInvitationData(BigInt(0))).approval_blago).toStrictEqual(BigInt(28));
        expect((await firstDao.getPendingInvitationData(BigInt(0))).profit_blago).toStrictEqual(BigInt(37));

        expect((await firstDao.getPendingInvitationData(BigInt(1))).authorized_address).toEqualAddress(wallet1.address);
        expect((await firstDao.getPendingInvitationData(BigInt(1))).approval_blago).toStrictEqual(BigInt(35));
        expect((await firstDao.getPendingInvitationData(BigInt(1))).profit_blago).toStrictEqual(BigInt(28));

        expect((await firstDao.getPendingInvitationData(BigInt(2))).authorized_address).toEqualAddress(wallet2.address);
        expect((await firstDao.getPendingInvitationData(BigInt(2))).approval_blago).toStrictEqual(BigInt(37));
        expect((await firstDao.getPendingInvitationData(BigInt(2))).profit_blago).toStrictEqual(BigInt(35));

        // Wallet0 accepts invitation to A DAO

        const wallet0AcceptsInvitation = await firstDao.sendAcceptInvitationToDao(
            wallet0.getSender(),
            toNano('0.33'),
            0, // Passcode
        );

        expect(wallet0AcceptsInvitation.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.AcceptInvitationToDao,
            success: true,
        });

        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell()))
                .authorized_address,
        ).toEqualAddress(wallet0.address);
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell()))
                .approval_blago,
        ).toStrictEqual(BigInt(28));
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).profit_blago,
        ).toStrictEqual(BigInt(37));

        printTransactionFees(wallet0AcceptsInvitation.transactions);

        const DaoDataAfterWallet0In = await firstDao.getDaoData();
        expect(DaoDataAfterWallet0In.total_approval_blago).toStrictEqual(BigInt(28));
        expect(DaoDataAfterWallet0In.total_profit_blago).toStrictEqual(BigInt(37));

        // Wallet1 accepts invitation to A DAO

        const wallet1AcceptsInvitation = await firstDao.sendAcceptInvitationToDao(
            wallet1.getSender(),
            toNano('0.33'),
            1, // Passcode
        );

        expect(wallet1AcceptsInvitation.transactions).toHaveTransaction({
            from: wallet1.address,
            to: firstDao.address,
            op: DaoOperationCodes.AcceptInvitationToDao,
            success: true,
        });

        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet1.address).endCell()))
                .authorized_address,
        ).toEqualAddress(wallet1.address);
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet1.address).endCell()))
                .approval_blago,
        ).toStrictEqual(BigInt(35));
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet1.address).endCell())).profit_blago,
        ).toStrictEqual(BigInt(28));

        printTransactionFees(wallet1AcceptsInvitation.transactions);

        const DaoDataAfterWallet1In = await firstDao.getDaoData();
        expect(DaoDataAfterWallet1In.total_approval_blago).toStrictEqual(BigInt(63));
        expect(DaoDataAfterWallet1In.total_profit_blago).toStrictEqual(BigInt(65));

        // Wallet2 accepts invitation to A DAO

        const wallet2AcceptsInvitation = await firstDao.sendAcceptInvitationToDao(
            wallet2.getSender(),
            toNano('0.33'),
            2, // Passcode
        );

        expect(wallet2AcceptsInvitation.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.AcceptInvitationToDao,
            success: true,
        });

        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell()))
                .authorized_address,
        ).toEqualAddress(wallet2.address);
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell()))
                .approval_blago,
        ).toStrictEqual(BigInt(37));
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago,
        ).toStrictEqual(BigInt(35));

        printTransactionFees(wallet2AcceptsInvitation.transactions);

        const DaoDataAfterWallet2In = await firstDao.getDaoData();
        expect(DaoDataAfterWallet2In.total_approval_blago).toStrictEqual(BigInt(100));
        expect(DaoDataAfterWallet2In.total_profit_blago).toStrictEqual(BigInt(100));
    });

    it('Empty test', async () => {});

    it('Change Wallet2 address to Wallet3 address and change back', async () => {
        const wallet2ChangesAddressToWallet3 = await firstDao.sendChangeMyAddress(
            wallet2.getSender(),
            toNano('0.33'),
            wallet3.address, // NewAddress
        );

        expect(wallet2ChangesAddressToWallet3.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ChangeMyAddress,
            success: true,
        });

        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet3.address).endCell()))
                .authorized_address,
        ).toEqualAddress(wallet3.address);
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet3.address).endCell()))
                .approval_blago,
        ).toStrictEqual(BigInt(37));
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet3.address).endCell())).profit_blago,
        ).toStrictEqual(BigInt(35));

        printTransactionFees(wallet2ChangesAddressToWallet3.transactions);

        const wallet3ChangesAddressToWallet2 = await firstDao.sendChangeMyAddress(
            wallet3.getSender(),
            toNano('0.33'),
            wallet2.address, // NewAddress
        );

        expect(wallet3ChangesAddressToWallet2.transactions).toHaveTransaction({
            from: wallet3.address,
            to: firstDao.address,
            op: DaoOperationCodes.ChangeMyAddress,
            success: true,
        });

        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell()))
                .authorized_address,
        ).toEqualAddress(wallet2.address);
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell()))
                .approval_blago,
        ).toStrictEqual(BigInt(37));
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago,
        ).toStrictEqual(BigInt(35));

        printTransactionFees(wallet3ChangesAddressToWallet2.transactions);
    });

    it('Should Propose Transaction: Invite Address wallet3', async () => {
        const proposeWallet3Invitation = await firstDao.sendProposeInviteAddress(
            wallet0.getSender(),
            toNano('0.33'),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet3.address, // AddressToInvite
            BigInt(46), // ApprovalBlago
            BigInt(46), // ProfitBlago
        );

        expect(proposeWallet3Invitation.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        });

        expect(
            (await firstDao.getPendingTransactionsData(BigInt(0))).transaction_info.beginParse().loadAddress(),
        ).toEqualAddress(wallet3.address);

        printTransactionFees(proposeWallet3Invitation.transactions);
    });

    it('Should Propose Transaction: Delete Address wallet1', async () => {
        const proposeWallet1Delete = await firstDao.sendProposeDeleteAddress(
            wallet2.getSender(),
            toNano('0.33'),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet1.address, // AddressToDelete
        );

        expect(proposeWallet1Delete.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        });

        expect(
            (await firstDao.getPendingTransactionsData(BigInt(1))).transaction_info.beginParse().loadAddress(),
        ).toEqualAddress(wallet1.address);

        printTransactionFees(proposeWallet1Delete.transactions);
    });

    it('Should Approve Transaction: Invite Address wallet3', async () => {
        // Wallet0 approves Wallet3 invitation to A DAO

        const wallet0ApprovesWallet3Invitation = await firstDao.sendApprove(
            wallet0.getSender(),
            toNano('0.33'),
            0, // TransactionIndex
        );

        expect(wallet0ApprovesWallet3Invitation.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesWallet3Invitation.transactions);

        // Wallet2 approves Wallet3 invitation to A DAO

        const wallet2ApprovesWallet3Invitation = await firstDao.sendApprove(
            wallet2.getSender(),
            toNano('0.33'),
            0, // TransactionIndex
        );

        expect(wallet2ApprovesWallet3Invitation.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        // Send invitation to wallet3

        expect(wallet2ApprovesWallet3Invitation.transactions).toHaveTransaction({
            from: firstDao.address,
            to: wallet3.address,
            success: true,
            op: DaoOperationCodes.InviteToDao,
            body: beginCell()
                .storeUint(DaoOperationCodes.InviteToDao, 32)
                .storeUint(3, 32)
                .storeUint(46, 32)
                .storeUint(46, 32)
                .endCell(),
        });

        printTransactionFees(wallet2ApprovesWallet3Invitation.transactions);

        // Wallet3 accepts invitation to A DAO

        const wallet3AcceptsInvitation = await firstDao.sendAcceptInvitationToDao(
            wallet3.getSender(),
            toNano('0.33'),
            3, // Passcode
        );

        expect(wallet3AcceptsInvitation.transactions).toHaveTransaction({
            from: wallet3.address,
            to: firstDao.address,
            op: DaoOperationCodes.AcceptInvitationToDao,
            success: true,
        });

        printTransactionFees(wallet3AcceptsInvitation.transactions);

        const DaoDataAfterWallet2In = await firstDao.getDaoData();
        expect(DaoDataAfterWallet2In.total_approval_blago).toStrictEqual(BigInt(146));
        expect(DaoDataAfterWallet2In.total_profit_blago).toStrictEqual(BigInt(146));
    });

    it('Wallet3 should quit A DAO', async () => {
        const wallet0QuitsDao = await firstDao.sendQuitDao(wallet3.getSender(), toNano('0.33'));

        expect(wallet0QuitsDao.transactions).toHaveTransaction({
            from: wallet3.address,
            to: firstDao.address,
            op: DaoOperationCodes.QuitDao,
            success: true,
        });

        printTransactionFees(wallet0QuitsDao.transactions);

        const DaoDataAfterWallet0Out = await firstDao.getDaoData();
        expect(DaoDataAfterWallet0Out.total_approval_blago).toStrictEqual(BigInt(100));
        expect(DaoDataAfterWallet0Out.total_profit_blago).toStrictEqual(BigInt(100));
    });

    it('Should Approve Transaction: Delete Address wallet1', async () => {
        // Wallet0 approves wallet1 removal

        const wallet0ApprovesWallet1Removal = await firstDao.sendApprove(
            wallet0.getSender(),
            toNano('0.33'),
            1, // TransactionIndex
        );

        expect(wallet0ApprovesWallet1Removal.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesWallet1Removal.transactions);

        // Wallet2 approves wallet1 removal

        const wallet2ApprovesWallet1Removal = await firstDao.sendApprove(
            wallet2.getSender(),
            toNano('0.33'),
            1, // TransactionIndex
        );

        expect(wallet2ApprovesWallet1Removal.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet2ApprovesWallet1Removal.transactions);
    });

    it('Should Propose Transaction: Send Collect Funds', async () => {
        const proposeSendCollectFunds = await firstDao.sendProposeSendCollectFunds(
            wallet2.getSender(),
            toNano('0.33'),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            0, // ProfitableAddressPasscode
        );

        expect(proposeSendCollectFunds.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        });

        printTransactionFees(proposeSendCollectFunds.transactions);
    });

    it('Should Approve Transaction: Send Collect Funds', async () => {
        // Wallet0 approves Send Collect Funds

        const wallet0ApprovesSendCollectFunds = await firstDao.sendApprove(
            wallet0.getSender(),
            toNano('0.33'),
            2, // TransactionIndex
        );

        expect(wallet0ApprovesSendCollectFunds.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesSendCollectFunds.transactions);

        // Wallet2 approves Send Collect Funds

        const wallet2ApprovesSendCollectFunds = await firstDao.sendApprove(
            wallet2.getSender(),
            toNano('0.33'),
            2, // TransactionIndex
        );

        expect(wallet2ApprovesSendCollectFunds.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        expect(wallet2ApprovesSendCollectFunds.transactions).toHaveTransaction({
            from: firstDao.address,
            to: profitableAddress.address,
            op: DaoInternalOperations.CollectFunds,
            success: true,
        });

        printTransactionFees(wallet2ApprovesSendCollectFunds.transactions);

        const collectFunds = await firstDao.sendFundsToCollect(profitableAddress.getSender(), toNano(333));

        expect(collectFunds.transactions).toHaveTransaction({
            from: profitableAddress.address,
            to: firstDao.address,
            value: toNano(333),
            success: true,
            op: DaoInternalOperations.CollectFunds,
        });

        printTransactionFees(collectFunds.transactions);
    });

    it('Should Propose Transaction: Distribute Ton', async () => {
        const proposeDistributeTon = await firstDao.sendProposeDistributeTon(
            wallet2.getSender(),
            toNano('0.33'),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            toNano(200), // DistributionAmount
        );

        expect(proposeDistributeTon.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        });

        printTransactionFees(proposeDistributeTon.transactions);
    });

    it('Should Approve Transaction: Distribute Ton', async () => {
        // Wallet0 approves TON Distribution

        const wallet0ApprovesTonDistribution = await firstDao.sendApprove(
            wallet0.getSender(),
            toNano('1'),
            3, // TransactionIndex
        );

        expect(wallet0ApprovesTonDistribution.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesTonDistribution.transactions);

        // Wallet2 approves Send Collect Funds

        const wallet2ApprovesTonDistribution = await firstDao.sendApprove(
            wallet2.getSender(),
            toNano('3'),
            3, // TransactionIndex
        );

        expect(wallet2ApprovesTonDistribution.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        expect(wallet2ApprovesTonDistribution.transactions).toHaveTransaction({
            from: firstDao.address,
            to: wallet0.address,
            success: true,
        });

        expect(wallet2ApprovesTonDistribution.transactions).toHaveTransaction({
            from: firstDao.address,
            to: wallet3.address,
            success: true,
        });

        expect(wallet2ApprovesTonDistribution.transactions).toHaveTransaction({
            from: firstDao.address,
            to: DaoMaster.address,
            op: DaoOperationCodes.ApproveTransaction,
        });

        printTransactionFees(wallet2ApprovesTonDistribution.transactions);
    });

    it('Should Propose Transaction: Arbitrary Transaction', async () => {
        const proposeArbitraryTransaction = await firstDao.sendProposeArbitraryTransaction(
            wallet2.getSender(),
            toNano('0.33'),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet4.address, // Destination
            toNano(0.33), // Amount
            beginCell().storeUint(777, 32).endCell(), // MsgBody
        );

        expect(proposeArbitraryTransaction.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        });

        printTransactionFees(proposeArbitraryTransaction.transactions);
    });

    it('Should Approve Transaction: Arbitrary Transaction', async () => {
        // Wallet0 approves Arbitrary Transaction

        const wallet0ApprovesArbitraryTransaction = await firstDao.sendApprove(
            wallet0.getSender(),
            toNano('0.33'),
            4, // TransactionIndex
        );

        expect(wallet0ApprovesArbitraryTransaction.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesArbitraryTransaction.transactions);

        // Wallet2 approves Arbitrary Transaction

        const wallet2ApprovesArbitraryTransaction = await firstDao.sendApprove(
            wallet2.getSender(),
            toNano('0.33'),
            4, // TransactionIndex
        );

        expect(wallet2ApprovesArbitraryTransaction.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        expect(wallet2ApprovesArbitraryTransaction.transactions).toHaveTransaction({
            from: firstDao.address,
            to: wallet4.address,
            success: true,
            body: beginCell().storeUint(777, 32).endCell(),
        });

        printTransactionFees(wallet2ApprovesArbitraryTransaction.transactions);
    });

    it('Should Propose Transaction: Update Agreement Percent', async () => {
        const proposeUpdateAgreementPercent = await firstDao.sendProposeUpdateAgreementPercent(
            wallet2.getSender(),
            toNano('0.33'),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            BigInt(77), // AgreementPercentNumerator
            BigInt(100), // AgreementPercentDenumerator
        );

        expect(proposeUpdateAgreementPercent.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        });

        printTransactionFees(proposeUpdateAgreementPercent.transactions);
    });

    it('Should Approve Transaction: Update Agreement Percent', async () => {
        // Wallet0 approves Update Agreement Percent

        const wallet0ApprovesUpdateAgreementPercent = await firstDao.sendApprove(
            wallet0.getSender(),
            toNano('0.33'),
            5, // TransactionIndex
        );

        expect(wallet0ApprovesUpdateAgreementPercent.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesUpdateAgreementPercent.transactions);

        // Wallet2 approves Update Agreement Percent

        const wallet2ApprovesUpdateAgreementPercent = await firstDao.sendApprove(
            wallet2.getSender(),
            toNano('0.33'),
            5, // TransactionIndex
        );

        expect(wallet2ApprovesUpdateAgreementPercent.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        expect((await firstDao.getDaoData()).agreement_percent_numerator).toStrictEqual(BigInt(77));
        expect((await firstDao.getDaoData()).agreement_percent_denominator).toStrictEqual(BigInt(100));

        printTransactionFees(wallet2ApprovesUpdateAgreementPercent.transactions);
    });

    it('Should Propose Transaction: Transfer Blago from Wallet2 to Wallet5 (unauthorized address)', async () => {
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell()))
                .approval_blago,
        ).toStrictEqual(BigInt(37));
        expect(
            (await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago,
        ).toStrictEqual(BigInt(35));

        const proposeTransferBlago = await firstDao.sendProposeTransferBlago(
            wallet2.getSender(),
            toNano('0.33'),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet5.address, // Recipient
            BigInt(12), // ApprovalBlago
            BigInt(13), // ProfitBlago
        );

        expect(proposeTransferBlago.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        });

        printTransactionFees(proposeTransferBlago.transactions);
    });

    /*

    it('Should Approve Transaction: Transfer Blago from Wallet2 to Wallet5 (unauthorized address)', async () => {

        // Wallet0 approves Transfer Blago

        const wallet0ApprovesTransferBlago = await firstDao.sendApprove(wallet0.getSender(), toNano('0.33'), 
            6, // TransactionIndex
        )

        expect(wallet0ApprovesTransferBlago.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesTransferBlago.transactions);

        // Wallet2 approves Transfer Blago

        const wallet2ApprovesTransferBlago = await firstDao.sendApprove(wallet2.getSender(), toNano('0.33'), 
            6, // TransactionIndex
        )

        expect(wallet2ApprovesTransferBlago.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        })

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).approval_blago).toStrictEqual(BigInt(25));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago).toStrictEqual(BigInt(22));


        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet5.address).endCell())).approval_blago).toStrictEqual(BigInt(12));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet5.address).endCell())).profit_blago).toStrictEqual(BigInt(13));

        printTransactionFees(wallet2ApprovesTransferBlago.transactions);

    });

    it('Should Propose Transaction: Transfer Blago from Wallet2 to Wallet0 (authorized address)', async () => {

        const proposeTransferBlago = await firstDao.sendProposeTransferBlago(wallet2.getSender(), toNano('0.33'), 
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet0.address, // Recipient
            BigInt(7), // ApprovalBlago
            BigInt(7), // ProfitBlago
        )

        expect(proposeTransferBlago.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        })

        printTransactionFees(proposeTransferBlago.transactions);

    });

    it('Should Approve Transaction: Transfer Blago To Authorized Address', async () => {

        // Wallet0 approves Transfer Blago

        const wallet0ApprovesTransferBlago = await firstDao.sendApprove(wallet0.getSender(), toNano('0.33'), 
            7, // TransactionIndex
        )

        expect(wallet0ApprovesTransferBlago.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesTransferBlago.transactions);

        // Wallet2 approves Transfer Blago

        const wallet2ApprovesTransferBlago = await firstDao.sendApprove(wallet2.getSender(), toNano('0.33'), 
            7, // TransactionIndex
        )

        expect(wallet2ApprovesTransferBlago.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        })

        printTransactionFees(wallet2ApprovesTransferBlago.transactions);

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).approval_blago).toStrictEqual(BigInt(18));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago).toStrictEqual(BigInt(15));

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).approval_blago).toStrictEqual(BigInt(35));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).profit_blago).toStrictEqual(BigInt(44));

    });

    it('Should Propose Transaction: Delete Pending Invitations', async () => {

        // Create first Invite Address pending transactions

        const proposeWallet4Invitation = await firstDao.sendProposeInviteAddress(wallet0.getSender(), toNano('0.33'), 
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet3.address, // AddressToInvite
            BigInt(46), // ApprovalBlago
            BigInt(46), // ProfitBlago
        )

        expect(proposeWallet4Invitation.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        })

        printTransactionFees(proposeWallet4Invitation.transactions);

        // Wallet0 approves wallet4 invitation

        const wallet0ApprovesTransferBlago = await firstDao.sendApprove(wallet0.getSender(), toNano('0.33'), 
            8, // TransactionIndex
        )

        expect(wallet0ApprovesTransferBlago.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesTransferBlago.transactions);

        // Wallet2 approves wallet4 invitation

        const wallet2ApprovesTransferBlago = await firstDao.sendApprove(wallet2.getSender(), toNano('0.33'), 
            8, // TransactionIndex
        )

        expect(wallet2ApprovesTransferBlago.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        })

        printTransactionFees(wallet2ApprovesTransferBlago.transactions);

        // Create second Invite Address pending transactions

        const proposeWallet5Invitation = await firstDao.sendProposeInviteAddress(wallet0.getSender(), toNano('0.33'), 
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet3.address, // AddressToInvite
            BigInt(46), // ApprovalBlago
            BigInt(46), // ProfitBlago
        )

        expect(proposeWallet5Invitation.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        })

        printTransactionFees(proposeWallet5Invitation.transactions);

        // Wallet0 approves wallet5 invitation

        const wallet0ApprovesWallet5Invitation = await firstDao.sendApprove(wallet0.getSender(), toNano('0.33'), 
            9, // TransactionIndex
        )

        expect(wallet0ApprovesWallet5Invitation.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesWallet5Invitation.transactions);

        // Wallet2 approves wallet5 invitation

        const wallet2ApprovesWallet5Invitation = await firstDao.sendApprove(wallet2.getSender(), toNano('0.33'), 
            9, // TransactionIndex
        )

        expect(wallet2ApprovesWallet5Invitation.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        })

        printTransactionFees(wallet2ApprovesWallet5Invitation.transactions);

        // Create third Invite Address pending transactions

        const proposeWallet6Invitation = await firstDao.sendProposeInviteAddress(wallet0.getSender(), toNano('0.33'), 
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet6.address, // AddressToInvite
            BigInt(46), // ApprovalBlago
            BigInt(46), // ProfitBlago
        )

        expect(proposeWallet6Invitation.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        })

        printTransactionFees(proposeWallet6Invitation.transactions);

        // Wallet0 approves wallet6 invitation

        const wallet0ApprovesWallet6Invitation = await firstDao.sendApprove(wallet0.getSender(), toNano('0.33'), 
            10, // TransactionIndex
        )

        expect(wallet0ApprovesWallet6Invitation.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesWallet6Invitation.transactions);

        // Wallet2 approves wallet6 invitation

        const wallet2ApprovesWallet6Invitation = await firstDao.sendApprove(wallet2.getSender(), toNano('0.33'), 
            10, // TransactionIndex
        )

        expect(wallet2ApprovesWallet6Invitation.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        })

        printTransactionFees(wallet2ApprovesWallet6Invitation.transactions);

        const PendingInvitationsForRemovalDict = Dictionary.empty<bigint, Slice>();
        PendingInvitationsForRemovalDict.set(BigInt(0), beginCell().endCell().beginParse());
        PendingInvitationsForRemovalDict.set(BigInt(1), beginCell().endCell().beginParse());
        PendingInvitationsForRemovalDict.set(BigInt(2), beginCell().endCell().beginParse());
        const PendingInvitationsForRemoval = beginCell().storeDictDirect(PendingInvitationsForRemovalDict, Dictionary.Keys.BigUint(32), createSliceValue()).endCell();

        const sendProposeDeletePendingInvitations = await firstDao.sendProposeDeletePendingTransactions(wallet2.getSender(), toNano('0.33'),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            PendingInvitationsForRemoval
        )

        expect(sendProposeDeletePendingInvitations.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        });

        printTransactionFees(sendProposeDeletePendingInvitations.transactions);

    });

    it('Should Approve Transaction: Delete Pending Invitations', async () => {

        // Wallet0 approves Delete Pending Invitations

        const wallet0ApprovesDeletePendingInvitations = await firstDao.sendApprove(wallet0.getSender(), toNano('0.33'), 
            11, // TransactionIndex
        )

        expect(wallet0ApprovesDeletePendingInvitations.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesDeletePendingInvitations.transactions);

        // Wallet2 approves Delete Pending Invitations

        const wallet2ApprovesDeletePendingInvitations = await firstDao.sendApprove(wallet2.getSender(), toNano('0.33'), 
            11, // TransactionIndex
        )

        expect(wallet2ApprovesDeletePendingInvitations.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        })

        printTransactionFees(wallet2ApprovesDeletePendingInvitations.transactions);

    });

    it('Should Propose Transaction: Delete Pending Transactions', async () => {

        // Create 3 pending transactions

        const proposeTransferBlago = await firstDao.sendProposeTransferBlago(wallet2.getSender(), toNano('0.33'), 
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet2.address, // Recipient
            BigInt(10), // ApprovalBlago
            BigInt(10), // ProfitBlago
        )

        expect(proposeTransferBlago.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        })

        printTransactionFees(proposeTransferBlago.transactions);

        const proposeUpdateAgreementPercent = await firstDao.sendProposeUpdateAgreementPercent(wallet2.getSender(), toNano('0.33'), 
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            BigInt(77), // AgreementPercentNumerator
            BigInt(100), // AgreementPercentDenumerator
        )

        expect(proposeUpdateAgreementPercent.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        })

        printTransactionFees(proposeUpdateAgreementPercent.transactions);

        const proposeDistributeTon = await firstDao.sendProposeDistributeTon(wallet2.getSender(), toNano('0.33'), 
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            toNano(200), // DistributionAmount
        )

        expect(proposeDistributeTon.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        })

        printTransactionFees(proposeDistributeTon.transactions);

        // Propose Delete Pending transactions

        const PendingTransactionsForRemovalDict = Dictionary.empty<bigint, Slice>();
        PendingTransactionsForRemovalDict.set(BigInt(0), beginCell().endCell().beginParse());
        PendingTransactionsForRemovalDict.set(BigInt(1), beginCell().endCell().beginParse());
        const PendingTransactionsForRemoval = beginCell().storeDictDirect(PendingTransactionsForRemovalDict, Dictionary.Keys.BigUint(32), createSliceValue()).endCell();

        const proposeDeletePendingTransactions = await firstDao.sendProposeDeletePendingTransactions(wallet2.getSender(), toNano('0.33'),
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            PendingTransactionsForRemoval
        );

        expect(proposeDeletePendingTransactions.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        });

        printTransactionFees(proposeDeletePendingTransactions.transactions);

    });

    it('Should Approve Transaction: Delete Pending Transactions', async () => {

        // Wallet0 approves Delete Pending Transactions

        const wallet0ApprovesDeletePendingTransactions = await firstDao.sendApprove(wallet0.getSender(), toNano('0.33'), 
            15, // TransactionIndex
        )

        expect(wallet0ApprovesDeletePendingTransactions.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesDeletePendingTransactions.transactions);

        // Wallet2 approves Delete Pending Transactions

        const wallet2ApprovesDeletePendingTransactions = await firstDao.sendApprove(wallet2.getSender(), toNano('0.33'), 
            15, // TransactionIndex
        )

        expect(wallet2ApprovesDeletePendingTransactions.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        })

        printTransactionFees(wallet2ApprovesDeletePendingTransactions.transactions);

    });

    it('Should Propose Transaction: Put Up Blago For Sale To Authorized Address', async () => {

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).approval_blago).toStrictEqual(BigInt(18));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago).toStrictEqual(BigInt(15));

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).approval_blago).toStrictEqual(BigInt(35));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).profit_blago).toStrictEqual(BigInt(44));

        const proposeTransferBlago = await firstDao.sendPutUpBlagoForSale(wallet2.getSender(), toNano('0.33'), 
            Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Deadline
            wallet0.address, // BlagoBuyer
            toNano(100), // Price
            BigInt(10), // ApprovalBlagoForSale
            BigInt(10), // ProfitBlagoForSale
        );

        expect(proposeTransferBlago.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ProposeTransaction,
            success: true,
        })

        printTransactionFees(proposeTransferBlago.transactions);

    });

    it('Should Approve Transaction: Put Up Blago For Sale', async () => {

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).approval_blago).toStrictEqual(BigInt(18));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago).toStrictEqual(BigInt(15));

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).approval_blago).toStrictEqual(BigInt(35));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).profit_blago).toStrictEqual(BigInt(44));

        // Wallet0 approves Put Up Blago For Sale

        const wallet0ApprovesPutUpPintsForSale = await firstDao.sendApprove(wallet0.getSender(), toNano('0.33'), 
            16, // TransactionIndex
        )

        expect(wallet0ApprovesPutUpPintsForSale.transactions).toHaveTransaction({
            from: wallet0.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        });

        printTransactionFees(wallet0ApprovesPutUpPintsForSale.transactions);

        // Wallet2 approves Put Up Blago For Sale

        const wallet2ApprovesPutUpBlagoForSale = await firstDao.sendApprove(wallet2.getSender(), toNano('0.33'), 
            16, // TransactionIndex
        )

        expect(wallet2ApprovesPutUpBlagoForSale.transactions).toHaveTransaction({
            from: wallet2.address,
            to: firstDao.address,
            op: DaoOperationCodes.ApproveTransaction,
            success: true,
        })

        expect(wallet2ApprovesPutUpBlagoForSale.transactions).toHaveTransaction({
            from: firstDao.address,
            to: DaoMaster.address,
            op: DaoInternalOperations.StartPointSale,
            success: true,
        })

        const blagoSellerAddress = await DaoMaster.getBlagoSellerAddressByIndex(BigInt(0));

        expect(wallet2ApprovesPutUpBlagoForSale.transactions).toHaveTransaction({
            from: DaoMaster.address,
            to: blagoSellerAddress,
            op: DaoInternalOperations.StartPointSale,
            deploy: true,
            success: true
        });

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).approval_blago).toStrictEqual(BigInt(18));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago).toStrictEqual(BigInt(15));

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).approval_blago).toStrictEqual(BigInt(35));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).profit_blago).toStrictEqual(BigInt(44));

        const blagoSeller = blockchain.openContract(BlagoSeller.createFromAddress(blagoSellerAddress));

        const wallet0BuysBlagoFromWallet2 = await blagoSeller.sendBuy(wallet0.getSender(), toNano(100));

        expect(wallet0BuysBlagoFromWallet2.transactions).toHaveTransaction({
            from: wallet0.address,
            to: blagoSeller.address,
            success: true,
        })

        expect(wallet0BuysBlagoFromWallet2.transactions).toHaveTransaction({
            from: blagoSeller.address,
            to: firstDao.address,
            op: BlagoSellerOperations.TransferBoughtBlago,
            success: true,
        })

        // expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).approval_blago).toStrictEqual(BigInt(27));
        // expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago).toStrictEqual(BigInt(25));

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).approval_blago).toStrictEqual(BigInt(8));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet2.address).endCell())).profit_blago).toStrictEqual(BigInt(5));

        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).approval_blago).toStrictEqual(BigInt(45));
        expect((await firstDao.getAuthorizedAddressData(beginCell().storeAddress(wallet0.address).endCell())).profit_blago).toStrictEqual(BigInt(54));

        printTransactionFees(wallet2ApprovesPutUpBlagoForSale.transactions);

    });

    */
});
