import { describe, it } from 'mocha';
import { assert } from 'chai';

import { encode, decode } from 'msgpack-lite'

import { Transaction } from '../src/Transaction.js';
import { Blockchain } from '../src/Blockchain.js';
import { dateToInt } from '../src/crypto.js';
import { makeBlockObj, makeTransactionObj, privateKey1, publicKey1 } from './testUtils.js';
import { bytesToHex } from 'ethereum-cryptography/utils.js';

describe('Transaction', () => {
    describe('constructor', () => {
        it('Should set the 8 fields from given object', () => {
            const d = new Date('2025-11-26')
            const obj = {
                v: 1,
                d: dateToInt(d),
                p: 'target',
                s: 'signer',
                m: [20251226000, 20251226001],
                i: [202512269000, 202512269001],
                t: 'type',
                h: 'signature'
            }
            const obj2 = makeBlockObj(new Date('2025-11-26'), 2, 2, 3)

            const tx = new Transaction(obj)

            assert.equal(tx.version, 1)
            assert.equal(tx.date.getDate(), d.getDate())
            assert.equal(tx.signer, 'signer')
            assert.equal(tx.target, 'target')
            assert.equal(tx.type, 'type')
            assert.equal(tx.signature, 'signature')
            assert.deepEqual(tx.money, [20251226000, 20251226001])
            assert.deepEqual(tx.invests, [202512269000, 202512269001])
        })
    })

    describe('hash', () => {
        it('Should make valid hash of the transaction', () => {
            const tx = new Transaction(makeTransactionObj({
                date: new Date('2026-01-21')
            }))

            const expected = 'ff2e15698b1fc418f45ef982f65e2cc0f0de6fe11c174e537277d84626f77680'

            const result = bytesToHex(tx.hash())            

            assert.equal(result, expected)
        })

        it('Should ignore existing hash.', () => {
            const tx = new Transaction(makeTransactionObj({
                date: new Date('2026-01-21'),
                signature: "titi"
            }))

            const expected = 'ff2e15698b1fc418f45ef982f65e2cc0f0de6fe11c174e537277d84626f77680'

            const result = bytesToHex(tx.hash())

            assert.equal(result, expected)
        })
    })

    describe('sign', () => {
        it('Should sign the transaction if all is ok.', () => {
            const tx = new Transaction(makeTransactionObj({
                date: new Date('2025-11-16')
            }))

            const expected = '304402203339b8c65b04cc47e2009b14be785ad89f5607d14e737a88ee6a2eff43de356102206382deb2a5354a5fc7466621215f10a7ee4d0108d4a372bb6a98217bbeede240'

            const result = tx.sign(privateKey1)            

            assert.equal(result, expected)
        })
    })

    describe('export', () => {
        it('Should return the bare transaction as it was first.', () => {
            const bareTx = {
                v: 1,
                d: 20251226,
                p: 'target',
                s: 'signer',
                m: [20251226000, 20251226001],
                i: [202512269000, 202512269001],
                t: 'type',
                h: 'signature'
            }
            const tx = new Transaction(bareTx)

            const result = tx.export()            

            assert.deepEqual(result, bareTx)
        })
    })
})