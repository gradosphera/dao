// DAO Master

export const DaoMasterOperationCodes = {
    SendDeployMessage: 0,
    WithdrawFunds: 1,
    ChangeDaoMasterOwner: 2,
};

// DAO

export const DaoOperationCodes = {
    ProcessDeployMessage: 0,
    MasterLog: 1,
    ActivateDao: 2,
    ProposeTransaction: 3,
    ApproveTransaction: 4,
    CollectProfit: 5,
    AcceptInvitationToDao: 6,
    BuyBlago: 7,
    InviteToDao: 8,
    RevokeApproval: 9,
    ChangeMyAddress: 10,
    QuitDao: 11,
    TopUpDaoBalance: 12,
};

export const DaoInternalOperations = {
    CollectFunds: 81,
    StartBlagoSale: 82,
};

export const DaoTransactionTypes = {
    TransactionWithoutType: 0,
    InviteAddress: 1,
    DeleteAddress: 2,
    SendCollectFunds: 81,
    DistributeTon: 4,
    ArbitraryTransaction: 5,
    UpdateAgreementPercent: 6,
    TransferBlago: 7,
    PutUpBlagoForSale: 8,
    DeletePendingInvitations: 9,
    DeletePendingTransactions: 10,
};

export const BlagoSellerOperations = {
    Buy: 0,
    TransferBoughtBlago: 84,
};
