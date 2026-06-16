import { encode } from 'msgpack-lite'
import { sha256 } from 'ethereum-cryptography/sha256.js'
import { hexToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { MerkleTree } from 'merkletreejs'
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js'

import { dateToInt, infinityDate, intToDate, publicFromPrivate } from "./crypto.js"
import { CreateTransaction, InitTransaction, SetAdminTransaction, SetActorTransaction, TransactionMaker, TXTYPE } from './Transaction.js'
import { UnauthorizedError, InvalidBlockchainError } from './errors.js'
import { Blockchain } from './Blockchain.js'

export const REF_HASH = '1eb10cdeba5ec1a551cc0defa15ab1e1dea1157e50c1a1e7910ba11eb10cdeba'
export const ECOREF_HASH = 'ec01eb10cec0deba5ec1a551cc0defa15ab1e1dea1157e50c1a1e7910ba1ec01'

export const BLOCKTYPE = {
    CITIZEN: 1,
    ECOSYSTEM: 2,
    CITIZENBIRTH: 3,
    CITIZENINIT: 4,
    ECOSYSTEMBIRTH: 5,
    ECOSYSTEMINIT: 6
}

export class BlockMaker {
    static make(blockObj) {
        switch (blockObj.t) {
            case BLOCKTYPE.CITIZENBIRTH: return new BirthBlock(blockObj)
            case BLOCKTYPE.CITIZENINIT: return new InitializationBlock(blockObj)
            case BLOCKTYPE.ECOSYSTEMBIRTH: return new EcoBirthBlock(blockObj)
            case BLOCKTYPE.ECOSYSTEMINIT: return new EcoInitializationBlock(blockObj)
            case BLOCKTYPE.CITIZEN: return new CitizenBlock(blockObj)
            default: return new Block(blockObj)
        }
    }
}

export class Block {

    constructor(blockObj) {
        if (!("v" in blockObj && "d" in blockObj && "p" in blockObj && "s" in blockObj && "r" in blockObj && "m" in blockObj && "i" in blockObj && "t" in blockObj && "h" in blockObj && "x" in blockObj)) {
            throw new Error('Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (type), "h" (signature) and "x" (transactions) are mandatory.')
        }
        this.version = blockObj.v
        this.closedate = intToDate(infinityDate)
        if ("d" in blockObj && !!blockObj.d) {
            this.closedate = intToDate(blockObj.d)
        }
        this.previousHash = blockObj.p
        this.signer = blockObj.s
        this.root = blockObj.r
        this.money = blockObj.m
        this.invests = blockObj.i
        this.type = blockObj.t
        this.signature = blockObj.h
        this.transactions = blockObj.x.map(tx => TransactionMaker.make(tx))
    }

    toString() {
        return '[Block]'
    }

    get lastTransaction() {
        if (!this.hasTransactions()) {
            return null
        }
        return this.transactions[0]
    }

    hash() {
        const block = {
            v: this.version,
            d: dateToInt(this.closedate),
            p: this.previousHash,
            s: this.signer,
            r: this.root,
            m: this.money,
            i: this.invests,
            t: this.type
        }
        const packedblock = encode(block)
        return sha256(packedblock)
    }

    containsPaper() {
        for (let tx of this.transactions) {
            if (tx.type === TXTYPE.PAPER) {
                return true
            }
        }
        return false
    }

    getPapersHandler() {
        let handler = null
        for (let tx of this.transactions) {
            if (tx.type === TXTYPE.PAPER) {
                if (handler && handler !== tx.target) {
                    throw new Error('Invalid Block : multi-origin Papers are not allowed.')
                }
                handler = tx.target
            }
        }
        return handler
    }

    sign(sk, closedate = new Date()) {
        if (this.isSigned()) {
            throw new UnauthorizedError('Block is already signed.')
        }

        const pk = publicFromPrivate(sk)
        if (!this.canBeSignedBy(pk)) {
            throw new UnauthorizedError('Only Paper signer can seal a block with it.')
        }

        this.merkle()
        this.signer = pk
        this.closedate = intToDate(dateToInt(closedate))

        const hash = this.hash()
        sk = hexToBytes(sk)
        this.signature = toHex(secp256k1.sign(hash, sk).toDERRawBytes())
        return this.signature
    }

    canBeSignedBy(pk) {
        if (this.containsPaper()) {
            const paperHandler = this.getPapersHandler()
            if (pk !== paperHandler) {
                return false
            }
        }
        return true
    }

    export() {
        return {
            v: this.version,
            d: dateToInt(this.closedate),
            p: this.previousHash,
            s: this.signer,
            r: this.root,
            m: this.money,
            i: this.invests,
            t: this.type,
            h: this.signature,
            x: this.transactions.map(tx => tx.export())
        }
    }

    add(transaction) {
        this.transactions.unshift(transaction)
        if (transaction.type === TXTYPE.CREATE) {
            this.money = this.money.concat(transaction.money)
            this.invests = this.invests.concat(transaction.invests)
        }
    }

    merkle() {
        const leaves = this.transactions.map(x => x.signature)
        const tree = new MerkleTree(leaves, sha256)
        const root = tree.getRoot().toString('hex')
        this.root = root
        return root
    }

    hasTransactions() {
        return this.transactions.length > 0
    }

    isValid() {
        try {
            this.assertIsValid()
            return true
        } catch {
            return false
        }
    }

    assertIsValid() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) throw new InvalidBlockchainError(`Transaction ${tx.signature} is invalid.`)
        }

        let papersTarget = null
        for (const tx of this.transactions) {
            if (tx.type === TXTYPE.PAPER) {
                if (papersTarget !== null && papersTarget !== tx.target)
                    throw new InvalidBlockchainError('Block contains papers with different targets.')
                papersTarget = tx.target
            }
        }

        if (this.signature) {
            if (!this.isSigned()) throw new InvalidBlockchainError('Block signature does not verify.')

            const leaves = this.transactions.map(x => x.signature)
            const tree = new MerkleTree(leaves, sha256)
            if (this.root !== tree.getRoot().toString('hex'))
                throw new InvalidBlockchainError('Block merkle root does not match its transactions.')

            if (papersTarget !== null && this.signer !== papersTarget)
                throw new InvalidBlockchainError('Block signer does not match the papers target.')
        }
    }

    isSigned() {
        try {
            return secp256k1.verify(this.signature, this.hash(), this.signer)
        } catch {
            return false
        }
    }

    /**
     * Return the list of all available Money
     * If amount > 0, return only this amount of Money
     * If amount is not affordable, return empty array []
     */
    getAvailableMoney(amount = -1) {
        if (amount < 0) {
            return this.money
        }

        if (amount > this.money.length) {
            return []
        }

        return this.money.slice(0, amount)
    }

    getAvailableMoneyAmount() {
        return this.getAvailableMoney().length
    }

    getEngagedInvests(date = null) {
        let invests = []
        for (let tx of this.transactions) {
            invests = invests.concat(tx.getEngagedInvests(date))
        }
        return invests
    }

    getEngagedMoney(date = null) {
        let money = []
        for (let tx of this.transactions) {
            money = money.concat(tx.getEngagedMoney(date))
        }
        return money
    }

    getMyPublicKey() {
        for (let tx of this.transactions) {
            if (tx.type === TXTYPE.CREATE) {
                return tx.signer
            }
        }
        return null
    }
}

export class CitizenBlock extends Block {

    constructor(blockObj) {
        if (!("e" in blockObj)) {
            throw new Error('Field "e" (experience) is mandatory.')
        }
        super(blockObj)
        this.experience = blockObj.e
    }

    toString() {
        return '[CitizenBlock]'
    }

    hash() {
        const block = {
            v: this.version,
            d: dateToInt(this.closedate),
            p: this.previousHash,
            s: this.signer,
            r: this.root,
            m: this.money,
            i: this.invests,
            t: this.type,
            e: this.experience
        }
        const packedblock = encode(block)
        return sha256(packedblock)
    }

    export() {
        return { ...super.export(), e: this.experience }
    }
}

export class BirthBlock extends CitizenBlock {
    constructor(objOrSk, birthdate = null, name = null, date = new Date()) {
        if (typeof objOrSk === 'object' && birthdate === null && name === null) {
            super(objOrSk)
        } else {
            super({
                v: Blockchain.VERSION,
                d: dateToInt(date),
                p: REF_HASH,
                s: publicFromPrivate(objOrSk),
                r: 0,
                m: [],
                i: [],
                t: BLOCKTYPE.CITIZENBIRTH,
                e: 0,
                h: null,
                x: []
            })

            this.add(new InitTransaction(objOrSk, name, birthdate))
            this.add(new CreateTransaction(objOrSk, 1, date))
            this.sign(objOrSk, date)
        }
    }

    toString() { return '[BirthBlock]' }

    getMyPublicKey() { return this.signer }

    assertIsValid() {
        super.assertIsValid()
        if (!this.isSigned()) throw new InvalidBlockchainError('BirthBlock must be signed.')
        if (this.previousHash !== REF_HASH) throw new InvalidBlockchainError('BirthBlock previousHash must be REF_HASH.')
        if (this.version !== Blockchain.VERSION) throw new InvalidBlockchainError('BirthBlock version mismatch.')
        if (this.transactions.length !== 2) throw new InvalidBlockchainError('BirthBlock must have exactly 2 transactions (INIT, CREATE).')
        if (this.money.length !== 1) throw new InvalidBlockchainError('BirthBlock must have exactly 1 money id.')
        if (this.invests.length !== 1) throw new InvalidBlockchainError('BirthBlock must have exactly 1 invest id.')
        if (this.experience !== 0) throw new InvalidBlockchainError('BirthBlock experience must be 0.')
    }
}

export class InitializationBlock extends CitizenBlock {
    constructor(objOrSk, previousBlock = null, date = new Date()) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null
            && previousBlock === null) {
            super(objOrSk)
        } else {
            super({
                v: Blockchain.VERSION,
                d: dateToInt(date),
                p: previousBlock.signature,
                s: publicFromPrivate(objOrSk),
                r: 0,
                m: previousBlock.money,
                i: previousBlock.invests,
                t: BLOCKTYPE.CITIZENINIT,
                e: 0,
                h: null,
                x: []
            })

            this.sign(objOrSk, date)
        }
    }

    toString() { return '[InitializationBlock]' }

    getMyPublicKey() { return null }

    assertIsValid() {
        super.assertIsValid()
        if (!this.isSigned()) throw new InvalidBlockchainError('InitializationBlock must be signed.')
        if (this.version !== Blockchain.VERSION) throw new InvalidBlockchainError('InitializationBlock version mismatch.')
        if (this.transactions.length !== 0) throw new InvalidBlockchainError('InitializationBlock must have no transactions.')
        if (this.money.length !== 1) throw new InvalidBlockchainError('InitializationBlock must have exactly 1 money id.')
        if (this.invests.length !== 1) throw new InvalidBlockchainError('InitializationBlock must have exactly 1 invest id.')
        if (this.experience !== 0) throw new InvalidBlockchainError('InitializationBlock experience must be 0.')
    }
}

export class EcoBirthBlock extends Block {
    constructor(objOrSk, adminPk = null, name = null, date = new Date()) {
        if (typeof objOrSk === 'object' && adminPk === null && name === null) {
            super(objOrSk)
        } else {
            super({
                v: Blockchain.VERSION,
                d: dateToInt(date),
                p: ECOREF_HASH,
                s: publicFromPrivate(objOrSk),
                r: 0,
                m: [],
                i: [],
                t: BLOCKTYPE.ECOSYSTEMBIRTH,
                h: null,
                x: []
            })
            const ecosystemPk = publicFromPrivate(objOrSk)
            this.add(new InitTransaction(objOrSk, name, date))
            this.add(new SetAdminTransaction(objOrSk, adminPk, ecosystemPk, date))
            this.add(new SetActorTransaction(objOrSk, adminPk, 1, ecosystemPk, date))
            this.sign(objOrSk, date)
        }
    }

    toString() { return '[EcoBirthBlock]' }

    getMyPublicKey() { return this.signer }

    assertIsValid() {
        super.assertIsValid()
        if (!this.isSigned()) throw new InvalidBlockchainError('EcoBirthBlock must be signed.')
        if (this.previousHash !== ECOREF_HASH) throw new InvalidBlockchainError('EcoBirthBlock previousHash must be ECOREF_HASH.')
        if (this.version !== Blockchain.VERSION) throw new InvalidBlockchainError('EcoBirthBlock version mismatch.')
        if (this.transactions.length !== 3) throw new InvalidBlockchainError('EcoBirthBlock must have exactly 3 transactions (INIT, SETADMIN, SETACTOR).')
        if (this.money.length !== 0) throw new InvalidBlockchainError('EcoBirthBlock must have no money.')
        if (this.invests.length !== 0) throw new InvalidBlockchainError('EcoBirthBlock must have no invests.')
    }
}

export class EcoInitializationBlock extends Block {
    constructor(objOrSk, previousBlock = null, date = new Date()) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null
            && previousBlock === null) {
            super(objOrSk)
        } else {
            super({
                v: Blockchain.VERSION,
                d: dateToInt(date),
                p: previousBlock.signature,
                s: publicFromPrivate(objOrSk),
                r: 0,
                m: [], i: [], t: BLOCKTYPE.ECOSYSTEMINIT, h: null, x: []
            })
            const roleTxTypes = new Set([TXTYPE.SETADMIN, TXTYPE.SETACTOR, TXTYPE.SETPAYER])
            for (const tx of previousBlock.transactions) {
                if (roleTxTypes.has(tx.type)) {
                    this.transactions.push(tx)
                }
            }
            this.sign(objOrSk, date)
        }
    }

    toString() { return '[EcoInitializationBlock]' }

    getMyPublicKey() { return null }

    assertIsValid() {
        super.assertIsValid()
        if (!this.isSigned()) throw new InvalidBlockchainError('EcoInitializationBlock must be signed.')
        if (this.version !== Blockchain.VERSION) throw new InvalidBlockchainError('EcoInitializationBlock version mismatch.')
        if (this.money.length !== 0) throw new InvalidBlockchainError('EcoInitializationBlock must have no money.')
        if (this.invests.length !== 0) throw new InvalidBlockchainError('EcoInitializationBlock must have no invests.')
    }
}
