import { describe, it } from 'mocha';
import { assert } from 'chai';

import { Transaction } from '../src/Transaction.js';
import { Blockchain } from '../src/Blockchain.js';
import { dateToInt } from '../src/crypto.js';

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
                h: 'hash'
            }

            const tx = new Transaction(obj)

            assert.equal(tx.version, 1)
            assert.equal(tx.date.getDate(), d.getDate())
            assert.equal(tx.signer, 'signer')
            assert.equal(tx.target, 'target')
            assert.equal(tx.type, 'type')
            assert.equal(tx.hash, 'hash')
            assert.deepEqual(tx.money, [20251226000, 20251226001])
            assert.deepEqual(tx.invests, [202512269000, 202512269001])
        })
    })
})