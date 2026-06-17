import { encode, decode } from 'msgpack-lite'
import { sha256 } from 'ethereum-cryptography/sha256.js'

import { buildInvestIndexes, buildMoneyIndexes, dateToInt, intToDate, publicFromPrivate } from "./crypto.js"
import { hexToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js'
import { Blockchain } from './Blockchain.js'

export const TXTYPE = {
    INIT: 1,
    CREATE: 2,
    PAY: 3,
    ENGAGE: 4,
    PAPER: 5,
    SETADMIN: 6,
    SETACTOR: 7,
    SETPAYER: 8,
    UNSETADMIN: 9,
    UNSETACTOR: 10,
    UNSETPAYER: 11,
    PAYERORDER: 12,
    EARN: 13
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
            case TXTYPE.UNSETADMIN:
                return new UnsetAdminTransaction(txObj)
            case TXTYPE.UNSETACTOR:
                return new UnsetActorTransaction(txObj)
            case TXTYPE.UNSETPAYER:
                return new UnsetPayerTransaction(txObj)
            case TXTYPE.PAYERORDER:
                return new PayerOrderTransaction(txObj)
            case TXTYPE.EARN:
                return new EarnTransaction(txObj)
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
        this.signature = toHex(secp256k1.sign(hash, hexToBytes(sk)).toDERRawBytes())
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
        try {
            return !!this.signer &&
                this.signer.length === 66 &&
                this.date instanceof Date &&
                this.date <= new Date() &&
                Object.prototype.toString.call(this.money) == '[object Array]' &&
                Object.prototype.toString.call(this.invests) == '[object Array]' &&
                secp256k1.verify(this.signature, this.hash(), this.signer)
        } catch {
            return false
        }
    }

    isEngagedForDate(date) {
        return this.getEngagedMoney(date).length > 0 || this.getEngagedInvests(date).length > 0
    }

    getEngagedMoney(date = null) {
        return []
    }

    getEngagedInvests(date = null) {
        return []
    }

}

export class InitTransaction extends Transaction {
    constructor(objOrSk, name = "", birthdate = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.INIT,
                m: [],
                i: [],
                d: dateToInt(birthdate),
                s: publicFromPrivate(objOrSk),
                p: name,
                h: ""
            })
            this.sign(objOrSk)
        }
    }

    toString() {
        return '[InitTransaction]'
    }
    
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
    constructor(objOrSk, money = [], invests = [], date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.CREATE,
                m: money,
                i: invests,
                d: dateToInt(date || new Date()),
                s: publicFromPrivate(objOrSk),
                p: "",
                h: ""
            })
            this.sign(objOrSk)
        }
    }

    toString() {
        return '[CreateTransaction]'
    }

    isValid() {
        return super.isValid() &&
        this.invests.length > 0 &&
        this.money.length > 0 &&
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

    toString() {
        return '[PayTransaction]'
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
    constructor(objOrSk, targetPk = null, invests = [], money = [], date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.ENGAGE,
                m: money,
                i: invests,
                d: dateToInt(date),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.sign(objOrSk)
        }
    }

    toString() {
        return '[EngageTransaction]'
    }

    isValid() {
        return super.isValid() &&
        !(this.invests.length > 0 && this.money.length > 0) &&
        !(this.invests.length === 0 && this.money.length === 0) &&
        this.type == TXTYPE.ENGAGE &&
        !! this.target &&
        this.target.length === 66
    }

    getEngagedMoney(date = null) {
        const money = []
        for (let m of this.money) {
            if (date !== null) {
                if (dateToInt(intToDate(m)) === dateToInt(date)) {
                    money.push(m)
                }
            } else {
                money.push(m)
            }
        }
        return money
    }

    getEngagedInvests(date = null) {
        const invests = []
        for (let m of this.invests) {
            if (date !== null) {
                if (dateToInt(intToDate(m)) === dateToInt(date)) {
                    invests.push(m)
                }
            } else {
                invests.push(m)
            }
        }
        return invests
    }
}

export class PaperTransaction extends Transaction {
    constructor(objOrSk, referentPk=null, money=[], date=new Date()) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.PAPER,
                m: money,
                i: [],
                d: dateToInt(date),
                s: publicFromPrivate(objOrSk),
                p: referentPk,
                h: ""
            })
            this.sign(objOrSk)
        }
    }

    toString() {
        return '[PaperTransaction]'
    }

    isValid() {
        return super.isValid() &&
        this.type == TXTYPE.PAPER &&
        this.money.length > 0 &&
        this.invests.length === 0 &&
        !! this.target &&
        this.target.length === 66
    }
}

export class SetAdminTransaction extends Transaction {
    constructor(objOrSk, targetPk = null, ecosystemPk = null, date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
            if (objOrSk.e === undefined) throw new Error('SetAdminTransaction: missing e field')
            this.ecosystem = objOrSk.e
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.SETADMIN,
                m: [],
                i: [],
                d: dateToInt(date || new Date()),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.ecosystem = ecosystemPk
            this.sign(objOrSk)
        }
    }

    toString() { return '[SetAdminTransaction]' }

    hash() {
        const tx = {
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version,
            e: this.ecosystem
        }
        return sha256(encode(tx))
    }

    export() { return { ...super.export(), e: this.ecosystem } }

    isValid() {
        return super.isValid() &&
        this.type == TXTYPE.SETADMIN &&
        this.money.length === 0 &&
        this.invests.length === 0 &&
        !! this.target &&
        this.target.length === 66 &&
        !! this.ecosystem &&
        this.ecosystem.length === 66
    }
}

export class SetActorTransaction extends Transaction {
    constructor(objOrSk, targetPk = null, ratio = 0, ecosystemPk = null, date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
            if (objOrSk.q === undefined) throw new Error('SetActorTransaction: missing q field')
            if (objOrSk.e === undefined) throw new Error('SetActorTransaction: missing e field')
            this.ratio = objOrSk.q
            this.ecosystem = objOrSk.e
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.SETACTOR,
                m: [],
                i: [],
                d: dateToInt(date || new Date()),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.ratio = ratio
            this.ecosystem = ecosystemPk
            this.sign(objOrSk)
        }
    }

    toString() { return '[SetActorTransaction]' }

    hash() {
        const tx = {
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version,
            q: this.ratio,
            e: this.ecosystem
        }
        return sha256(encode(tx))
    }

    export() { return { ...super.export(), q: this.ratio, e: this.ecosystem } }

    isValid() {
        return super.isValid() &&
        this.type == TXTYPE.SETACTOR &&
        this.money.length === 0 &&
        this.invests.length === 0 &&
        !! this.target &&
        this.target.length === 66 &&
        Number.isInteger(this.ratio) && this.ratio >= 0 &&
        !! this.ecosystem &&
        this.ecosystem.length === 66
    }
}

export class SetPayerTransaction extends Transaction {
    constructor(objOrSk, targetPk = null, cap = 0, ecosystemPk = null, date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
            if (objOrSk.q === undefined) throw new Error('SetPayerTransaction: missing q field')
            if (objOrSk.e === undefined) throw new Error('SetPayerTransaction: missing e field')
            this.cap = objOrSk.q
            this.ecosystem = objOrSk.e
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.SETPAYER,
                m: [],
                i: [],
                d: dateToInt(date || new Date()),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.cap = cap
            this.ecosystem = ecosystemPk
            this.sign(objOrSk)
        }
    }

    toString() { return '[SetPayerTransaction]' }

    hash() {
        const tx = {
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version,
            q: this.cap,
            e: this.ecosystem
        }
        return sha256(encode(tx))
    }

    export() { return { ...super.export(), q: this.cap, e: this.ecosystem } }

    isValid() {
        return super.isValid() &&
        this.type == TXTYPE.SETPAYER &&
        this.money.length === 0 &&
        this.invests.length === 0 &&
        !! this.target &&
        this.target.length === 66 &&
        Number.isInteger(this.cap) && this.cap >= -1 &&
        !! this.ecosystem &&
        this.ecosystem.length === 66
    }
}

export class UnsetAdminTransaction extends Transaction {
    constructor(objOrSk, targetPk = null, ecosystemPk = null, date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
            if (objOrSk.e === undefined) throw new Error('UnsetAdminTransaction: missing e field')
            this.ecosystem = objOrSk.e
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.UNSETADMIN,
                m: [],
                i: [],
                d: dateToInt(date || new Date()),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.ecosystem = ecosystemPk
            this.sign(objOrSk)
        }
    }

    toString() { return '[UnsetAdminTransaction]' }

    hash() {
        const tx = {
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version,
            e: this.ecosystem
        }
        return sha256(encode(tx))
    }

    export() { return { ...super.export(), e: this.ecosystem } }

    isValid() {
        return super.isValid() &&
            this.type == TXTYPE.UNSETADMIN &&
            this.money.length === 0 &&
            this.invests.length === 0 &&
            !!this.target &&
            this.target.length === 66 &&
            !! this.ecosystem &&
            this.ecosystem.length === 66
    }
}

export class UnsetActorTransaction extends Transaction {
    constructor(objOrSk, targetPk = null, ecosystemPk = null, date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
            if (objOrSk.e === undefined) throw new Error('UnsetActorTransaction: missing e field')
            this.ecosystem = objOrSk.e
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.UNSETACTOR,
                m: [],
                i: [],
                d: dateToInt(date || new Date()),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.ecosystem = ecosystemPk
            this.sign(objOrSk)
        }
    }

    toString() { return '[UnsetActorTransaction]' }

    hash() {
        const tx = {
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version,
            e: this.ecosystem
        }
        return sha256(encode(tx))
    }

    export() { return { ...super.export(), e: this.ecosystem } }

    isValid() {
        return super.isValid() &&
            this.type == TXTYPE.UNSETACTOR &&
            this.money.length === 0 &&
            this.invests.length === 0 &&
            !!this.target &&
            this.target.length === 66 &&
            !! this.ecosystem &&
            this.ecosystem.length === 66
    }
}

export class UnsetPayerTransaction extends Transaction {
    constructor(objOrSk, targetPk = null, ecosystemPk = null, date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
            if (objOrSk.e === undefined) throw new Error('UnsetPayerTransaction: missing e field')
            this.ecosystem = objOrSk.e
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.UNSETPAYER,
                m: [],
                i: [],
                d: dateToInt(date || new Date()),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.ecosystem = ecosystemPk
            this.sign(objOrSk)
        }
    }

    toString() { return '[UnsetPayerTransaction]' }

    hash() {
        const tx = {
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version,
            e: this.ecosystem
        }
        return sha256(encode(tx))
    }

    export() { return { ...super.export(), e: this.ecosystem } }

    isValid() {
        return super.isValid() &&
            this.type == TXTYPE.UNSETPAYER &&
            this.money.length === 0 &&
            this.invests.length === 0 &&
            !!this.target &&
            this.target.length === 66 &&
            !! this.ecosystem &&
            this.ecosystem.length === 66
    }
}

export class PayerOrderTransaction extends Transaction {
    constructor(objOrSk, targetPk = null, invests = [], ecosystemPk = null, date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
            if (objOrSk.e === undefined) throw new Error('PayerOrderTransaction: missing e field')
            this.ecosystem = objOrSk.e
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.PAYERORDER,
                m: [],
                i: invests,
                d: dateToInt(date || new Date()),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.ecosystem = ecosystemPk
            this.sign(objOrSk)
        }
    }

    hash() {
        const tx = {
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version,
            e: this.ecosystem
        }
        return sha256(encode(tx))
    }

    export() { return { ...super.export(), e: this.ecosystem } }

    toString() { return '[PayerOrderTransaction]' }

    isValid() {
        return super.isValid() &&
            this.type === TXTYPE.PAYERORDER &&
            this.money.length === 0 &&
            !! this.target &&
            this.target.length === 66 &&
            !! this.ecosystem &&
            this.ecosystem.length === 66
    }
}

export class EarnTransaction extends Transaction {
    constructor(objOrSk, targetPk = null, money = [], payerOrderSig = null, date = null) {
        if (typeof objOrSk === 'object' && !Array.isArray(objOrSk) && objOrSk !== null) {
            super(objOrSk)
            this.x = objOrSk.x || null
        } else {
            super({
                v: Blockchain.VERSION,
                t: TXTYPE.EARN,
                m: money,
                i: [],
                d: dateToInt(date || new Date()),
                s: publicFromPrivate(objOrSk),
                p: targetPk,
                h: ""
            })
            this.x = payerOrderSig
            this.sign(objOrSk)
        }
    }

    toString() { return '[EarnTransaction]' }

    hash() {
        if (this.x === null) return super.hash()
        return sha256(encode({
            d: dateToInt(this.date),
            m: this.money,
            i: this.invests,
            s: this.signer,
            t: this.type,
            p: this.target,
            v: this.version,
            x: this.x
        }))
    }

    export() {
        if (this.x === null) return super.export()
        return { ...super.export(), x: this.x }
    }

    isValid() {
        return super.isValid() &&
            this.type === TXTYPE.EARN &&
            this.invests.length === 0 &&
            !! this.target &&
            this.target.length === 66
    }
}