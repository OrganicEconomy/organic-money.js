import { describe, it } from 'mocha';
import { assert } from 'chai';

import { bytesToHex } from 'ethereum-cryptography/utils.js';

import { Block } from '../src/Block.js';
import { dateToInt } from '../src/crypto.js';
import { makeBlockObj, makeTransactionObj, privateKey1, publicKey1 } from './testUtils.js';

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
                h: 'signature',
                x: []
            }

            const block = new Block(obj)

            assert.equal(block.version, 1)
            assert.equal(block.closedate.getDate(), d.getDate())
            assert.equal(block.previousHash, 'previousHash')
            assert.equal(block.signer, 'signer')
            assert.equal(block.root, 'merkleroot')
            assert.deepEqual(block.money, [20251226000, 20251226001])
            assert.deepEqual(block.invests, [202512269000, 202512269001])
            assert.equal(block.total, 12)
            assert.equal(block.signature, 'signature')
            assert.deepEqual(block.transactions, [])
        })
    })

    describe('hash', () => {
        it('Should make valid hash of the transaction', () => {
            const block = new Block(makeBlockObj())

            const expected = '8bdc8f1436a86f07fdb4fad2d10a5d02499dd14e49d385aae6ac6b9a714c8d5c'

            const result = bytesToHex(block.hash())

            assert.equal(result, expected)
        })

        it('Should ignore existing hash.', () => {
            const block = new Block(makeBlockObj())
            block.signature = "titi"

            const expected = '8bdc8f1436a86f07fdb4fad2d10a5d02499dd14e49d385aae6ac6b9a714c8d5c'

            const result = bytesToHex(block.hash())

            assert.equal(result, expected)
        })
    })

    describe('sign', () => {
        it('Should sign the block if all is ok.', () => {
            const block = new Block(makeBlockObj())

            const expected = '30450221008ffc34f99a568b27dd3728c3edc04ba0f0af2bf676c411e62523ca9adc85e33a02200480b52a326655c6a8fc83bde1bf39daee657b559666a96141ed17f8bc07b087'

            const result = block.sign(privateKey1)

            assert.equal(result, expected)
        })
    })

    describe('export', () => {
        it('Should return the bare block as it was first.', () => {
            const bareBlock = {
                v: 1,
                d: 20251226,
                p: 'target',
                s: 'signer',
                r: 'merkleroot',
                m: [20251226000, 20251226001],
                i: [202512269000, 202512269001],
                t: 'type',
                h: 'signature'
            }
            const block = new Block(bareBlock)

            const result = block.export()

            assert.deepEqual(result, bareBlock)
        })
    })
})