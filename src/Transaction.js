import { encode, decode } from 'msgpack-lite'
import { sha256 } from 'ethereum-cryptography/sha256.js'

import { dateToInt, intToDate, publicFromPrivate } from "./crypto.js"
import { hexToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { signSync, verify } from 'ethereum-cryptography/secp256k1.js'
import { Blockchain } from './Blockchain.js'

export const TXTYPE = {
    INIT: 1,
    CREATE: 2,
    PAY: 3,
    ENGAGE: 4,
    PAPER: 5,
    SETADMIN: 6,
    SETACTOR: 7,
    SETPAYER: 8
}

export class TransactionMaker {
    static make(txObj) {
        switch (txObj.t) {
            case TXTYPE.INIT:
                return new InitTransaction(txObj)
            case TXTYPE.CREATE:
                return new CreateTransaction(txObj)
            case TXTYPE.PAY:
                return new PayTransaction(txObj)
            case TXTYPE.ENGAGE:
                return new EngageTransaction(txObj)
            case TXTYPE.PAPER:
                return new PaperTransaction(txObj)
            case TXTYPE.SETADMIN:
                return new SetAdminTransaction(txObj)
            case TXTYPE.SETACTOR:
                return new SetActorTransaction(txObj)
            case TXTYPE.SETPAYER:
                return new SetPayerTransaction(txObj)
            default:
                throw new Error(`Invalid transaction type ${txObj.t}. Allowed are ${JSON.stringify(TXTYPE)}`)
        }
    }
}
export class Transaction {

    constructor(txObj) {
        if (!("v" in txObj && "d" in txObj && "s" in txObj && "p" in txObj && "m" in txObj && "i" in txObj && "t" in txObj && "h" in txObj)) {
            throw new Error('Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        }
        this.version = txObj.v
        this.date = intToDate(txObj.d)
        this.signer = txObj.s
        this.target = txObj.p
        this.money = txObj.m
        this.invests = txObj.i
        this.type = txObj.t
        this.signature = txObj.h
    }

    toString() {
        return '[Transaction]'
    }

    hash() {
        const tx = {
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version
        }
        const packedtx = encode(tx)
        return sha256(packedtx)
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
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version,
            h: this.signature
        }
    }

    isPaper() {
        return this.type === TXTYPE.PAPER
    }

    isValid() {
        return !!this.signer &&
            this.signer.length === 66 &&
            this.date instanceof Date &&
            this.date <= new Date() &&
            Object.prototype.toString.call(this.money) == '[object Array]' &&
            Object.prototype.toString.call(this.invests) == '[object Array]' &&
            verify(this.signature, this.hash(), this.signer)
    }
}

export class InitTransaction extends Transaction {
    isValid() {
        return super.isValid() &&
            !!this.target &&
            this.target.length >= 0 &&
            this.money.length === 0 &&
            this.invests.length === 0 &&
            this.type === TXTYPE.INIT
    }
}

export class CreateTransaction extends Transaction {
    isValid() {
        return super.isValid() &&
        this.invests.length > 0 &&
        this.money.length > 0 &&
        this.money.length === this.invests.length &&
        this.type === TXTYPE.CREATE &&
        this.target === ""
    }
}

export class PayTransaction extends Transaction {
    constructor(objOrSk, targetPk=null, date=null, money=[]) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.PAY,
                m: money,
                i: [],
                d: dateToInt(date),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.sign(objOrSk)
        }
    }

    isValid() {
        return super.isValid() &&
        this.invests.length === 0 &&
        this.money.length > 0 &&
        this.type === TXTYPE.PAY &&
        !! this.target &&
        this.target.length === 66
    }
}

export class EngageTransaction extends Transaction {
    isValid() {
        return super.isValid() &&
        !(this.invests.length > 0 && this.money.length > 0) &&
        !(this.invests.length === 0 && this.money.length === 0) &&
        this.type == TXTYPE.ENGAGE &&
        !! this.target &&
        this.target.length === 66
    }
}

export class PaperTransaction extends Transaction {
    isValid() {
        return super.isValid() &&
        this.type == TXTYPE.PAPER &&
        this.money.length > 0 &&
        this .invests.length === 0 &&
        !! this.target &&
        this.target.length === 66
    }
}

export class SetAdminTransaction extends Transaction {
    isValid() {
        return super.isValid() &&
        this.type == TXTYPE.SETADMIN &&
        this.money.length === 0 &&
        this .invests.length === 0 &&
        !! this.target &&
        this.target.length === 66
    }
}

export class SetActorTransaction extends Transaction {
    isValid() {
        return super.isValid() &&
        this.type == TXTYPE.SETACTOR &&
        this.money.length === 0 &&
        this .invests.length === 0 &&
        !! this.target &&
        this.target.length === 66
    }
}

export class SetPayerTransaction extends Transaction {
    isValid() {
        return super.isValid() &&
        this.type == TXTYPE.SETPAYER &&
        this.money.length === 0 &&
        this .invests.length === 0 &&
        !! this.target &&
        this.target.length === 66
    }
}