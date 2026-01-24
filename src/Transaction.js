import { encode, decode } from 'msgpack-lite'
import { sha256 } from 'ethereum-cryptography/sha256.js'

import { dateToInt, intToDate } from "./crypto.js"
import { hexToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { signSync } from 'ethereum-cryptography/secp256k1.js'

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
                throw new Error(`Invalid transaction type ${ txObj.t }. Allowed are ${JSON.stringify(TXTYPE) }`)
        }
    }
}
export class Transaction {

    constructor(txObj) {
        if (!txObj.v || !txObj.d || !txObj.s || !txObj.p || !txObj.m || !txObj.i || !txObj.t || !txObj.h) {
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
}

export class InitTransaction extends Transaction {

}

export class CreateTransaction extends Transaction {
    
}

export class PayTransaction extends Transaction {
    
}
export class EngageTransaction extends Transaction {
    
}
export class PaperTransaction extends Transaction {
    
}
export class SetAdminTransaction extends Transaction {
    
}
export class SetActorTransaction extends Transaction {
    
}
export class SetPayerTransaction extends Transaction {
    
}