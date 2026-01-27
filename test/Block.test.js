import { describe, it } from 'mocha';
import { assert } from 'chai';

import { bytesToHex } from 'ethereum-cryptography/utils.js';

import { Block } from '../src/Block.js';
import { dateToInt } from '../src/crypto.js';
import { makeBlockObj, makeBlock, makeTransactionObj, makeTransactions, privateKey1, publicKey1, makeTransaction, publicKey3, publicKey2, privateKey2 } from './testUtils.js';
import { CreateTransaction, EngageTransaction, InitTransaction, PaperTransaction, PayTransaction, SetActorTransaction, SetAdminTransaction, SetPayerTransaction, Transaction, TXTYPE } from '../src/Transaction.js';
import { UnauthorizedError } from '../src/errors.js';
import { Blockchain } from '../src/Blockchain.js';

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

        it('Should make correct instance belonging on types.', () => {
            const txCreate = makeTransaction({ type: TXTYPE.CREATE })
            const txPay = makeTransaction({ type: TXTYPE.PAY })
            const txPaper = makeTransaction({ type: TXTYPE.PAPER })
            const txEngage = makeTransaction({ type: TXTYPE.ENGAGE })
            const txInit = makeTransaction({ type: TXTYPE.INIT })
            const txSetActor = makeTransaction({ type: TXTYPE.SETACTOR })
            const txSetAdmin = makeTransaction({ type: TXTYPE.SETADMIN })
            const txSetPayer = makeTransaction({ type: TXTYPE.SETPAYER })

            const block = new Block(makeBlockObj({
                transactions: [txCreate, txPay, txPaper, txEngage, txInit, txSetActor, txSetAdmin, txSetPayer]
            }))

            assert.isTrue(block.transactions[0] instanceof CreateTransaction)
            assert.isTrue(block.transactions[1] instanceof PayTransaction)
            assert.isTrue(block.transactions[2] instanceof PaperTransaction)
            assert.isTrue(block.transactions[3] instanceof EngageTransaction)
            assert.isTrue(block.transactions[4] instanceof InitTransaction)
            assert.isTrue(block.transactions[5] instanceof SetActorTransaction)
            assert.isTrue(block.transactions[6] instanceof SetAdminTransaction)
            assert.isTrue(block.transactions[7] instanceof SetPayerTransaction)
        })
    })

    describe('hash', () => {
        it('Should make valid hash of the transaction', () => {
            const block = makeBlock({
                date: new Date('2026-01-21'),
                previousHash: Blockchain.REF_HASH
            })

            const expected = '8bdc8f1436a86f07fdb4fad2d10a5d02499dd14e49d385aae6ac6b9a714c8d5c'

            const result = bytesToHex(block.hash())

            assert.equal(result, expected)
        })

        it('Should ignore existing hash.', () => {
            const block = makeBlock({
                date: new Date('2026-01-21'),
                previousHash: Blockchain.REF_HASH
            })
            block.signature = "titi"

            const expected = '8bdc8f1436a86f07fdb4fad2d10a5d02499dd14e49d385aae6ac6b9a714c8d5c'

            const result = bytesToHex(block.hash())

            assert.equal(result, expected)
        })
    })

    describe('sign', () => {
        it('Should sign the block if all is ok.', () => {
            const block = makeBlock({
                date: new Date('2026-01-21'),
                previousHash: Blockchain.REF_HASH
            })

            const expected = '30450221008ffc34f99a568b27dd3728c3edc04ba0f0af2bf676c411e62523ca9adc85e33a02200480b52a326655c6a8fc83bde1bf39daee657b559666a96141ed17f8bc07b087'

            const result = block.sign(privateKey1)

            assert.equal(result, expected)
        })

        it('Should throw an error if block contains Cashes Papers and signer is me.', () => {
            const transaction = makeTransaction({ type: TXTYPE.PAPER, target: publicKey2 })
            const block = makeBlock({ transactions: [transaction], signed: false })

            assert.throws(() => { block.sign(privateKey1) }, UnauthorizedError, 'Only Paper signer can seal a block with it.')
        })

        it('Should sign even if it contains Cashes Papers while signer is Papers signer.', () => {
            const transaction = makeTransaction({ type: TXTYPE.PAPER, target: publicKey2 })
            const block = makeBlock({ transactions: [transaction], signed: false })

            const signature = block.sign(privateKey2)

            assert.ok(signature)
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
            const tx1 = makeTransaction({ moneycount: 1, investscount: 1 })
            const tx2 = makeTransaction({ moneycount: 2, investscount: 2 })

            assert.notDeepEqual(tx1, tx2)

            block.add(tx1)
            block.add(tx2)

            assert.deepEqual(block.transactions[0], tx2)
        })

        it('Should add the CREATE transaction\'s money to the block.', () => {
            const block = makeBlock()
            const tx = new CreateTransaction(privateKey1, 2)

            assert.isTrue(tx.isValid())

            block.add(tx)

            assert.deepEqual(block.money, tx.money)
        })

        it('Should NOT add the money to the block for other types of transaction.', () => {
            const block = makeBlock()
            const tx1 = new PayTransaction(privateKey1, publicKey2, new Date(), [20260101000])
            // TODO: add all others types of transaction

            assert.isTrue(tx1.isValid())

            block.add(tx1)

            assert.deepEqual(block.money, [])
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

            assert.equal(block.root, '5ace17daaa3c8ee199a4941cec7410dd7c6762c91b3f7b05bec69b2367ebb667')
        })

        it('Should set the merkle root (with 50 transactions).', () => {
            const transactions = makeTransactions(50, { date: new Date("2026-01-22"), incrementMoney: true })
            const block = makeBlock({ transactions: transactions })

            block.merkle()

            assert.equal(block.root, '9d801d600194b677b1afc3b646d31a48bec21be88aa83927ab2884ebf6e9aefa')
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

    describe('containsPaper', () => {
        it('Should return false if the block has no PaperTransaction in it.', () => {
            const transactions = [
                makeTransaction({ type: TXTYPE.CREATE }),
                makeTransaction({ type: TXTYPE.ENGAGE }),
                makeTransaction({ type: TXTYPE.INIT }),
                makeTransaction({ type: TXTYPE.PAY }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.SETPAYER })
            ]
            const block = makeBlock({ transactions: transactions })

            const result = block.containsPaper()

            assert.isFalse(result)
        })

        it('Should return true if only transaction is PaperTransaction.', () => {
            const transactions = [
                makeTransaction({ type: TXTYPE.PAPER })
            ]
            const block = makeBlock({ transactions: transactions })

            const result = block.containsPaper()

            assert.isTrue(result)
        })

        it('Should return true if any transaction is PaperTransaction.', () => {
            const transactions = [
                makeTransaction({ type: TXTYPE.PAPER }),
                makeTransaction({ type: TXTYPE.CREATE }),
                makeTransaction({ type: TXTYPE.ENGAGE }),
                makeTransaction({ type: TXTYPE.INIT }),
                makeTransaction({ type: TXTYPE.PAY }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.SETPAYER })
            ]
            const block = makeBlock({ transactions: transactions })

            const result = block.containsPaper()

            assert.isTrue(result)
        })

        it('Should return true if many transactions are PaperTransaction.', () => {
            const transactions = [
                makeTransaction({ type: TXTYPE.PAPER }),
                makeTransaction({ type: TXTYPE.CREATE }),
                makeTransaction({ type: TXTYPE.PAPER }),
                makeTransaction({ type: TXTYPE.INIT }),
                makeTransaction({ type: TXTYPE.PAY }),
                makeTransaction({ type: TXTYPE.PAPER }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.PAPER })
            ]
            const block = makeBlock({ transactions: transactions })

            const result = block.containsPaper()

            assert.isTrue(result)
        })
    })

    describe('getPapersHandler', () => {
        it('Should return null if the block has no PaperTransaction in it.', () => {
            const transactions = [
                makeTransaction({ type: TXTYPE.CREATE }),
                makeTransaction({ type: TXTYPE.ENGAGE }),
                makeTransaction({ type: TXTYPE.INIT }),
                makeTransaction({ type: TXTYPE.PAY }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.SETPAYER })
            ]
            const block = makeBlock({ transactions: transactions })

            const result = block.getPapersHandler()

            assert.isNull(result)
        })

        it('Should return the holder if only transaction is PaperTransaction.', () => {
            const transactions = [
                makeTransaction({ type: TXTYPE.PAPER, target: publicKey3 })
            ]
            const block = makeBlock({ transactions: transactions })

            const result = block.getPapersHandler()

            assert.equal(result, publicKey3)
        })

        it('Should return the holder if any transaction is PaperTransaction.', () => {
            const transactions = [
                makeTransaction({ type: TXTYPE.PAPER, target: publicKey3 }),
                makeTransaction({ type: TXTYPE.CREATE }),
                makeTransaction({ type: TXTYPE.ENGAGE }),
                makeTransaction({ type: TXTYPE.INIT }),
                makeTransaction({ type: TXTYPE.PAY }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.SETPAYER })
            ]
            const block = makeBlock({ transactions: transactions })

            const result = block.getPapersHandler()

            assert.equal(result, publicKey3)
        })

        it('Should throw error if two PaperTransaction have different holder.', () => {
            const transactions = [
                makeTransaction({ type: TXTYPE.PAPER, target: publicKey3 }),
                makeTransaction({ type: TXTYPE.CREATE }),
                makeTransaction({ type: TXTYPE.PAPER, target: publicKey3 }),
                makeTransaction({ type: TXTYPE.INIT }),
                makeTransaction({ type: TXTYPE.PAY }),
                makeTransaction({ type: TXTYPE.PAPER, target: publicKey2 }),
                makeTransaction({ type: TXTYPE.SETACTOR }),
                makeTransaction({ type: TXTYPE.PAPER, target: publicKey3 })
            ]
            const block = makeBlock({ transactions: transactions })

            assert.throws(() => { block.getPapersHandler() }, Error, 'Invalid Block : multi-origin Papers are not allowed.')
        })
    })

    describe('getAvailableMoney', () => {
        it('Should return first created money for new Blockchain.', () => {
            const block = makeBlock({
                money: [20250101000]
            })

            const result = block.getAvailableMoney()

            const expected = [20250101000]

            assert.deepEqual(result, expected)
        })

        it('Should return each index.', () => {
            const block = makeBlock({
                money: [20250101000, 20250102000, 20250102001, 20250102002, 20250102003]
            })

            const result = block.getAvailableMoney()

            const expected = [20250101000, 20250102000, 20250102001, 20250102002, 20250102003]

            assert.deepEqual(result, expected)
        })

        it('Should return only given amount if given.', () => {
            const block = makeBlock({
                money: [20250101000, 20250102000, 20250102001, 20250102002, 20250102003]
            })

            const result = block.getAvailableMoney(2)

            const expected = [20250101000, 20250102000]

            assert.deepEqual(result, expected)
        })

        it('Should return only given amount for complexe cases.', () => {
            const block = makeBlock({
                money: [
                    20250101000, 20250101001, 20250101002,
                    20250101003, 20250101004, 20250103000,
                    20250103001, 20250103002, 20250103003
                ]
            })

            const result = block.getAvailableMoney(7)

            const expected = [20250101000, 20250101001, 20250101002,
                20250101003, 20250101004, 20250103000, 20250103001]

            assert.deepEqual(result, expected)
        })

        it('Should return [] if amount is too big (1).', () => {
            const block = makeBlock({
                money: [20250101000]
            })


            const result = block.getAvailableMoney(2)

            assert.deepEqual(result, [])
        })

        it('Should return [] if amount is too big (2).', () => {
            const block = makeBlock({
                money: [
                    20250101000, 20250101001, 20250101002,
                    20250101003, 20250101004, 20250103000,
                    20250103001, 20250103002, 20250103003
                ]
            })

            const result = block.getAvailableMoney(12)

            assert.deepEqual(result, [])
        })
    })

    describe('getAvailableMoneyAmount', () => {
        it('Should return total money available on the block 1.', () => {
            const block = makeBlock({
                money: [20250101000]
            })

            const result = block.getAvailableMoneyAmount()

            assert.deepEqual(result, 1)
        })

        it('Should return total money available on the block 2.', () => {
            const block = makeBlock({
                money: [20250101000, 20250101001,
                    20250102000, 20250102001, 20250102003
                ]
            })

            const result = block.getAvailableMoneyAmount()

            assert.deepEqual(result, 5)
        })
    })
})