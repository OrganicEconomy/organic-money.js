import { encode, decode } from 'msgpack-lite'
import { sha256 } from 'ethereum-cryptography/sha256.js'
import { hexToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { MerkleTree } from 'merkletreejs'
import { signSync, verify } from 'ethereum-cryptography/secp256k1.js'

import { dateToInt, intToDate } from "./crypto.js"
import { Transaction } from './Transaction.js'

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
        this.transactions = blockObj.x.map(tx => new Transaction(tx))
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

    sign(sk) {
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