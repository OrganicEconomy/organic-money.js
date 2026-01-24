import { describe, it } from 'mocha';
import { assert } from 'chai';

import { bytesToHex } from 'ethereum-cryptography/utils.js';

import { Block } from '../src/Block.js';
import { dateToInt } from '../src/crypto.js';
import { makeBlockObj, makeBlock, makeTransactionObj, makeTransactions, privateKey1, publicKey1, makeTransaction } from './testUtils.js';
import { Transaction } from '../src/Transaction.js';

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
            const block = makeBlock({ date: new Date('2026-01-21') })

            const expected = '8bdc8f1436a86f07fdb4fad2d10a5d02499dd14e49d385aae6ac6b9a714c8d5c'

            const result = bytesToHex(block.hash())

            assert.equal(result, expected)
        })

        it('Should ignore existing hash.', () => {
            const block = makeBlock({ date: new Date('2026-01-21') })
            block.signature = "titi"

            const expected = '8bdc8f1436a86f07fdb4fad2d10a5d02499dd14e49d385aae6ac6b9a714c8d5c'

            const result = bytesToHex(block.hash())

            assert.equal(result, expected)
        })
    })

    describe('sign', () => {
        it('Should sign the block if all is ok.', () => {
            const block = makeBlock({ date: new Date('2026-01-21') })

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
                h: 'signature',
                x: []
            }
            const block = new Block(bareBlock)

            const result = block.export()

            assert.deepEqual(result, bareBlock)
        })
    })

    describe('add', () => {
        it('Should add the given transaction in its array.', () => {
            const block = makeBlock()
            const transaction = makeTransaction()

            block.add(transaction)

            assert.deepEqual(block.transactions[0], transaction)
        })

        it('Should add the given transaction in first place.', () => {
            const block = makeBlock()
            const tx1 = makeTransaction({ moneycount: 1 })
            const tx2 = makeTransaction({ moneycount: 2 })

            assert.notDeepEqual(tx1, tx2)

            block.add(tx1)
            block.add(tx2)

            assert.deepEqual(block.transactions[0], tx2)
        })
    })

    describe('merkle', () => {
        it('Should set the merkle root based on its transactions.', () => {
            const block = makeBlock()
            const tx1 = makeTransaction({ date: new Date("2026-01-22"), moneycount: 1 })
            const tx2 = makeTransaction({ date: new Date("2026-01-22"), moneycount: 3 })
            block.add(tx1)
            block.add(tx2)

            block.merkle()

            assert.equal(block.root, '4b0340c2b3f29fe7efd61de78f6a6e8b257f00fedeb677af02d3d48524755b32')
        })

        it('Should set the merkle root (with 50 transactions).', () => {
            const transactions = makeTransactions(50, { date: new Date("2026-01-22"), incrementMoney: true })
            const block = makeBlock({ transactions: transactions})

            block.merkle()

            assert.equal(block.root, 'd820b60047aebceb4100f1821c4f0de180760fad24b6b78a47fd7e07ce70577d')
        })
    })

    describe('hasTransactions', () => {
        it('Should return false if no transaction in the block.', () => {
            const block = makeBlock()

            const result = block.hasTransactions()

            assert.isFalse(result)
        })

        it('Should return true if block has 1 transaction.', () => {
            const block = makeBlock({ transactions: [makeTransaction()] })

            const result = block.hasTransactions()

            assert.isOk(result)
        })

        it('Should return true if block has multiple transactions.', () => {
            const block = makeBlock({ transactions: makeTransactions(12) })

            const result = block.hasTransactions()

            assert.isOk(result)
        })
    })

    describe('lastTransaction', () => {
        it('Should return null if no transaction in the block.', () => {
            const block = makeBlock()

            const result = block.lastTransaction

            assert.isNull(result)
        })

        it('Should return the only transaction if block has 1.', () => {
            const block = makeBlock({ transactions: [makeTransaction()] })

            const result = block.lastTransaction

            assert.deepEqual(result, block.transactions[0])
        })

        it('Should return first transaction if block has multiple transactions.', () => {
            const block = makeBlock({ transactions: makeTransactions(12) })

            const result = block.lastTransaction

            assert.deepEqual(result, block.transactions[0])
        })
    })

    describe('isSigned', () => {
        it('Should return true if the block is signed.', () => {
            const block = new Block(makeBlockObj(new Date('2026-01-21')))
            block.sign(privateKey1)

            const result = block.isSigned()

            assert.isTrue(result)
        })

        it('Should return false if the block has no signature.', () => {
            const block = new Block(makeBlockObj(new Date('2026-01-21')))

            const result = block.isSigned()

            assert.isFalse(result)
        })

        it('Should return false if the block has invalid signature.', () => {
            const block = new Block(makeBlockObj(new Date('2026-01-21')))
            block.signature = 'bibabeuloula'

            const result = block.isSigned()

            assert.isFalse(result)
        })
    })
})