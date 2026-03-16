import { encode } from 'msgpack-lite'
import { sha256 } from 'ethereum-cryptography/sha256.js'
import { hexToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { MerkleTree } from 'merkletreejs'
import { signSync, verify } from 'ethereum-cryptography/secp256k1.js'

import { dateToInt, intToDate, publicFromPrivate } from "./crypto.js"
import { CreateTransaction, InitTransaction, TransactionMaker, TXTYPE } from './Transaction.js'
import { UnauthorizedError } from './errors.js'
import { Blockchain } from './Blockchain.js'

export const REF_HASH = 'c1a551ca1c0deea5efea51b1e1dea112ed1dea0a5150f5e11ab1e50c1a15eed5'

export class BlockMaker {
    static make(blockObj) {
        if (blockObj.p ===  REF_HASH) {
            return new BirthBlock(blockObj)
        }
        if (blockObj.h && blockObj.m.length === 1 && blockObj.i.length === 1
        && blockObj.x.length === 0) {
            return new InitializationBlock(blockObj)
        }
        return new Block(blockObj)
    }
}

export class Block {

    constructor(blockObj) {
        if (!("v" in blockObj && "d" in blockObj && "p" in blockObj && "s" in blockObj && "r" in blockObj && "m" in blockObj && "i" in blockObj && "t" in blockObj && "h" in blockObj && "x" in blockObj)) {
            throw new Error('Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        }
        this.version = blockObj.v
        this.closedate = "d" in blockObj ? intToDate(blockObj.d) : null
        this.previousHash = blockObj.p
        this.signer = blockObj.s
        this.root = blockObj.r
        this.money = blockObj.m
        this.invests = blockObj.i
        this.total = blockObj.t
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
            t: this.total
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
        const bytes = signSync(hash, sk)
        this.signature = toHex(bytes)
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
            t: this.total,
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
        return true
    }

    isSigned() {
        return verify(
            this.signature,
            this.hash(),
            this.signer
        )
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

export class BirthBlock extends Block {
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
                t: 0,
                h: null,
                x: []
            })
            
            this.add(new InitTransaction(objOrSk, name, birthdate))
            this.add(new CreateTransaction(objOrSk, 1, date))
            this.sign(objOrSk, date)
        }
    }

    toString() {
        return '[BirthBlock]'
    }

    getMyPublicKey() {
        return this.signer
    }

    // TODO : test it
    isValid() {
        const signature = this.signature
        const messageHash = this.hash(k)
        const publicKey = this.signer

        for (let tx of this.transactions) {
            if (!tx.isValid()) {
                return false;
            }
        }

        return this.previousHash === REF_HASH &&
            this.version === Blockchain.VERSION &&
            this.transactions.length === 2 &&
            this.root === 0 &&
            this.money.length === 1 &&
            this.invests.length === 1 &&
            this.total === 0 &&
            verify(signature, messageHash, publicKey)
    }
}

export class InitializationBlock extends Block {
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
                t: 0,
                h: null,
                x: []
            })

            this.sign(objOrSk, date)
        }
    }

    toString() {
        return '[InitializationBlock]'
    }

    getMyPublicKey() {
        return null
    }

    // TODO : test it
    isValid() {
        const signature = this.signature
        const messageHash = this.hash()
        const publicKey = this.signer

        return this.version === Blockchain.VERSION &&
            this.transactions.length === 0 &&
            this.root === 0 &&
            this.money.length === 1 &&
            this.invests.length === 1 &&
            this.total === 0 &&
            verify(signature, messageHash, publicKey)
    }
}
