import { encode, decode } from 'msgpack-lite'
import { sha256 } from 'ethereum-cryptography/sha256.js'
import { hexToBytes, toHex } from 'ethereum-cryptography/utils.js'
import { signSync } from 'ethereum-cryptography/secp256k1.js'

import { dateToInt, intToDate } from "./crypto.js"

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
        this.transactions = blockObj.x
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
            h: this.signature
        }
    }
}