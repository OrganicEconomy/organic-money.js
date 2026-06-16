import { describe, it } from 'mocha';
import { assert } from 'chai';

import { InvalidTransactionError, UnauthorizedError } from '../src/errors.js'
import { EcosystemBlockchain } from '../src/EcosystemBlockchain.js'
import { CitizenBlockchain } from '../src/CitizenBlockchain.js'
import { EcoBirthBlock, EcoInitializationBlock } from '../src/Block.js'
import { EngageTransaction, EarnTransaction, PayTransaction, PaperTransaction, SetAdminTransaction, PayerOrderTransaction, TXTYPE } from '../src/Transaction.js'
import { publicFromPrivate, dateToInt, buildInvestIndexes, buildMoneyIndexes } from '../src/crypto.js'
import { mySk, myPk, targetSk, targetPk, referentSk, referentPk } from './testUtils.js'
const adminSk = targetSk, adminPk = targetPk

const DATE1 = new Date('2025-01-01')
const DATE2 = new Date('2025-01-02')
const DATE3 = new Date('2025-01-03')

function makeStartedEco(secretKey = mySk) {
    const bc = new EcosystemBlockchain()
    bc.startBlockchain('My Eco', referentSk, adminPk, secretKey, DATE1)
    return bc
}

function makeEngageTx(signerSk, ecoPublicKey, date = DATE2) {
    const invests = buildInvestIndexes(date, 1)
    const tx = new EngageTransaction({ d: dateToInt(date), p: ecoPublicKey, i: invests, s: publicFromPrivate(signerSk) })
    tx.sign(signerSk)
    return tx
}

// Role transactions (SetAdmin/SetActor/SetPayer and their unset) are created on the
// signer's own CitizenBlockchain (mirroring payerOrder), then received by the ecosystem.
function makeAdminBc(signerSk) {
    const bc = new CitizenBlockchain()
    bc.makeBirthBlock('Admin', DATE1, signerSk, DATE1)
    return bc
}

function ecoSetAdmin(eco, signerSk, targetPk, date = DATE2) {
    const tx = makeAdminBc(signerSk).setAdmin(signerSk, eco.getMyPublicKey(), targetPk, date)
    return eco.receiveSetAdmin(tx)
}

function ecoUnsetAdmin(eco, signerSk, targetPk, date = DATE2) {
    const tx = makeAdminBc(signerSk).unsetAdmin(signerSk, eco.getMyPublicKey(), targetPk, date)
    return eco.receiveUnsetAdmin(tx)
}

function ecoSetActor(eco, signerSk, targetPk, ratio, date = DATE2) {
    const tx = makeAdminBc(signerSk).setActor(signerSk, eco.getMyPublicKey(), targetPk, ratio, date)
    return eco.receiveSetActor(tx)
}

function ecoUnsetActor(eco, signerSk, targetPk, date = DATE2) {
    const tx = makeAdminBc(signerSk).unsetActor(signerSk, eco.getMyPublicKey(), targetPk, date)
    return eco.receiveUnsetActor(tx)
}

function ecoSetPayer(eco, signerSk, targetPk, cap, date = DATE2) {
    const tx = makeAdminBc(signerSk).setPayer(signerSk, eco.getMyPublicKey(), targetPk, cap, date)
    return eco.receiveSetPayer(tx)
}

function ecoUnsetPayer(eco, signerSk, targetPk, date = DATE2) {
    const tx = makeAdminBc(signerSk).unsetPayer(signerSk, eco.getMyPublicKey(), targetPk, date)
    return eco.receiveUnsetPayer(tx)
}

describe('EcosystemBlockchain', () => {

    describe('startBlockchain', () => {
        it('Should have 2 blocks after startBlockchain.', () => {
            const bc = makeStartedEco()
            assert.equal(bc.blocks.length, 2)
        })

        it('Should have an EcoInitializationBlock as lastblock.', () => {
            const bc = makeStartedEco()
            assert.instanceOf(bc.lastblock, EcoInitializationBlock)
        })

        it('Should have an EcoBirthBlock as the oldest block.', () => {
            const bc = makeStartedEco()
            assert.instanceOf(bc.blocks[bc.blocks.length - 1], EcoBirthBlock)
        })

        it('Should return the secretKey.', () => {
            const bc = new EcosystemBlockchain()
            const sk = bc.startBlockchain('My Eco', referentSk, adminPk, mySk, DATE1)
            assert.equal(sk, mySk)
        })

        it('Should generate a secretKey if none given.', () => {
            const bc = new EcosystemBlockchain()
            const sk = bc.startBlockchain('My Eco', referentSk, adminPk, null, DATE1)
            assert.ok(sk)
            assert.equal(sk.length, 64)
        })

        it('getMyPublicKey should return the ecosystem public key.', () => {
            const bc = makeStartedEco()
            assert.equal(bc.getMyPublicKey(), myPk)
        })

        it('getAdmins should contain the first admin after startBlockchain.', () => {
            const bc = makeStartedEco()
            assert.isTrue(bc.getAdmins().has(adminPk))
            assert.equal(bc.getAdmins().size, 1)
        })

        it('getActors should contain the first admin with ratio 1 after startBlockchain.', () => {
            const bc = makeStartedEco()
            assert.isTrue(bc.getActors().has(adminPk))
            assert.equal(bc.getActors().get(adminPk), 1)
        })

        it('getPayers should be empty after startBlockchain.', () => {
            const bc = makeStartedEco()
            assert.equal(bc.getPayers().size, 0)
        })
    })

    describe('makeBirthBlock / validateAccount', () => {
        it('makeBirthBlock should add one EcoBirthBlock.', () => {
            const bc = new EcosystemBlockchain()

            bc.makeBirthBlock(mySk, adminPk, 'My Eco', DATE1)

            assert.equal(bc.blocks.length, 1)
            assert.instanceOf(bc.lastblock, EcoBirthBlock)
        })

        it('validateAccount should add an EcoInitializationBlock.', () => {
            const bc = new EcosystemBlockchain()
            bc.makeBirthBlock(mySk, adminPk, 'My Eco', DATE1)

            bc.validateAccount(referentSk, DATE1)

            assert.equal(bc.blocks.length, 2)
            assert.instanceOf(bc.lastblock, EcoInitializationBlock)
        })
    })

    describe('isWaitingValidation', () => {
        it('Should return false for empty blockchain.', () => {
            const bc = new EcosystemBlockchain()

            assert.isFalse(bc.isWaitingValidation())
        })

        it('Should return true after makeBirthBlock.', () => {
            const bc = new EcosystemBlockchain()

            bc.makeBirthBlock(mySk, adminPk, 'My Eco', DATE1)

            assert.isTrue(bc.isWaitingValidation())
        })

        it('Should return false after validateAccount.', () => {
            const bc = makeStartedEco()

            assert.isFalse(bc.isWaitingValidation())
        })
    })

    describe('isValidated', () => {
        it('Should return false for empty blockchain.', () => {
            const bc = new EcosystemBlockchain()

            assert.isFalse(bc.isValidated())
        })

        it('Should return false after makeBirthBlock only.', () => {
            const bc = new EcosystemBlockchain()

            bc.makeBirthBlock(mySk, adminPk, 'My Eco', DATE1)

            assert.isFalse(bc.isValidated())
        })

        it('Should return true after startBlockchain.', () => {
            const bc = makeStartedEco()

            assert.isTrue(bc.isValidated())
        })
    })

    describe('getAdmins / isAdmin', () => {
        it('isAdmin should return true for the initial admin.', () => {
            const bc = makeStartedEco()

            assert.isTrue(bc.isAdmin(adminPk))
        })

        it('isAdmin should return false for a non-admin.', () => {
            const bc = makeStartedEco()

            assert.isFalse(bc.isAdmin(referentPk))
        })

        it('getAdmins should include a newly set admin.', () => {
            const bc = makeStartedEco()

            ecoSetAdmin(bc,adminSk, referentPk, DATE2)

            assert.isTrue(bc.isAdmin(referentPk))
            assert.isTrue(bc.isAdmin(adminPk))
            assert.equal(bc.getAdmins().size, 2)
        })

        it('getAdmins should no longer include an unset admin.', () => {
            const bc = makeStartedEco()

            ecoSetAdmin(bc,adminSk, referentPk, DATE2)
            ecoUnsetAdmin(bc,adminSk, adminPk, DATE2)

            assert.isFalse(bc.isAdmin(adminPk))
            assert.isTrue(bc.isAdmin(referentPk))
        })

        it('unsetAdmin should throw if trying to remove the last admin.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoUnsetAdmin(bc,adminSk, adminPk, DATE2))
        })
    })

    describe('getActors / isActor', () => {
        it('isActor should return true for the initial actor.', () => {
            const bc = makeStartedEco()

            assert.isTrue(bc.isActor(adminPk))
        })

        it('isActor should return false for a non-actor.', () => {
            const bc = makeStartedEco()

            assert.isFalse(bc.isActor(referentPk))
        })

        it('setActor should update the ratio of an existing actor.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, adminPk, 3, DATE2)

            assert.equal(bc.getActors().get(adminPk), 3)
        })

        it('setActor should add a new actor.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, referentPk, 2, DATE2)

            assert.isTrue(bc.isActor(referentPk))
            assert.equal(bc.getActors().get(referentPk), 2)
        })

        it('unsetActor should throw if actor is still admin.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoUnsetActor(bc,adminSk, adminPk, DATE2))
        })

        it('unsetActor should throw if actor is still payer.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, referentPk, 2, DATE2)
            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)

            assert.throws(() => ecoUnsetActor(bc,adminSk, referentPk, DATE2))
        })

        it('unsetActor should throw if it would leave no actor with ratio > 0.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoUnsetActor(bc,adminSk, adminPk, DATE2), InvalidTransactionError)
        })

        it('setActor should throw if it would leave no actor with ratio > 0.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetActor(bc,adminSk, adminPk, 0, DATE2), InvalidTransactionError)
        })

        it('setActor should throw a specific error if ratio is negative.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetActor(bc,adminSk, referentPk, -1, DATE2), InvalidTransactionError, 'Ratio must be a non-negative integer.')
        })

        it('setActor should throw a specific error if ratio is not an integer.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetActor(bc,adminSk, referentPk, 1.5, DATE2), InvalidTransactionError, 'Ratio must be a non-negative integer.')
        })

        it('setActor should throw a specific error if ratio is not a number.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetActor(bc,adminSk, referentPk, 'abc', DATE2), InvalidTransactionError, 'Ratio must be a non-negative integer.')
        })

        it('unsetActor should remove the actor.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, referentPk, 2, DATE2)
            ecoUnsetActor(bc,adminSk, referentPk, DATE2)

            assert.isFalse(bc.isActor(referentPk))
        })

        it('volunteers (ratio 0) should be included in getActors.', () => {
            const bc = makeStartedEco()
            ecoSetActor(bc,adminSk, referentPk, 0, DATE2)

            assert.isTrue(bc.getActors().has(referentPk))
            assert.equal(bc.getActors().get(referentPk), 0)
        })
    })

    describe('getPayers / isPayer', () => {
        it('isPayer should return false initially.', () => {
            const bc = makeStartedEco()

            assert.isFalse(bc.isPayer(referentPk))
        })

        it('setPayer should add a payer.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 10, DATE2)
            assert.isTrue(bc.isPayer(referentPk))

            assert.equal(bc.getPayers().get(referentPk), 10)
        })

        it('setPayer with cap 0 (unlimited) should be included.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            assert.isTrue(bc.isPayer(referentPk))

            assert.equal(bc.getPayers().get(referentPk), 0)
        })

        it('setPayer should throw a specific error if cap is negative.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetPayer(bc,adminSk, referentPk, -1, DATE2), InvalidTransactionError, 'Cap must be a non-negative integer.')
        })

        it('setPayer should throw a specific error if cap is not an integer.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetPayer(bc,adminSk, referentPk, 1.5, DATE2), InvalidTransactionError, 'Cap must be a non-negative integer.')
        })

        it('setPayer should throw a specific error if cap is not a number.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetPayer(bc,adminSk, referentPk, 'abc', DATE2), InvalidTransactionError, 'Cap must be a non-negative integer.')
        })

        it('unsetPayer should remove the payer.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 10, DATE2)
            ecoUnsetPayer(bc,adminSk, referentPk, DATE2)

            assert.isFalse(bc.isPayer(referentPk))
        })
    })

    describe('setAdmin / unsetAdmin authorization', () => {
        it('setAdmin should throw if caller is not admin.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetAdmin(bc,referentSk, referentPk, DATE2))
        })

        it('unsetAdmin should throw if caller is not admin.', () => {
            const bc = makeStartedEco()

            ecoSetAdmin(bc,adminSk, referentPk, DATE2)

            assert.throws(() => ecoUnsetAdmin(bc,mySk, adminPk, DATE2))
        })
    })

    describe('setActor / unsetActor authorization', () => {
        it('setActor should throw if caller is not admin.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetActor(bc,referentSk, referentPk, 2, DATE2))
        })
    })

    describe('setPayer / unsetPayer authorization', () => {
        it('setPayer should throw if caller is not admin.', () => {
            const bc = makeStartedEco()

            assert.throws(() => ecoSetPayer(bc,referentSk, referentPk, 10, DATE2))
        })
    })

    describe('newBlock (role carry-forward)', () => {
        it('Should preserve admins after newBlock is triggered.', () => {
            const bc = makeStartedEco()

            ecoSetAdmin(bc,adminSk, referentPk, DATE2)
            bc.closeLastBlock(mySk, DATE2)
            ecoSetActor(bc,referentSk, referentPk, 1, DATE3)

            assert.isTrue(bc.isAdmin(adminPk))
            assert.isTrue(bc.isAdmin(referentPk))
        })

        it('Should preserve actors after newBlock is triggered.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, adminPk, 5, DATE2)
            bc.closeLastBlock(mySk, DATE2)
            ecoSetAdmin(bc,adminSk, referentPk, DATE3)

            assert.equal(bc.getActors().get(adminPk), 5)
        })

        it('Should preserve payers after newBlock is triggered.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 100, DATE2)
            bc.closeLastBlock(mySk, DATE2)
            ecoSetAdmin(bc,adminSk, referentPk, DATE3)

            assert.isTrue(bc.isPayer(referentPk))
            assert.equal(bc.getPayers().get(referentPk), 100)
        })
    })

    describe('receiveInvests', () => {
        it('Should throw if not an EngageTransaction.', () => {
            const bc = makeStartedEco()

            const tx = new SetAdminTransaction(adminSk, referentPk, DATE2)

            assert.throws(() => bc.receiveInvests(tx))
        })

        it('Should throw if transaction is not targeting this ecosystem.', () => {
            const bc = makeStartedEco()

            const invests = buildInvestIndexes(DATE2, 1)
            const tx = new EngageTransaction({ d: dateToInt(DATE2), p: referentPk, i: invests, s: adminPk })
            tx.sign(adminSk)

            assert.throws(() => bc.receiveInvests(tx))
        })

        it('Should throw if no invests in transaction (money-only engagement).', () => {
            const bc = makeStartedEco()

            const money = buildMoneyIndexes(DATE2, 1)
            const tx = new EngageTransaction({ d: dateToInt(DATE2), p: myPk, m: money, s: adminPk })
            tx.sign(adminSk)

            assert.throws(() => bc.receiveInvests(tx))
        })

        it('Should add invests to lastblock.invests.', () => {
            const bc = makeStartedEco()

            const engageTx = makeEngageTx(adminSk, myPk)
            bc.receiveInvests(engageTx)

            assert.deepEqual(bc.lastblock.invests, engageTx.invests)
        })

        it('Should record the transaction in the blockchain.', () => {
            const bc = makeStartedEco()

            const engageTx = makeEngageTx(adminSk, myPk)
            bc.receiveInvests(engageTx)

            assert.include(bc.lastblock.transactions, engageTx)
        })

        it('Should return the transaction.', () => {
            const bc = makeStartedEco()

            const engageTx = makeEngageTx(adminSk, myPk)
            const result = bc.receiveInvests(engageTx)

            assert.equal(result, engageTx)
        })
    })

    describe('receiveMoney', () => {
        it('Should throw if not an EngageTransaction.', () => {
            const bc = makeStartedEco()

            const tx = new SetAdminTransaction(adminSk, referentPk, DATE2)

            assert.throws(() => bc.receiveMoney(tx))
        })

        it('Should throw if transaction is not targeting this ecosystem.', () => {
            const bc = makeStartedEco()

            const money = buildMoneyIndexes(DATE2, 1)
            const tx = new EngageTransaction({ d: dateToInt(DATE2), p: referentPk, m: money, s: adminPk })
            tx.sign(adminSk)

            assert.throws(() => bc.receiveMoney(tx))
        })

        it('Should throw if no money in transaction (invest-only engagement).', () => {
            const bc = makeStartedEco()

            const tx = makeEngageTx(adminSk, myPk)

            assert.throws(() => bc.receiveMoney(tx))
        })

        it('Should add money to lastblock.money.', () => {
            const bc = makeStartedEco()

            const money = buildMoneyIndexes(DATE2, 1)
            const tx = new EngageTransaction({ d: dateToInt(DATE2), p: myPk, m: money, s: adminPk })
            tx.sign(adminSk)
            bc.receiveMoney(tx)

            assert.deepEqual(bc.lastblock.money, money)
        })

        it('Should record the transaction in the blockchain.', () => {
            const bc = makeStartedEco()

            const money = buildMoneyIndexes(DATE2, 1)
            const tx = new EngageTransaction({ d: dateToInt(DATE2), p: myPk, m: money, s: adminPk })
            tx.sign(adminSk)
            bc.receiveMoney(tx)

            assert.include(bc.lastblock.transactions, tx)
        })

        it('Should return the transaction.', () => {
            const bc = makeStartedEco()

            const money = buildMoneyIndexes(DATE2, 1)
            const tx = new EngageTransaction({ d: dateToInt(DATE2), p: myPk, m: money, s: adminPk })
            tx.sign(adminSk)
            const result = bc.receiveMoney(tx)

            assert.equal(result, tx)
        })
    })

    describe('receivePay', () => {
        it('Should throw if not a PayTransaction.', () => {
            const bc = makeStartedEco()

            const tx = new SetAdminTransaction(adminSk, referentPk, DATE2)

            assert.throws(() => bc.receivePay(tx))
        })

        it('Should throw if not targeting this ecosystem.', () => {
            const bc = makeStartedEco()

            const tx = new PayTransaction(adminSk, referentPk, DATE2, [20250101000])

            assert.throws(() => bc.receivePay(tx))
        })

        it('Should add money to lastblock.money.', () => {
            const bc = makeStartedEco()

            const tx = new PayTransaction(adminSk, myPk, DATE2, [20250101000, 20250101001])
            bc.receivePay(tx)

            assert.deepEqual(bc.lastblock.money, [20250101000, 20250101001])
        })

        it('Should record the transaction in the blockchain.', () => {
            const bc = makeStartedEco()

            const tx = new PayTransaction(adminSk, myPk, DATE2, [20250101000])
            bc.receivePay(tx)

            assert.include(bc.lastblock.transactions, tx)
        })

        it('Should return the transaction.', () => {
            const bc = makeStartedEco()

            const tx = new PayTransaction(adminSk, myPk, DATE2, [20250101000])
            const result = bc.receivePay(tx)

            assert.equal(result, tx)
        })
    })

    describe('cashPaper', () => {
        it('Should throw if not a PaperTransaction.', () => {
            const bc = makeStartedEco()

            const tx = new SetAdminTransaction(adminSk, referentPk, DATE2)

            assert.throws(() => bc.cashPaper(tx))
        })

        it('Should add money to lastblock.money, regardless of the paper target (the local heart ecosystem, not this one).', () => {
            const bc = makeStartedEco()

            const tx = new PaperTransaction(adminSk, referentPk, [20250101000, 20250101001], DATE2)
            bc.cashPaper(tx)

            assert.deepEqual(bc.lastblock.money, [20250101000, 20250101001])
        })

        it('Should record the transaction in the blockchain.', () => {
            const bc = makeStartedEco()

            const tx = new PaperTransaction(adminSk, referentPk, [20250101000], DATE2)
            bc.cashPaper(tx)

            assert.include(bc.lastblock.transactions, tx)
        })

        it('Should return the transaction.', () => {
            const bc = makeStartedEco()

            const tx = new PaperTransaction(adminSk, referentPk, [20250101000], DATE2)
            const result = bc.cashPaper(tx)

            assert.equal(result, tx)
        })
    })

    describe('receiveEarn', () => {
        it('Should throw if not an EarnTransaction.', () => {
            const bc = makeStartedEco()

            const tx = new SetAdminTransaction(adminSk, referentPk, DATE2)

            assert.throws(() => bc.receiveEarn(tx))
        })

        it('Should throw if not targeting this ecosystem.', () => {
            const bc = makeStartedEco()

            const tx = new EarnTransaction(adminSk, referentPk, [20250101000], DATE2)

            assert.throws(() => bc.receiveEarn(tx))
        })

        it('Should add money to lastblock.money.', () => {
            const bc = makeStartedEco()

            const tx = new EarnTransaction(adminSk, myPk, [20250101000, 20250101001], DATE2)
            bc.receiveEarn(tx)

            assert.deepEqual(bc.lastblock.money, [20250101000, 20250101001])
        })

        it('Should record the transaction in the blockchain.', () => {
            const bc = makeStartedEco()

            const tx = new EarnTransaction(adminSk, myPk, [20250101000], DATE2)
            bc.receiveEarn(tx)

            assert.include(bc.lastblock.transactions, tx)
        })

        it('Should return the transaction.', () => {
            const bc = makeStartedEco()

            const tx = new EarnTransaction(adminSk, myPk, [20250101000], DATE2)
            const result = bc.receiveEarn(tx)

            assert.equal(result, tx)
        })
    })

    describe('getAffordableInvestsAmount', () => {
        it('Should return 0 when there are no invests.', () => {
            const bc = makeStartedEco()
            assert.equal(bc.getAffordableInvestsAmount(DATE2), 0)
        })

        it('Should count only invests whose date has been reached.', () => {
            const bc = makeStartedEco()
            bc.lastblock.invests = [
                ...buildInvestIndexes(DATE1, 2), // mature at DATE2
                ...buildInvestIndexes(DATE3, 2)  // not yet mature at DATE2
            ]
            assert.equal(bc.getAffordableInvestsAmount(DATE2), 2)
        })

        it('Should count invests whose date is before or equal to the given date.', () => {
            const bc = makeStartedEco()
            bc.lastblock.invests = buildInvestIndexes(DATE2, 3)
            assert.equal(bc.getAffordableInvestsAmount(DATE2), 3)
        })

        it('Should count all invests when date is in the future.', () => {
            const bc = makeStartedEco()
            bc.lastblock.invests = [
                ...buildInvestIndexes(DATE1, 1),
                ...buildInvestIndexes(DATE2, 1),
                ...buildInvestIndexes(DATE3, 1)
            ]
            assert.equal(bc.getAffordableInvestsAmount(DATE3), 3)
        })
    })

    describe('receivePayerOrder', () => {
        it('Should throw if not a PayerOrderTransaction.', () => {
            const bc = makeStartedEco()

            const tx = new SetAdminTransaction(adminSk, referentPk, DATE2)

            assert.throws(() => bc.receivePayerOrder(mySk,tx))
        })

        it('Should throw if ecosystem does not match this ecosystem.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            const invests = buildInvestIndexes(DATE2, 1)
            bc.lastblock.invests = invests
            const tx = new PayerOrderTransaction(referentSk, targetPk, invests, referentPk, DATE2)

            assert.throws(() => bc.receivePayerOrder(mySk,tx))
        })

        it('Should throw if signer is not a payer.', () => {
            const bc = makeStartedEco()

            const invests = buildInvestIndexes(DATE2, 1)
            bc.lastblock.invests = invests
            const tx = new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2)

            assert.throws(() => bc.receivePayerOrder(mySk,tx))
        })

        it('Should throw if invests exceed payer cap.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 1, DATE2)
            const invests = buildInvestIndexes(DATE2, 2)
            bc.lastblock.invests = invests
            const tx = new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2)

            assert.throws(() => bc.receivePayerOrder(mySk,tx))
        })

        it('Should throw if cumulative payerOrders from same payer exceed cap.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 3, DATE2)
            const invests1 = buildInvestIndexes(DATE1, 2)
            const invests2 = buildInvestIndexes(DATE2, 2)
            bc.lastblock.invests = [...invests1, ...invests2]
            bc.receivePayerOrder(mySk,new PayerOrderTransaction(referentSk, targetPk, invests1, myPk, DATE2))

            assert.throws(
                () => bc.receivePayerOrder(mySk,new PayerOrderTransaction(referentSk, targetPk, invests2, myPk, DATE2)),
                InvalidTransactionError
            )
        })

        it('Should throw if invests not in lastblock.invests.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            const invests = buildInvestIndexes(DATE2, 1)
            const tx = new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2)

            assert.throws(() => bc.receivePayerOrder(mySk,tx))
        })

        it('Should throw if invests are not yet mature.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            const futureInvests = buildInvestIndexes(DATE3, 1)
            bc.lastblock.invests = futureInvests
            const tx = new PayerOrderTransaction(referentSk, targetPk, futureInvests, myPk, DATE2)

            assert.throws(() => bc.receivePayerOrder(mySk,tx), InvalidTransactionError, 'Some invests are not yet available.')
        })

        it('Should add the transaction to blockchain and return it.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            const engageTx = makeEngageTx(referentSk, myPk)
            bc.receiveInvests(engageTx)
            const tx = new PayerOrderTransaction(referentSk, targetPk, engageTx.invests, myPk, DATE2)
            const result = bc.receivePayerOrder(mySk,tx)

            assert.equal(tx.type, TXTYPE.PAYERORDER)
            assert.equal(tx.signer, referentPk)
            assert.equal(tx.ecosystem, myPk)
            assert.ok(tx.isValid())
            assert.include(bc.lastblock.transactions, tx)
            assert.equal(result, tx)
        })

        it('Should record the capUpdate chronologically after the order it stems from (order added first, capUpdate added last).', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc, adminSk, referentPk, 5, DATE2)
            const invests = buildInvestIndexes(DATE2, 2)
            bc.lastblock.invests = invests
            const tx = new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2)
            bc.receivePayerOrder(mySk, tx)

            // storage is newest-first: index 0 is the last one added
            assert.equal(bc.lastblock.transactions[0].type, TXTYPE.SETPAYER)
            assert.equal(bc.lastblock.transactions[1], tx)
        })

        it('Should dissolve the payer (not make them unlimited) when their cap reaches exactly zero.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc, adminSk, referentPk, 2, DATE2)
            const invests = buildInvestIndexes(DATE2, 2)
            bc.lastblock.invests = invests
            bc.receivePayerOrder(mySk, new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2))

            assert.isFalse(bc.isPayer(referentPk))
        })

        it('Should not throw if cap is 0 (unlimited) even with many invests.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            const invests = buildInvestIndexes(DATE2, 2)
            bc.lastblock.invests = invests
            const tx = new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2)

            assert.doesNotThrow(() => bc.receivePayerOrder(mySk,tx))
        })

        it('Should succeed when invest date equals order date.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            const invests = buildInvestIndexes(DATE2, 1)
            bc.lastblock.invests = invests
            const tx = new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2)

            assert.doesNotThrow(() => bc.receivePayerOrder(mySk,tx))
        })

        it('Should throw if order claims more occurrences of an id than actually available (duplicate id, insufficient count).', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc, adminSk, referentPk, 0, DATE2)
            const investId = buildInvestIndexes(DATE2, 1)[0]
            bc.lastblock.invests = [investId]
            const tx = new PayerOrderTransaction(referentSk, targetPk, [investId, investId], myPk, DATE2)

            assert.throws(() => bc.receivePayerOrder(mySk, tx), InvalidTransactionError, 'Ecosystem does not have these invests available.')
        })
    })

    describe('order', () => {
        it('Should throw UnauthorizedError if ecoSk does not match getMyPublicKey.', () => {
            const bc = makeStartedEco()

            assert.throws(() => bc.order(referentSk, myPk, buildInvestIndexes(DATE2, 1), DATE2))
        })

        it('Should throw InvalidTransactionError if invests not in lastblock.invests.', () => {
            const bc = makeStartedEco()

            const invests = buildInvestIndexes(DATE2, 1)

            assert.throws(() => bc.order(mySk, myPk, invests, DATE2))
        })

        it('Should throw if order claims more occurrences of an id than actually available (duplicate id, insufficient count).', () => {
            const bc = makeStartedEco()

            const investId = buildInvestIndexes(DATE2, 1)[0]
            bc.lastblock.invests = [investId]

            assert.throws(
                () => bc.order(mySk, myPk, [investId, investId], DATE2),
                InvalidTransactionError,
                'Ecosystem does not have these invests available.'
            )
        })

        it('Should throw if payerOrder authorized fewer occurrences of an id than requested.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc, adminSk, referentPk, 0, DATE2)
            const investId = buildInvestIndexes(DATE2, 1)[0]
            bc.lastblock.invests = [investId, investId]
            bc.receivePayerOrder(mySk, new PayerOrderTransaction(referentSk, targetPk, [investId], myPk, DATE2))

            assert.throws(
                () => bc.order(mySk, targetPk, [investId, investId], DATE2),
                InvalidTransactionError,
                'No payer authorization for these invests.'
            )
        })

        it('Should create an EarnTransaction, convert invests to money, and remove invests from lastblock.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            const engageTx = makeEngageTx(referentSk, myPk)
            bc.receiveInvests(engageTx)
            bc.receivePayerOrder(mySk,new PayerOrderTransaction(referentSk, targetPk, engageTx.invests, myPk, DATE2))
            const tx = bc.order(mySk, targetPk, engageTx.invests, DATE2)

            assert.equal(tx.type, TXTYPE.EARN)
            assert.equal(tx.target, targetPk)
            assert.ok(tx.isValid())
            assert.notDeepInclude(bc.lastblock.invests, engageTx.invests[0])
        })

        it('Should throw if invests are not yet mature.', () => {
            const bc = makeStartedEco()

            const futureInvests = buildInvestIndexes(DATE3, 1)
            bc.lastblock.invests = futureInvests

            assert.throws(
                () => bc.order(mySk, myPk, futureInvests, DATE2),
                InvalidTransactionError,
                'Some invests are not yet available.'
            )
        })

        it('Should throw if no payerOrder authorizes these invests.', () => {
            const bc = makeStartedEco()

            const invests = buildInvestIndexes(DATE2, 1)
            bc.lastblock.invests = invests

            assert.throws(
                () => bc.order(mySk, targetPk, invests, DATE2),
                InvalidTransactionError
            )
        })

        it('Should succeed when invest date equals order date.', () => {
            const bc = makeStartedEco()

            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            const invests = buildInvestIndexes(DATE2, 1)
            bc.lastblock.invests = invests
            bc.receivePayerOrder(mySk,new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2))

            assert.doesNotThrow(() => bc.order(mySk, targetPk, invests, DATE2))
        })
    })

    describe('earn', () => {
        it('Should throw UnauthorizedError if heartSk does not match getMyPublicKey.', () => {
            const bc = makeStartedEco()

            assert.throws(() => bc.earn(referentSk, adminPk, [20250101000], DATE2))
        })

        it('Should create an EarnTransaction and remove money from lastblock.', () => {
            const bc = makeStartedEco()

            bc.lastblock.money = [20250101000, 20250101001, 20250101002]
            const tx = bc.earn(mySk, adminPk, [20250101000], DATE2)

            assert.equal(tx.type, TXTYPE.EARN)
            assert.equal(tx.target, adminPk)
            assert.deepEqual(tx.money, [20250101000])
            assert.ok(tx.isValid())
            assert.notInclude(bc.lastblock.money, 20250101000)
        })

        it('Should only remove one occurrence per requested id, even if the id appears more than once (different citizens can generate the same money id).', () => {
            const bc = makeStartedEco()

            bc.lastblock.money = [20250101000, 20250101000, 20250101001]
            bc.earn(mySk, adminPk, [20250101000], DATE2)

            assert.deepEqual(bc.lastblock.money, [20250101000, 20250101001])
        })
    })

    describe('distributeSalary', () => {
        it('Should throw UnauthorizedError if heartSk does not match getMyPublicKey.', () => {
            const bc = makeStartedEco()

            bc.lastblock.money = [20250101000]

            assert.throws(() => bc.distributeSalary(referentSk, DATE2))
        })

        it('Should return empty array if no money available.', () => {
            const bc = makeStartedEco()
            ecoSetActor(bc,adminSk, adminPk, 3, DATE2)
            const earns = bc.distributeSalary(mySk, DATE2)
            assert.deepEqual(earns, [])
        })

        it('Should distribute money to actors proportionally.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, adminPk, 3, DATE2)
            ecoSetActor(bc,adminSk, referentPk, 2, DATE2)
            bc.lastblock.money = [
                20250101000, 20250101001, 20250101002,
                20250101003, 20250101004
            ]
            const earns = bc.distributeSalary(mySk, DATE2)

            assert.equal(earns.length, 2)
            const earnForTarget = earns.find(e => e.target === adminPk)
            const earnForReferent = earns.find(e => e.target === referentPk)
            assert.equal(earnForTarget.money.length, 3)
            assert.equal(earnForReferent.money.length, 2)
        })

        it('Should do multiple cycles if money allows it.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, adminPk, 3, DATE2)
            ecoSetActor(bc,adminSk, referentPk, 2, DATE2)
            bc.lastblock.money = [
                20250101000, 20250101001, 20250101002, 20250101003, 20250101004,
                20250101005, 20250101006, 20250101007, 20250101008, 20250101009
            ]
            const earns = bc.distributeSalary(mySk, DATE2)

            const earnForTarget = earns.find(e => e.target === adminPk)
            const earnForReferent = earns.find(e => e.target === referentPk)
            assert.equal(earnForTarget.money.length, 6)
            assert.equal(earnForReferent.money.length, 4)
        })

        it('Should not distribute money that does not complete a cycle.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, adminPk, 3, DATE2)
            ecoSetActor(bc,adminSk, referentPk, 2, DATE2)
            bc.lastblock.money = [
                20250101000, 20250101001, 20250101002,
                20250101003, 20250101004, 20250101005, 20250101006
            ]
            const earns = bc.distributeSalary(mySk, DATE2)

            const earnForTarget = earns.find(e => e.target === adminPk)
            const earnForReferent = earns.find(e => e.target === referentPk)
            assert.equal(earnForTarget.money.length, 3)
            assert.equal(earnForReferent.money.length, 2)
            assert.equal(bc.lastblock.money.length, 2)
        })

        it('Should remove distributed money from lastblock.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, adminPk, 2, DATE2)
            bc.lastblock.money = [20250101000, 20250101001]
            bc.distributeSalary(mySk, DATE2)

            assert.equal(bc.lastblock.money.length, 0)
        })

        it('Should not distribute money whose date has not been reached yet.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, adminPk, 1, DATE2)
            bc.lastblock.money = [
                20250101000,
                20250103000,
            ]
            const earns = bc.distributeSalary(mySk, DATE2)

            assert.equal(earns.length, 1)
            assert.equal(earns[0].money.length, 1)
            assert.equal(earns[0].money[0], 20250101000)
            assert.equal(bc.lastblock.money.length, 1)
            assert.equal(bc.lastblock.money[0], 20250103000)
        })
    })

    describe('pay (not available on EcosystemBlockchain)', () => {
        it('Should not have a pay method.', () => {
            const bc = makeStartedEco()
            assert.isUndefined(bc.pay)
        })
    })

    describe('serialization round-trip', () => {
        it('Should deserialize to an EcosystemBlockchain with isValidated() = true.', () => {
            const bc = makeStartedEco()

            const exported = bc.export()
            const bc2 = new EcosystemBlockchain(exported)

            assert.isTrue(bc2.isValidated())
        })

        it('Should preserve roles after deserialization.', () => {
            const bc = makeStartedEco()

            ecoSetAdmin(bc,adminSk, referentPk, DATE2)
            ecoSetActor(bc,adminSk, referentPk, 5, DATE2)
            const exported = bc.export()
            const bc2 = new EcosystemBlockchain(exported)

            assert.isTrue(bc2.isAdmin(adminPk))
            assert.isTrue(bc2.isAdmin(referentPk))
            assert.equal(bc2.getActors().get(referentPk), 5)
        })

        it('Should preserve EcoBirthBlock and EcoInitializationBlock types after deserialization.', () => {
            const bc = makeStartedEco()

            const exported = bc.export()
            const bc2 = new EcosystemBlockchain(exported)

            assert.instanceOf(bc2.lastblock, EcoInitializationBlock)
            assert.instanceOf(bc2.blocks[bc2.blocks.length - 1], EcoBirthBlock)
        })

        it('Should preserve all transaction types and money/invests across two blocks.', () => {
            const bc = makeStartedEco()

            ecoSetActor(bc,adminSk, referentPk, 3, DATE2)
            ecoSetPayer(bc,adminSk, referentPk, 0, DATE2)
            const engageTx = makeEngageTx(adminSk, myPk, DATE2)
            bc.receiveInvests(engageTx)
            bc.receivePayerOrder(mySk,new PayerOrderTransaction(referentSk, targetPk, engageTx.invests, myPk, DATE2))
            bc.order(mySk, targetPk, engageTx.invests, DATE2)
            bc.lastblock.money = buildMoneyIndexes(DATE2, 6)
            bc.earn(mySk, adminPk, bc.lastblock.money.slice(0, 3), DATE2)

            bc.closeLastBlock(mySk, DATE2)
            ecoSetActor(bc,adminSk, adminPk, 2, DATE3)

            const exported = bc.export()
            const bc2 = new EcosystemBlockchain(exported)

            assert.deepEqual(bc2, bc)
        })
    })

    describe('isValid', () => {
        it('Should return true for a freshly started ecosystem.', () => {
            const bc = makeStartedEco()

            assert.isTrue(bc.isValid())
        })

        it('Should return true after a realistic flow of role changes and a payer order.', () => {
            const bc = makeStartedEco()
            ecoSetActor(bc, adminSk, referentPk, 2, DATE2)
            ecoSetPayer(bc, adminSk, referentPk, 5, DATE2)
            const invests = buildInvestIndexes(DATE2, 2)
            bc.lastblock.invests = invests
            bc.receivePayerOrder(mySk, new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2))

            assert.isTrue(bc.isValid())
        })

        it('Should return false if there are no admins.', () => {
            const bc = makeStartedEco()
            bc.lastblock.transactions = bc.lastblock.transactions.filter(tx => tx.type !== TXTYPE.SETADMIN)

            assert.isFalse(bc.isValid())
        })

        it('Should return false if no actor has a ratio > 0.', () => {
            const bc = makeStartedEco()
            bc.lastblock.transactions = bc.lastblock.transactions.filter(tx => tx.type !== TXTYPE.SETACTOR)

            assert.isFalse(bc.isValid())
        })

        it('Should return false if a payer order in history exceeded the cap in effect at the time.', () => {
            const bc = makeStartedEco()
            ecoSetPayer(bc, adminSk, referentPk, 1, DATE2)
            const invests = buildInvestIndexes(DATE2, 2)
            bc.lastblock.invests = invests
            const tx = new PayerOrderTransaction(referentSk, targetPk, invests, myPk, DATE2)
            // bypass receivePayerOrder's own cap check to simulate a tampered/forged history
            bc._addTransaction(tx)

            assert.isFalse(bc.isValid())
        })

        it('Should return false if the current admin state does not match the replayed history (forged SETADMIN not stemming from history).', () => {
            const bc = makeStartedEco()
            const forgedAdmin = new SetAdminTransaction(referentSk, referentPk, bc.getMyPublicKey(), DATE2)
            bc.lastblock.transactions.unshift(forgedAdmin)

            assert.isFalse(bc.isValid())
        })
    })
})
