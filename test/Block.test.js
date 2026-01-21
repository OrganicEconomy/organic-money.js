import { describe, it } from 'mocha';
import { assert } from 'chai';

import { Block } from '../src/Block.js';
import { dateToInt } from '../src/crypto.js';

describe('Block', () => {
    describe('constructor', () => {
        it('Should set the 10 fields from given object', () => {
            const d = new Date('2025-11-26')
            const obj = {
                v: 1,
                d: dateToInt(d),
                p: 'previousHash',
                s: 'signer',
                r: 'merkleroot',
                m: [20251226000, 20251226001],
                i: [202512269000, 202512269001],
                t: 12,
                h: 'hash',
                x: []
            }

            const block = new Block(obj)

            assert.equal(block.version, 1)
            assert.equal(block.date.getDate(), d.getDate())
            assert.equal(block.previousHash, 'previousHash')
            assert.equal(block.signer, 'signer')
            assert.equal(block.root, 'merkleroot')
            assert.deepEqual(block.money, [20251226000, 20251226001])
            assert.deepEqual(block.invests, [202512269000, 202512269001])
            assert.equal(block.total, 12)
            assert.equal(block.hash, 'hash')
            assert.deepEqual(block.transactions, [])
        })
    })
})