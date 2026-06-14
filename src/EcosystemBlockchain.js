import { InvalidTransactionError, UnauthorizedError } from './errors.js'
import { Blockchain } from './Blockchain.js'
import { randomPrivateKey, publicFromPrivate, dateToInt, unitIdToDateInt, investIdToMoneyId } from './crypto.js'
import { EcoBirthBlock, EcoInitializationBlock, ECOREF_HASH, BlockMaker } from './Block.js'
import {
    SetAdminTransaction, UnsetAdminTransaction,
    SetActorTransaction, UnsetActorTransaction,
    SetPayerTransaction, UnsetPayerTransaction,
    PayerOrderTransaction, EarnTransaction,
    EngageTransaction, TXTYPE
} from './Transaction.js'

export class EcosystemBlockchain extends Blockchain {

    constructor(blocks = []) {
        super([])
        blocks = blocks || []
        for (let i = 0; i < blocks.length; i++) {
            const obj = blocks[i]
            const isInit = i < blocks.length - 1 && blocks[i + 1].p === ECOREF_HASH
            if (isInit)  this.bks.push(new EcoInitializationBlock(obj))
            else              this.bks.push(BlockMaker.make(obj))
        }
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
            if (tx.type === TXTYPE.SETPAYER && activePayers.has(tx.target) && !copiedPayers.has(tx.target)) {
                newBlock.transactions.push(tx)
                copiedPayers.add(tx.target)
            }
        }
    }

    #assertAdmin(sk) {
        const pk = publicFromPrivate(sk)
        if (!this.isAdmin(pk)) throw new UnauthorizedError('Only admins can perform this action.')
        return pk
    }

    #assertIsMe(sk) {
        if (publicFromPrivate(sk) !== this.getMyPublicKey())
            throw new UnauthorizedError('Private key does not match blockchain owner.')
    }

    setAdmin(adminSk, targetPk, date = new Date()) {
        this.#assertAdmin(adminSk)
        const tx = new SetAdminTransaction(adminSk, targetPk, date)
        this.addTransaction(tx)
        return tx
    }

    unsetAdmin(adminSk, targetPk, date = new Date()) {
        this.#assertAdmin(adminSk)
        if (this.getAdmins().size <= 1) throw new InvalidTransactionError('Cannot remove the last admin.')
        const tx = new UnsetAdminTransaction(adminSk, targetPk, date)
        this.addTransaction(tx)
        return tx
    }

    setActor(adminSk, targetPk, ratio, date = new Date()) {
        this.#assertAdmin(adminSk)
        if (ratio === 0) {
            const otherWithRatio = [...this.getActors().entries()].some(([pk, r]) => pk !== targetPk && r > 0)
            if (!otherWithRatio) throw new InvalidTransactionError('At least one actor must have a ratio > 0.')
        }
        const tx = new SetActorTransaction(adminSk, targetPk, ratio, date)
        this.addTransaction(tx)
        return tx
    }

    unsetActor(adminSk, targetPk, date = new Date()) {
        this.#assertAdmin(adminSk)
        if (this.isAdmin(targetPk)) throw new InvalidTransactionError('Cannot remove actor who is still admin.')
        if (this.isPayer(targetPk)) throw new InvalidTransactionError('Cannot remove actor who is still payer.')
        const actorRatio = this.getActors().get(targetPk)
        if (actorRatio > 0) {
            const otherWithRatio = [...this.getActors().entries()].some(([pk, r]) => pk !== targetPk && r > 0)
            if (!otherWithRatio) throw new InvalidTransactionError('At least one actor must have a ratio > 0.')
        }
        const tx = new UnsetActorTransaction(adminSk, targetPk, date)
        this.addTransaction(tx)
        return tx
    }

    setPayer(adminSk, targetPk, cap, date = new Date()) {
        this.#assertAdmin(adminSk)
        const tx = new SetPayerTransaction(adminSk, targetPk, cap, date)
        this.addTransaction(tx)
        return tx
    }

    unsetPayer(adminSk, targetPk, date = new Date()) {
        this.#assertAdmin(adminSk)
        const tx = new UnsetPayerTransaction(adminSk, targetPk, date)
        this.addTransaction(tx)
        return tx
    }

    receiveInvests(engageTx) {
        if (engageTx.type !== TXTYPE.ENGAGE || !engageTx.isValid())
            throw new InvalidTransactionError('Invalid transaction')
        if (engageTx.target !== this.getMyPublicKey())
            throw new InvalidTransactionError('Transaction not targeting this ecosystem')
        if (engageTx.invests.length === 0)
            throw new InvalidTransactionError('No invests in transaction')
        this.addTransaction(engageTx)
        this.lastblock.invests = this.lastblock.invests.concat(engageTx.invests)
        return engageTx
    }

    receivePayerOrder(tx) {
        if (tx.type !== TXTYPE.PAYERORDER || !tx.isValid())
            throw new InvalidTransactionError('Invalid transaction.')
        if (tx.ecosystem !== this.getMyPublicKey())
            throw new InvalidTransactionError('Transaction not intended for this ecosystem.')
        if (!this.isPayer(tx.signer))
            throw new UnauthorizedError('Only payers can create payment orders.')
        const cap = this.getPayers().get(tx.signer)
        if (cap > 0 && tx.invests.length > cap)
            throw new InvalidTransactionError('Order exceeds payer capacity.')
        const allInvestsAvailable = tx.invests.every(i => this.lastblock.invests.includes(i))
        if (!allInvestsAvailable)
            throw new InvalidTransactionError('Ecosystem does not have these invests available.')
        const orderDateInt = dateToInt(tx.date)
        const allInvestsMature = tx.invests.every(i => unitIdToDateInt(i) <= orderDateInt)
        if (!allInvestsMature)
            throw new InvalidTransactionError('Some invests are not yet available.')
        this.addTransaction(tx)
        return tx
    }

    order(ecoSk, targetPk, invests, date = new Date()) {
        this.#assertIsMe(ecoSk)
        const allInvestsAvailable = invests.every(i => this.lastblock.invests.includes(i))
        if (!allInvestsAvailable)
            throw new InvalidTransactionError('Ecosystem does not have these invests available.')
        const orderDateInt = dateToInt(date)
        const allInvestsMature = invests.every(i => unitIdToDateInt(i) <= orderDateInt)
        if (!allInvestsMature)
            throw new InvalidTransactionError('Some invests are not yet available.')
        const money = invests.map(investIdToMoneyId)
        this.removeInvests(invests)
        this.lastblock.money = this.lastblock.money.concat(money)
        return this.earn(ecoSk, targetPk, money, date)
    }

    earn(heartSk, actorPk, money, date = new Date()) {
        this.#assertIsMe(heartSk)
        const tx = new EarnTransaction(heartSk, actorPk, money, date)
        this.addTransaction(tx)
        this.removeMoney(money)
        return tx
    }

    distributeSalary(heartSk, date = new Date()) {
        this.#assertIsMe(heartSk)
        const actors = this.getActors()
        const totalRatio = [...actors.values()].reduce((sum, r) => sum + r, 0)
        if (totalRatio === 0) return []
        const availableMoney = this.lastblock.money
        const cycles = Math.floor(availableMoney.length / totalRatio)
        if (cycles === 0) return []

        const earns = []
        let offset = 0
        for (const [actorPk, ratio] of actors) {
            if (ratio === 0) continue
            const money = availableMoney.slice(offset, offset + ratio * cycles)
            offset += ratio * cycles
            const tx = this.earn(heartSk, actorPk, money, date)
            earns.push(tx)
        }
        return earns
    }
}
