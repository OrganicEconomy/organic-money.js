import { InvalidTransactionError, UnauthorizedError, InvalidBlockchainError } from './errors.js'
import { Blockchain } from './Blockchain.js'
import { randomPrivateKey, dateToInt, unitIdToDateInt, investIdToMoneyId, hasEnoughOccurrences } from './crypto.js'
import { Block, EcoBirthBlock, EcoInitializationBlock, BLOCKTYPE } from './Block.js'
import {
    SetAdminTransaction, UnsetAdminTransaction,
    SetActorTransaction, UnsetActorTransaction,
    SetPayerTransaction, UnsetPayerTransaction,
    PayerOrderTransaction, EarnTransaction,
    EngageTransaction, TXTYPE
} from './Transaction.js'

export class EcosystemBlockchain extends Blockchain {

    _createNewBlock(data) {
        return new Block({ ...data, t: BLOCKTYPE.ECOSYSTEM })
    }

    isWaitingValidation() {
        return this.blocks.length === 1 && this.lastblock instanceof EcoBirthBlock
    }

    isValidated() {
        return this.blocks.length >= 2
            && this.blocks[this.blocks.length - 2] instanceof EcoInitializationBlock
            && this.blocks[this.blocks.length - 1] instanceof EcoBirthBlock
    }

    makeBirthBlock(privateKey, adminPk, name, date = new Date()) {
        privateKey = privateKey || randomPrivateKey()
        const block = new EcoBirthBlock(privateKey, adminPk, name, date)
        this.addBlock(block)
        return privateKey
    }

    validateAccount(secretKey, date = new Date()) {
        const block = new EcoInitializationBlock(secretKey, this.lastblock, date)
        this.addBlock(block)
        return block
    }

    startBlockchain(name, signerSk, adminPk, secretKey = null, date = new Date()) {
        secretKey = this.makeBirthBlock(secretKey, adminPk, name, date)
        this.validateAccount(signerSk, date)
        return secretKey
    }

    getAdmins() {
        const state = new Map()
        for (const tx of this.lastblock.transactions.slice().reverse()) {
            if (tx.type === TXTYPE.SETADMIN)   state.set(tx.target, true)
            if (tx.type === TXTYPE.UNSETADMIN) state.set(tx.target, false)
        }
        return new Set([...state].filter(([, v]) => v).map(([k]) => k))
    }

    getActors() {
        const state = new Map()
        for (const tx of this.lastblock.transactions.slice().reverse()) {
            if (tx.type === TXTYPE.SETACTOR)   state.set(tx.target, tx.ratio)
            if (tx.type === TXTYPE.UNSETACTOR) state.set(tx.target, null)
        }
        return new Map([...state].filter(([, v]) => v !== null))
    }

    getPayers() {
        const state = new Map()
        for (const tx of this.lastblock.transactions.slice().reverse()) {
            if (tx.type === TXTYPE.SETPAYER)   state.set(tx.target, tx.cap)
            if (tx.type === TXTYPE.UNSETPAYER) state.set(tx.target, null)
        }
        return new Map([...state].filter(([, v]) => v !== null))
    }

    isAdmin(pk)  { return this.getAdmins().has(pk) }
    isActor(pk)  { return this.getActors().has(pk) }
    isPayer(pk)  { return this.getPayers().has(pk) }

    getAffordableInvestsAmount(date = new Date()) {
        const dateInt = dateToInt(date)
        return this.lastblock.invests.filter(i => unitIdToDateInt(i) <= dateInt).length
    }

    /**
     * Beyond the generic Blockchain checks, verifies invariants that only make
     * sense for an ecosystem:
     *   - the current state always has at least one admin and one actor with ratio > 0
     *   - (full history only, depth=0) replaying every role transaction chronologically
     *     reproduces exactly the admins/actors/payers reported by the current block,
     *     and no PAYERORDER ever exceeded the payer cap in effect at the time
     */
    isValid(depth = 0) {
        try {
            this.assertIsValid(depth)
            return true
        } catch {
            return false
        }
    }

    assertIsValid(depth = 0) {
        super.assertIsValid(depth)

        if (this.getAdmins().size === 0) throw new InvalidBlockchainError('Ecosystem must have at least one admin.')
        const actors = this.getActors()
        if (![...actors.values()].some(ratio => ratio > 0)) throw new InvalidBlockchainError('Ecosystem must have at least one actor with a ratio > 0.')

        if (depth === 0) {
            const chronologicalBlocks = this.blocks.slice().reverse()
            const admins = new Set()
            const replayedActors = new Map()
            const payerCaps = new Map()
            const payerOrderSigs = new Set()
            const consumedPayerOrders = new Set()

            for (const block of chronologicalBlocks) {
                for (const tx of block.transactions.slice().reverse()) {
                    if (tx.type === TXTYPE.SETADMIN) admins.add(tx.target)
                    if (tx.type === TXTYPE.UNSETADMIN) admins.delete(tx.target)
                    if (tx.type === TXTYPE.SETACTOR) replayedActors.set(tx.target, tx.ratio)
                    if (tx.type === TXTYPE.UNSETACTOR) replayedActors.delete(tx.target)
                    if (tx.type === TXTYPE.SETPAYER) payerCaps.set(tx.target, tx.cap)
                    if (tx.type === TXTYPE.UNSETPAYER) payerCaps.delete(tx.target)
                    if (tx.type === TXTYPE.PAYERORDER) {
                        const cap = payerCaps.get(tx.signer)
                        if (cap === undefined) throw new InvalidBlockchainError('A PAYERORDER was issued by a non-payer at the time it was recorded.')
                        if (cap !== -1 && tx.invests.length > cap) throw new InvalidBlockchainError('A PAYERORDER exceeded the payer cap in effect at the time.')
                        payerOrderSigs.add(tx.signature)
                    }
                    if (tx.type === TXTYPE.EARN && tx.x) {
                        if (!payerOrderSigs.has(tx.x))
                            throw new InvalidBlockchainError('An EARN references a PayerOrder that does not exist in the chain.')
                        if (consumedPayerOrders.has(tx.x))
                            throw new InvalidBlockchainError('A PayerOrder has been exercised more than once.')
                        consumedPayerOrders.add(tx.x)
                    }
                }
            }

            const currentAdmins = this.getAdmins()
            if (admins.size !== currentAdmins.size) throw new InvalidBlockchainError('The replayed admin history does not match the current admin set.')
            for (const pk of admins) {
                if (!currentAdmins.has(pk)) throw new InvalidBlockchainError('The replayed admin history does not match the current admin set.')
            }

            if (replayedActors.size !== actors.size) throw new InvalidBlockchainError('The replayed actor history does not match the current actor set.')
            for (const [pk, ratio] of replayedActors) {
                if (actors.get(pk) !== ratio) throw new InvalidBlockchainError('The replayed actor history does not match the current actor set.')
            }

            const currentPayers = this.getPayers()
            if (payerCaps.size !== currentPayers.size) throw new InvalidBlockchainError('The replayed payer history does not match the current payer set.')
            for (const [pk, cap] of payerCaps) {
                if (currentPayers.get(pk) !== cap) throw new InvalidBlockchainError('The replayed payer history does not match the current payer set.')
            }
        }
    }

    newBlock() {
        const oldTransactions = this.lastblock.transactions
        const activeAdmins = this.getAdmins()
        const activeActors = this.getActors()
        const activePayers = this.getPayers()

        super.newBlock()

        const newBlock = this.lastblock
        const copiedAdmins = new Set()
        const copiedActors = new Set()
        const copiedPayers = new Set()

        for (const tx of oldTransactions) {
            if (tx.type === TXTYPE.SETADMIN && activeAdmins.has(tx.target) && !copiedAdmins.has(tx.target)) {
                newBlock.transactions.push(tx)
                copiedAdmins.add(tx.target)
            }
            if (tx.type === TXTYPE.SETACTOR && activeActors.has(tx.target) && !copiedActors.has(tx.target)) {
                newBlock.transactions.push(tx)
                copiedActors.add(tx.target)
            }
            if (tx.type === TXTYPE.SETPAYER && activePayers.has(tx.target) && activePayers.get(tx.target) !== 0 && !copiedPayers.has(tx.target)) {
                newBlock.transactions.push(tx)
                copiedPayers.add(tx.target)
            }
        }
    }

    #assertValidRatio(ratio) {
        if (!Number.isInteger(ratio) || ratio < 0)
            throw new InvalidTransactionError('Ratio must be a non-negative integer.')
    }

    #assertValidCap(cap) {
        if (!Number.isInteger(cap) || cap < -1)
            throw new InvalidTransactionError('Cap must be a non-negative integer.')
    }

    #assertTargetsMe(pk) {
        if (pk !== this.getMyPublicKey())
            throw new InvalidTransactionError('Transaction not targeting this ecosystem')
    }

    #assertReceivable(tx, type) {
        if (tx.type !== type || !tx.isValid())
            throw new InvalidTransactionError('Invalid transaction')
        this.#assertTargetsMe(tx.ecosystem)
        if (!this.isAdmin(tx.signer))
            throw new UnauthorizedError('Only admins can perform this action.')
    }

    receiveSetAdmin(tx) {
        this.#assertReceivable(tx, TXTYPE.SETADMIN)
        this._addTransaction(tx)
        return tx
    }

    receiveUnsetAdmin(tx) {
        this.#assertReceivable(tx, TXTYPE.UNSETADMIN)
        if (this.getAdmins().size <= 1) throw new InvalidTransactionError('Cannot remove the last admin.')
        this._addTransaction(tx)
        return tx
    }

    receiveSetActor(tx) {
        this.#assertReceivable(tx, TXTYPE.SETACTOR)
        this.#assertValidRatio(tx.ratio)
        if (tx.ratio === 0) {
            const otherWithRatio = [...this.getActors().entries()].some(([pk, r]) => pk !== tx.target && r > 0)
            if (!otherWithRatio) throw new InvalidTransactionError('At least one actor must have a ratio > 0.')
        }
        this._addTransaction(tx)
        return tx
    }

    receiveUnsetActor(tx) {
        this.#assertReceivable(tx, TXTYPE.UNSETACTOR)
        if (this.isAdmin(tx.target)) throw new InvalidTransactionError('Cannot remove actor who is still admin.')
        if (this.isPayer(tx.target)) throw new InvalidTransactionError('Cannot remove actor who is still payer.')
        const actorRatio = this.getActors().get(tx.target)
        if (actorRatio > 0) {
            const otherWithRatio = [...this.getActors().entries()].some(([pk, r]) => pk !== tx.target && r > 0)
            if (!otherWithRatio) throw new InvalidTransactionError('At least one actor must have a ratio > 0.')
        }
        this._addTransaction(tx)
        return tx
    }

    receiveSetPayer(tx) {
        this.#assertReceivable(tx, TXTYPE.SETPAYER)
        this.#assertValidCap(tx.cap)
        this._addTransaction(tx)
        return tx
    }

    receiveUnsetPayer(tx) {
        this.#assertReceivable(tx, TXTYPE.UNSETPAYER)
        this._addTransaction(tx)
        return tx
    }

    receiveInvests(engageTx) {
        if (engageTx.type !== TXTYPE.ENGAGE || !engageTx.isValid())
            throw new InvalidTransactionError('Invalid transaction')
        this.#assertTargetsMe(engageTx.target)
        if (engageTx.invests.length === 0)
            throw new InvalidTransactionError('No invests in transaction')
        this._addTransaction(engageTx)
        this.lastblock.invests = this.lastblock.invests.concat(engageTx.invests)
        return engageTx
    }

    receivePay(payTx) {
        if (payTx.type !== TXTYPE.PAY || !payTx.isValid())
            throw new InvalidTransactionError('Invalid transaction')
        this.#assertTargetsMe(payTx.target)
        this._addTransaction(payTx)
        this.lastblock.money = this.lastblock.money.concat(payTx.money)
        return payTx
    }

    receiveEarn(earnTx) {
        super.receiveEarn(earnTx)
        this.lastblock.money = this.lastblock.money.concat(earnTx.money)
        return earnTx
    }

    cashPaper(tx) {
        super.cashPaper(tx)
        this.lastblock.money = this.lastblock.money.concat(tx.money)
        return tx
    }

    receiveMoney(engageTx) {
        if (engageTx.type !== TXTYPE.ENGAGE || !engageTx.isValid())
            throw new InvalidTransactionError('Invalid transaction')
        this.#assertTargetsMe(engageTx.target)
        if (engageTx.money.length === 0)
            throw new InvalidTransactionError('No money in transaction')
        this._addTransaction(engageTx)
        this.lastblock.money = this.lastblock.money.concat(engageTx.money)
        return engageTx
    }

    receivePayerOrder(ecoSk, tx) {
        this._assertOwner(ecoSk)
        if (tx.type !== TXTYPE.PAYERORDER || !tx.isValid())
            throw new InvalidTransactionError('Invalid transaction.')
        this.#assertTargetsMe(tx.ecosystem)
        if (!this.isPayer(tx.signer))
            throw new UnauthorizedError('Only payers can create payment orders.')
        const cap = this.getPayers().get(tx.signer)
        if (cap !== -1 && tx.invests.length > cap)
            throw new InvalidTransactionError('Order exceeds payer capacity.')
        const allInvestsAvailable = hasEnoughOccurrences(this.lastblock.invests, tx.invests)
        if (!allInvestsAvailable)
            throw new InvalidTransactionError('Ecosystem does not have these invests available.')
        const orderDateInt = dateToInt(tx.date)
        const allInvestsMature = tx.invests.every(i => unitIdToDateInt(i) <= orderDateInt)
        if (!allInvestsMature)
            throw new InvalidTransactionError('Some invests are not yet available.')
        this._addTransaction(tx)
        if (cap !== -1) {
            const remainingCap = cap - tx.invests.length
            const capUpdate = new SetPayerTransaction(ecoSk, tx.signer, remainingCap, this.getMyPublicKey(), tx.date)
            this._addTransaction(capUpdate)
        }
        return tx
    }

    order(ecoSk, targetPk, invests, date = new Date()) {
        this._assertOwner(ecoSk)
        const allInvestsAvailable = hasEnoughOccurrences(this.lastblock.invests, invests)
        if (!allInvestsAvailable)
            throw new InvalidTransactionError('Ecosystem does not have these invests available.')
        const orderDateInt = dateToInt(date)
        const allInvestsMature = invests.every(i => unitIdToDateInt(i) <= orderDateInt)
        if (!allInvestsMature)
            throw new InvalidTransactionError('Some invests are not yet available.')
        const consumedPayerOrderSigs = new Set(
            this.lastblock.transactions
                .filter(tx => tx.type === TXTYPE.EARN && tx.x)
                .map(tx => tx.x)
        )
        const payerOrder = this.lastblock.transactions.find(tx =>
            tx.type === TXTYPE.PAYERORDER &&
            tx.target === targetPk &&
            !consumedPayerOrderSigs.has(tx.signature) &&
            hasEnoughOccurrences(tx.invests, invests)
        )
        if (!payerOrder)
            throw new InvalidTransactionError('No payer authorization for these invests.')
        const money = invests.map(investIdToMoneyId)
        this.removeInvests(invests)
        this.lastblock.money = this.lastblock.money.concat(money)
        return this.earn(ecoSk, targetPk, money, payerOrder.signature, date)
    }

    earn(heartSk, actorPk, money, payerOrderSig = null, date = new Date()) {
        this._assertOwner(heartSk)
        const tx = new EarnTransaction(heartSk, actorPk, money, payerOrderSig, date)
        this._addTransaction(tx)
        this.removeMoney(money)
        return tx
    }

    distributeSalary(heartSk, date = new Date()) {
        this._assertOwner(heartSk)
        const actors = this.getActors()
        const totalRatio = [...actors.values()].reduce((sum, r) => sum + r, 0)
        if (totalRatio === 0) return []
        const dateInt = dateToInt(date)
        const availableMoney = this.lastblock.money.filter(id => unitIdToDateInt(id) <= dateInt)
        const cycles = Math.floor(availableMoney.length / totalRatio)
        if (cycles === 0) return []

        const earns = []
        let offset = 0
        for (const [actorPk, ratio] of actors) {
            if (ratio === 0) continue
            const money = availableMoney.slice(offset, offset + ratio * cycles)
            offset += ratio * cycles
            const tx = this.earn(heartSk, actorPk, money, null, date)
            earns.push(tx)
        }
        return earns
    }
}
