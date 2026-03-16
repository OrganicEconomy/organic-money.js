import { describe, it } from 'mocha';
import { assert } from 'chai';

import { bytesToHex } from 'ethereum-cryptography/utils.js';

import { Block, BirthBlock, REF_HASH, InitializationBlock } from '../src/Block.js';
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

        it('Should throw error if "v" (version) is missing', () => {
            const obj = makeBlockObj()
            delete obj.v

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        })

        it('Should throw error if "d" (closedate) is missing', () => {
            const obj = makeBlockObj()
            delete obj.d

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        })

        it('Should throw error if "p" (previousHash) is missing', () => {
            const obj = makeBlockObj()
            delete obj.p

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        })

        it('Should throw error if "s" (signer) is missing', () => {
            const obj = makeBlockObj()
            delete obj.s

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        })

        it('Should throw error if "r" (root) is missing', () => {
            const obj = makeBlockObj()
            delete obj.r

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        })

        it('Should throw error if "m" (money) is missing', () => {
            const obj = makeBlockObj()
            delete obj.m

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        })

        it('Should throw error if "i" (invests) is missing', () => {
            const obj = makeBlockObj()
            delete obj.i

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        })

        it('Should throw error if "t" (total) is missing', () => {
            const obj = makeBlockObj()
            delete obj.t

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        })

        it('Should throw error if "h" (signature) is missing', () => {
            const obj = makeBlockObj()
            delete obj.s

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
        })

        it('Should throw error if "x" (transactions) is missing', () => {
            const obj = makeBlockObj()
            delete obj.x

            assert.throws(() => {
                new Block(obj)
            }, Error, 'Fields "v" (Version), "d" (closedate), "p" (previousHash), "s" (signer), "r" (root), "m" (money), "i" (invests), "t" (total), "h" (signature) and "x" (transactions) are mandatory.')
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

            assert.isFalse(block.isSigned())

            block.sign(privateKey1)

            assert.isTrue(block.isSigned())
        })

        it('Should sign with closedate as given date.', () => {
            const block = makeBlock({
                date: new Date('2026-01-21'),
                previousHash: Blockchain.REF_HASH
            })
            const d = new Date('2025-02-19')

            block.sign(privateKey1, d)

            assert.equal(block.closedate.getDate(), d.getDate())
        })

        it('Should set the merkleroot before signing.', () => {
            const block = makeBlock({
                date: new Date('2026-01-21'),
                previousHash: Blockchain.REF_HASH,
                transactions: [new CreateTransaction(privateKey1, 1, new Date('2026-01-22'))]
            })

            const expected = '304502210088927c127b2c9f291b4f86adb0e69a50ffc080dccd359269def8a494be13571d02203f6904fdc34b047ac0f2bed3d71f1406dd70dd50b8d751fca639fb8492320717'

            block.sign(privateKey1)
            const result = block.root

            assert.equal(result, expected)
        })

        it('Should set the signer before signing.', () => {
            const block = makeBlock({
                date: new Date('2026-01-21'),
                previousHash: Blockchain.REF_HASH,
                transactions: [new CreateTransaction(privateKey1, 1, new Date('2026-01-22'))],
                signed: false,
                signer: ""
            })

            block.sign(privateKey1)
            const result = block.signer

            assert.equal(result, publicKey1)
        })

        it('Should set the closedate to today before signing.', () => {
            const block = makeBlock({
                signed: false
            })

            block.sign(privateKey1)
            const result = block.closedate

            assert.equal(result.getDate(), new Date().getDate())
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

		it('Should throw an error if block is already signed.', () => {
			const block = makeBlock({ signed: true })

			assert.throws(() => { block.sign(privateKey1) }, UnauthorizedError, 'Block is already signed.')
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
            const tx = makeTransaction({
                type: TXTYPE.CREATE,
                moneycount: 2,
                investscount: 2,
                target: ""
            })

            assert.isTrue(tx.isValid())

            block.add(tx)

            assert.deepEqual(block.money, tx.money)
        })

        it('Should add the CREATE transaction\'s invests to the block.', () => {
            const block = makeBlock()
            const tx = makeTransaction({
                type: TXTYPE.CREATE,
                moneycount: 2,
                investscount: 2,
                target: ""
            })

            assert.isTrue(tx.isValid())

            block.add(tx)

            assert.deepEqual(block.invests, tx.invests)
        })

        it('Should NOT add the money/invests to the block for other types of transaction.', () => {
            const block = makeBlock()
            block.add(new PayTransaction(privateKey1, publicKey2, new Date(), [20260101000]))
            block.add(makeTransaction({ type: TXTYPE.ENGAGE, moneycount: 2 }))
            block.add(makeTransaction({ type: TXTYPE.INIT, moneycount: 2 }))
            block.add(makeTransaction({ type: TXTYPE.PAPER, moneycount: 2 }))

            assert.deepEqual(block.money, [])
            assert.deepEqual(block.invests, [])
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

describe('BirthBlock', () => {
    describe('constructor', () => {
        it('Should set the 10 fields with correct defaults.', () => {
            const d = new Date('2025-11-26')
            const birthdate = new Date('2025-11-01')
            const name = "Jean Bombeur"
            const expectedTransactions = [
                makeTransaction({
                    type: TXTYPE.CREATE,
                    date: d,
                    moneycount: 1,
                    investscount: 1,
                    signer: publicKey1,
                    target: ""
                }),
                makeTransaction({
                    type: TXTYPE.INIT,
                    date: birthdate,
                    signer: publicKey1,
                    target: name
                })
            ]

            const block = new BirthBlock(privateKey1, birthdate, name, d)

            assert.equal(block.version, 1)
            assert.equal(dateToInt(block.closedate), dateToInt(d), 'closedate is invalid')
            assert.equal(block.previousHash, REF_HASH)
            assert.equal(block.signer, publicKey1)
            assert.ok(block.root)
            assert.deepEqual(block.money, [20251126000])
            assert.deepEqual(block.invests, [202511269000])
            assert.equal(block.total, 0)
            assert.ok(block.signature)
            assert.deepEqual(block.transactions, expectedTransactions)
        })

        it('Should be signed.', () => {
            const d = new Date('2025-11-26')
            const birthdate = new Date('2025-11-01')
            const name = "Jean Bombeur"

            const block = new BirthBlock(privateKey1, birthdate, name, d)

            assert.isTrue(block.isSigned())
            assert.equal(block.root, "78d83a0ce3c7f2cc4231b25167779df0fe225cbf43e4869ba9320b769729e91e")
            assert.equal(block.signature, "3045022100f1a11c1f44ab8ac17cacb4fd1b364cda7cfebfc25c7fb9026faeec3ffe5d44bf02206bb2de41ad154a4c3baf04565e9e1976f81d32d2e93f78e564f50a01044af29b")
        })

        it('Should use todays date if none given.', () => {
            const today = dateToInt(new Date())
            const birthdate = new Date('2025-11-01')
            const name = "Jean Bombeur"

            const block = new BirthBlock(privateKey1, birthdate, name)

            assert.equal(dateToInt(block.closedate), today)
            assert.equal(dateToInt(block.transactions[0].date), today)
            assert.equal(dateToInt(block.transactions[1].date), dateToInt(birthdate))
        })
    })

    describe('toString', () => {
        it('Should return [BirthBlock].', () => {
            const block = new BirthBlock(privateKey1, new Date('2025-11-01'), "Jean Bombeur")

            const result = block.toString()

            assert.equal(result, "[BirthBlock]")
        })
    })
})

describe('InitializationBlock', () => {
    describe('constructor', () => {
        it('Should set the 10 fields with correct defaults.', () => {
            const d = new Date('2025-11-26')

            const previousBlock = makeBlock({ signatre: REF_HASH })
            const block = new InitializationBlock(privateKey2, previousBlock, d)

            assert.equal(block.version, 1)
            assert.equal(block.closedate.getDate(), d.getDate())
            assert.equal(block.previousHash, previousBlock.signature)
            assert.equal(block.signer, publicKey2)
            assert.equal(block.root, 0)
            assert.deepEqual(block.money, [])
            assert.deepEqual(block.invests, [])
            assert.equal(block.total, 0)
            assert.ok(block.signature)
            assert.deepEqual(block.transactions, [])
        })

        it('Should be signed.', () => {
            const d = new Date('2025-11-26')

            const previousBlock = makeBlock({ signatre: REF_HASH })
            const block = new InitializationBlock(privateKey2, previousBlock, d)

            assert.isTrue(block.isSigned())
        })
    })

    describe('toString', () => {
        it('Should return [InitializationBlock].', () => {
            const block = new InitializationBlock(privateKey2, REF_HASH)

            const result = block.toString()

            assert.equal(result, "[InitializationBlock]")
        })
    })
})