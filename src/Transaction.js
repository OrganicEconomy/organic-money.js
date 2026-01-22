import { encode, decode } from 'msgpack-lite'
import { sha256 } from 'ethereum-cryptography/sha256.js'

import { dateToInt, intToDate } from "./crypto.js"
import { hexToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { signSync } from 'ethereum-cryptography/secp256k1.js'

export class Transaction {

    constructor(txObj) {
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
}