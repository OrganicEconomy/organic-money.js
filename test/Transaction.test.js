import { describe, it } from 'mocha';
import { assert } from 'chai';

import { CreateTransaction, EngageTransaction, InitTransaction, PaperTransaction, PayTransaction, SetActorTransaction, SetAdminTransaction, SetPayerTransaction, Transaction, TransactionMaker, TXTYPE } from '../src/Transaction.js';
import { makeTransactionObj, privateKey1, publicKey1 } from './testUtils.js';
import { bytesToHex } from 'ethereum-cryptography/utils.js';

describe('Transaction', () => {
    describe('constructor', () => {
        it('Should set the 8 fields from given object', () => {
            const d = new Date('2025-11-26')
            const obj = makeTransactionObj({
                version: 1,
                date: d,
                target: 'target',
                signer: publicKey1,
                money: [20251226000, 20251226001],
                invests: [202512269000, 202512269001],
                type: TXTYPE.CREATE,
                signature: 'signature'
            })

            const tx = new Transaction(obj)

            assert.equal(tx.version, 1)
            assert.equal(tx.date.getDate(), d.getDate())
            assert.equal(tx.signer, publicKey1)
            assert.equal(tx.target, 'target')
            assert.equal(tx.type, TXTYPE.CREATE)
            assert.equal(tx.signature, 'signature')
            assert.deepEqual(tx.money, [20251226000, 20251226001])
            assert.deepEqual(tx.invests, [202512269000, 202512269001])
        })

        it('Should throw error if "v" (version) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.v

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "d" (date) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.d

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "s" (signer) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.s

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "p" (target) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.p

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "m" (money) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.m

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "i" (invests) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.i

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "t" (type) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.t

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })

        it('Should throw error if "h" (signature) is missing', () => {
            const obj = makeTransactionObj()
            delete obj.h

            assert.throws(() => { 
                const tx = new Transaction(obj)
            }, Error, 'Fields "v" (Version), "d" (date), "s" (signer), "p" (target), "m" (money), "i" (invests), "t" (type) and "h" (signature) are mandatory.')
        })
    })

    describe('hash', () => {
        it('Should make valid hash of the transaction', () => {
            const tx = new Transaction(makeTransactionObj({
                date: new Date('2026-01-21')
            }))

            const expected = '14d5e8a5ad59438ca29821dd66debce748bdcb20cc87f90aa27452665c222315'

            const result = bytesToHex(tx.hash())            

            assert.equal(result, expected)
        })

        it('Should ignore existing hash.', () => {
            const tx = new Transaction(makeTransactionObj({
                date: new Date('2026-01-21'),
                signature: "titi"
            }))

            const expected = '14d5e8a5ad59438ca29821dd66debce748bdcb20cc87f90aa27452665c222315'

            const result = bytesToHex(tx.hash())

            assert.equal(result, expected)
        })
    })

    describe('sign', () => {
        it('Should sign the transaction if all is ok.', () => {
            const tx = new Transaction(makeTransactionObj({
                date: new Date('2025-11-16')
            }))

            const expected = '304402206e50340d0355c34d9cdba44c9ec2101dabc880f816b19e2603f8538a6ce8da3502201477c0e02b233600fab3564cf9004b09542641bc5f46d14dc6490bec9ffbe666'

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

describe('TransactionMaker', () => {
    describe('make', () => {
        it('Should throw error for invalid transacrion type.', () => {
            assert.throws(() => { 
                TransactionMaker.make(makeTransactionObj({ type: -12 }))
            }, Error, 'Invalid transaction type -12. Allowed are {"INIT":1,"CREATE":2,"PAY":3,"ENGAGE":4,"PAPER":5,"SETADMIN":6,"SETACTOR":7,"SETPAYER":8}')
        })

        it('Should return a CreateTransaction for TXTYPE.CREATE.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.CREATE }))

            assert.isTrue(tx instanceof CreateTransaction)
        })

        it('Should return a InitTransaction for TXTYPE.INIT.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.INIT }))

            assert.isTrue(tx instanceof InitTransaction)
        })

        it('Should return a PayTransaction for TXTYPE.PAY.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.PAY }))

            assert.isTrue(tx instanceof PayTransaction)
        })

        it('Should return a EngageTransaction for TXTYPE.ENGAGE.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.ENGAGE }))

            assert.isTrue(tx instanceof EngageTransaction)
        })

        it('Should return a PaperTransaction for TXTYPE.PAPER.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.PAPER }))

            assert.isTrue(tx instanceof PaperTransaction)
        })

        it('Should return a SetAdminTransaction for TXTYPE.SETADMIN.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.SETADMIN }))

            assert.isTrue(tx instanceof SetAdminTransaction)
        })

        it('Should return a SetActorTransaction for TXTYPE.SETACTOR.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.SETACTOR }))

            assert.isTrue(tx instanceof SetActorTransaction)
        })

        it('Should return a SetPayerTransaction for TXTYPE.SETPAYER.', () => {
            const tx = TransactionMaker.make(makeTransactionObj({ type: TXTYPE.SETPAYER }))

            assert.isTrue(tx instanceof SetPayerTransaction)
        })
    })
})