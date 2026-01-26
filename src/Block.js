import { encode, decode } from 'msgpack-lite'
import { sha256 } from 'ethereum-cryptography/sha256.js'
import { hexToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { MerkleTree } from 'merkletreejs'
import { signSync, verify } from 'ethereum-cryptography/secp256k1.js'

import { dateToInt, intToDate, publicFromPrivate } from "./crypto.js"
import { PaperTransaction, Transaction, TransactionMaker, TXTYPE } from './Transaction.js'
import { UnauthorizedError } from './errors.js'

export class Block {

    constructor(blockObj) {
        this.version = blockObj.v
        this.closedate = intToDate(blockObj.d)
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

    // TODO : cashPaper must throw error if signer is different from another paper in the block

    /**
     * TODO: throw error if last block is already signed
	 * TODO: add method "isSigned(block)"
	 * TODO: add MerkleRoot
	 * TODO: Add signer (based on privatekey)
	 * TODO: Add closedate
     * @param {*} sk 
     * @returns 
     */
    sign(sk) {
/*
        const myPublicKey = this.getMyPublicKey()
        for (let tx of this.lastblock.transactions) {
            if (tx.type === Blockchain.TXTYPE.PAPER && publicFromPrivate(privateKey) !== tx.signer) {
                throw new UnauthorizedError('Only Paper signer can seal a block with it.')
            }
        }
*/
        const pk = publicFromPrivate(sk)
        if (this.containsPaper()) {
            const paperHandler = this.getPapersHandler()
            if (pk !== paperHandler) {
                throw new UnauthorizedError('Only Paper signer can seal a block with it.')
            }
        }

        const hash = this.hash()
        sk = hexToBytes(sk)
        const bytes = signSync(hash, sk)
        this.signature = toHex(bytes)
        return this.signature
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

    isSigned() {
        return verify(
            this.signature,
            this.hash(),
            this.signer
        )
    }
}