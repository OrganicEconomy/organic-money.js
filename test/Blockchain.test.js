import { describe, it } from 'mocha';
import { assert } from 'chai';


import { InvalidTransactionError, UnauthorizedError } from '../src/errors.js'
import { Blockchain } from '../src/Blockchain.js';
import { mySk, myPk, targetSk, targetPk, referentPk, makeBlockObj, makeBlock, makeTransaction } from './testUtils.js'
import { TXTYPE } from '../src/Transaction.js';
import { intToDate } from '../src/crypto.js';
import { BirthBlock, InitializationBlock, REF_HASH } from '../src/Block.js';

describe('Blockchain', () => {

	describe('constructor', () => {
		it('Should load given blocks objects to Blocks.', () => {
			const blockObj1 = makeBlockObj()
			const blockObj2 = makeBlockObj()
			const bc = new Blockchain([blockObj1, blockObj2])

			assert.equal(bc.blocks.length, 2)
			assert.equal(bc.blocks[0].toString(), '[Block]')
			assert.equal(bc.blocks[1].toString(), '[Block]')
		})

		it('Should instanciate BirthBlock or InitializationBlock when those are.', () => {
			const birthblock = new BirthBlock(mySk, intToDate('20250101'), 'Gus')
			const initializationblock = new InitializationBlock(targetSk, birthblock)
			const bc = new Blockchain([initializationblock.export(), birthblock.export()])

			assert.equal(bc.blocks.length, 2)
			assert.equal(bc.blocks[0].toString(), '[InitializationBlock]')
			assert.equal(bc.blocks[1].toString(), '[BirthBlock]')
		})

		it('Should raise an error if previous block is not signed.', () => {
			const bc = new Blockchain()
			const block = makeBlock()

			bc.addBlock(block)

			assert.throws(() => { bc.addBlock(makeBlock()) }, UnauthorizedError, 'Cannot add block if previous is not signed.')
		})
	})

	describe('addBlock', () => {
		it('Should add the given block to the blockchain.', () => {
			const bc = new Blockchain()

			bc.addBlock(makeBlock(new Date(), 1, 1, 0, true))

			assert.equal(bc.blocks.length, 1)
		})

		it('Should raise an error if previous block is not signed.', () => {
			const bc = new Blockchain()
			const block = makeBlock(new Date(), 1, 1, 0, false)

			bc.addBlock(block)

			assert.throws(() => { bc.addBlock(makeBlock(new Date())) }, UnauthorizedError, 'Cannot add block if previous is not signed.')
		})
	})

	describe('cashPaper', () => {

		it('Should throw an error if transaction is not a PaperTransaction.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date('2026-01-19') })])

			const tx = makeTransaction({
				type: TXTYPE.CREATE
			})

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Invalid Transaction')
		})

		it('Should throw an error if transaction signer is different from another paper in the block.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date('2026-01-19') })])

			const paper1 = makeTransaction({
				type: TXTYPE.PAPER,
				moneycount: 3,
				signer: myPk,
				target: targetPk
			})
			bc.cashPaper(paper1)

			const paper2 = makeTransaction({
				type: TXTYPE.PAPER,
				moneycount: 3,
				signer: myPk,
				target: referentPk
			})

			assert.throws(() => { bc.cashPaper(paper2) }, InvalidTransactionError, 'Multiple papers target')
		})

		it('Should return the transaction.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date('2026-01-19') })])

			const paper = makeTransaction({
				type: TXTYPE.PAPER,
				moneycount: 3,
				target: myPk
			})
			const result = bc.cashPaper(paper)

			assert.deepEqual(result, paper)
		})

		it('Should add the transactions to last block.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date('2026-01-19') })])

			const paper = makeTransaction({
				type: TXTYPE.PAPER,
				moneycount: 3
			})
			bc.cashPaper(paper)

			assert.deepEqual(bc.lastblock.transactions[0], paper)
		})

		it('Should increase the blockchain total.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date('2026-01-19') })])

			const paper = makeTransaction({
				type: TXTYPE.PAPER,
				moneycount: 3
			})
			bc.cashPaper(paper)

			assert.deepEqual(bc.lastblock.total, 3)
		})
	})

	describe('isValid', () => {
		it('Should return true for empty blockchain.', () => {
			const bc = new Blockchain()

			const result = bc.isValid()

			assert.ok(result)
		})
	})

	describe('lastTransaction', () => {
		it('Should return null if no transaction exists.', () => {
			const blockchain = new Blockchain()

			const result = blockchain.lastTransaction

			assert.isNull(result)
		})

		it('Should return the only one Transaction if there is only one.', () => {
			const blockchain = new Blockchain()
			const block = makeBlock(new Date(), 1, 1, 0)
			blockchain.addBlock(block)

			const result = blockchain.lastTransaction

			assert.deepEqual(result, block.lastTransaction)
		})

		it('Should return the Transaction from last block.', () => {
			const blockchain = new Blockchain()
			const block1 = makeBlock({ signed: true })
			const block2 = makeBlock()
			blockchain.addBlock(block1)
			blockchain.addBlock(block2)

			const result = blockchain.lastTransaction

			assert.deepEqual(result, block2.lastTransaction)
		})
	})

	describe('getEngagedInvests', () => {
		it('Should return engaged money from last block.', () => {
			const transactions = [
				makeTransaction({
					type: TXTYPE.ENGAGE,
					date: intToDate(20250102),
					invests: [202501029000, 202501029001]
				}),
				makeTransaction({
					type: TXTYPE.ENGAGE,
					date: intToDate(20250102),
					invests: [202501029002, 202501029003, 202501029004]
				}),
				makeTransaction({
					type: TXTYPE.ENGAGE,
					date: intToDate(20250103),
					invests: [202501039000, 202501039001]
				})
			]
			const bc = new Blockchain([makeBlockObj({
				transactions: transactions
			})])

			const result = bc.getEngagedInvests()
			const expected = bc.lastblock.getEngagedInvests()

			assert.deepEqual(result, expected)
		})
	})

	describe('getEngagedMoney', () => {
		it('Should return engaged money from last block.', () => {
			const transactions = [
				makeTransaction({
					type: TXTYPE.ENGAGE,
					date: intToDate(20250102),
					money: [20250102000, 20250102001]
				}),
				makeTransaction({
					type: TXTYPE.ENGAGE,
					date: intToDate(20250102),
					money: [20250102002, 20250102003, 20250102004]
				}),
				makeTransaction({
					type: TXTYPE.ENGAGE,
					date: intToDate(20250103),
					money: [20250103000, 20250103001]
				})
			]
			const bc = new Blockchain([makeBlockObj({
				transactions: transactions
			})])

			const result = bc.getEngagedMoney()
			const expected = bc.lastblock.getEngagedMoney()

			assert.deepEqual(result, expected)
		})
	})

	describe('isEmpty', () => {
		it('Should return true for empty array', () => {
			const bc = new Blockchain([])
			const result = bc.isEmpty()

			assert.ok(result)
		})

		it('Should return true for empty blockchain', () => {
			const bc = new Blockchain()
			const result = bc.isEmpty()

			assert.ok(result)
		})

		it('Should return true for null blockchain', () => {
			const bc = new Blockchain(null)
			const result = bc.isEmpty()

			assert.ok(result)
		})

		it('Should return false else', () => {
			const bc = new Blockchain([makeBlockObj()])
			const result = bc.isEmpty()

			assert.isNotOk(result)
		})
	})	

	describe('removeMoney', () => {
		it('Should filter properly.', () => {
			const tx1 = makeTransaction({
				date: new Date("2025-01-01"),
				moneycount: 1
			})
			const tx2 = makeTransaction({
				date: new Date("2025-01-02"),
				moneycount: 4
			})
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date('2025-01-01') })])
			bc.addTransaction(tx1)
			bc.addTransaction(tx2)

			const result = bc.removeMoney([20250101000, 20250102000]);
			const expected = [20250102001, 20250102002, 20250102003];

			assert.deepEqual(result, expected)
		})
	})

	describe('addTransaction', () => {
		it('Should add the given transaction to last block', () => {
			const blockObj1 = makeBlockObj({ signed: true })
			const blockObj2 = makeBlockObj({ signed: false })
			const blockchain = new Blockchain([blockObj2, blockObj1])

			const tx = makeTransaction()

			blockchain.addTransaction(tx)

			assert.deepEqual(blockchain.lastTransaction, tx)
		})

		it('Should create a new block if last one is signed', () => {
			const blockObj1 = makeBlockObj({ signed: true, date: new Date('2026-01-19') })
			const blockchain = new Blockchain([blockObj1])

			const tx = makeTransaction({ date: new Date('2026-01-20') })

			blockchain.addTransaction(tx)

			assert.equal(blockchain.blocks.length, 2)
		})

		it('Should NOT create a new block if last one is NOT signed', () => {
			const bc = new Blockchain([makeBlockObj(), makeBlockObj({ signed: true, date: new Date('2026-01-19') })]);

			bc.addTransaction(makeTransaction({ date: new Date('2026-01-20') }))
			bc.addTransaction(makeTransaction({ date: new Date('2026-01-21') }))
			bc.addTransaction(makeTransaction({ date: new Date('2026-01-22') }))

			assert.equal(bc.blocks.length, 2)
		})

		it('Should throw an error if transaction already is in last block.', () => {
			const bc = new Blockchain([makeBlockObj(), makeBlockObj({ signed: true, date: new Date('2026-01-19') })]);
			const tx = makeTransaction({ date: new Date('2026-01-20'), moneycount: 2 })

			bc.addTransaction(tx)

			assert.throws(() => { bc.addTransaction(tx) }, InvalidTransactionError, 'Transaction duplicate ' + tx.signature)
		})

		it('Should throw error if transaction date is already passed in the blockchain.', () => {
			const bc = new Blockchain([makeBlockObj()]);
			bc.sealLastBlock(mySk)
			const tx = makeTransaction({ date: new Date('2026-01-20') })

			assert.throws(() => { bc.addTransaction(tx) }, InvalidTransactionError, 'Invalid date')
		})
	})

	describe('newBlock', () => {
		it('Should throw error if previous block is not signed.', () => {
			const bc = new Blockchain([makeBlockObj()])

			const fn = () => { bc.newBlock() }

			assert.throws(fn, Error, 'Previous block not signed.')
		})

		it('Should add an empty block to the blockchain.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true }), makeBlockObj({ signed: true })])

			assert.equal(bc.blocks.length, 2)

			bc.newBlock()

			assert.equal(bc.blocks.length, 3)
		})

		it('Should add a Block type.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true })])

			bc.newBlock()

			assert.equal(bc.blocks[0].toString(), '[Block]')
		})

		it('Should report total.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, total: 12 })])

			bc.newBlock()

			assert.equal(bc.lastblock.total, 12)
		})

		it('Should report money and invests.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, total: 12 })])
			bc.addTransaction(makeTransaction({
				moneycount: 4,
				investscount: 4
			}))
			bc.sealLastBlock(mySk)

			bc.newBlock()

			assert.equal(bc.lastblock.money.length, 4)
			assert.equal(bc.lastblock.invests.length, 4)
		})

		it('Should report running engagement from previous block.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date("2025-01-01") })])
			console.log(bc.blocks[0].isSigned())
			const tx = makeTransaction({
				type: TXTYPE.ENGAGE,
				money: [20250101000, 20250102000, 20250103000],
				date: new Date("2025-01-02")
			})
			bc.addTransaction(tx)
			bc.sealLastBlock(mySk, new Date("2025-01-02"))

			bc.newBlock()

			assert.equal(bc.blocks.length, 3)
			assert.deepEqual(bc.lastblock.transactions[0], tx)
		})
 
		it('Should NOT report finished engagements from previous block.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date("2025-01-01") })])
			const tx = makeTransaction({
				type: TXTYPE.ENGAGE,
				money: [20250101000, 20250102000, 20250103000],
				date: new Date("2025-01-02")
			})
			bc.addTransaction(tx)
			bc.sealLastBlock(mySk, new Date("2025-01-03"))

			bc.newBlock()

			assert.equal(bc.blocks.length, 3)
			assert.deepEqual(bc.lastblock.transactions.length, 0)
		})
	})

	describe('getMyPublicKey', () => {
		it('Should return null for empty Blockchain.', () => {
			const bc = new Blockchain()

			const result = bc.getMyPublicKey()

			assert.isNull(result)
		})

		it('Should return the correct key from birth block.', () => {
			const bc = new Blockchain([makeBlockObj({
				previousHash: REF_HASH,
				signer: targetPk
			})])

			const result = bc.getMyPublicKey()

			assert.equal(result, targetPk)
		})

		it('Should return the correct key from last CREATE transaction.', () => {
			const bc = new Blockchain([
				makeBlockObj({
					transactions: [
						makeTransaction({
							type: TXTYPE.CREATE,
							signer: targetPk
						})
					]
				})
			])

			const result = bc.getMyPublicKey()

			assert.equal(result, targetPk)
		})
	})

	describe('pay', () => {

		it('Should make valid transaction.', () => {
			const bc = new Blockchain([
				makeBlockObj({
					date: new Date('2025-01-01'),
					moneycount: 3
				}),
				makeBlockObj({
					signed: true,
					date: new Date('2025-01-01')
				})
			])

			bc.pay(mySk, targetPk, 3, new Date('2025-01-03'))
			const transaction = bc.lastblock.lastTransaction

			assert.isTrue(transaction.isValid())

			const expected = {
				version: Blockchain.VERSION,
				type: TXTYPE.PAY,
				date: new Date('2025-01-03'),
				money: [20250101000, 20250101001, 20250101002],
				invests: [],
				target: targetPk,
				signer: myPk
			}

			assert.equal(transaction.version, expected.version)
			assert.equal(transaction.type, expected.type)
			assert.equal(transaction.date.getTime(), expected.date.getTime())
			assert.deepEqual(transaction.money, expected.money)
			assert.deepEqual(transaction.invests, expected.invests)
			assert.equal(transaction.target, expected.target)
			assert.equal(transaction.signer, expected.signer)
		})

		it('Should decrease money of the block.', () => {
			const bc = new Blockchain([
				makeBlockObj({
					date: new Date('2025-01-03'),
					moneycount: 5,
					type: TXTYPE.CREATE
				}),
				makeBlockObj({
					signed: true,
					date: new Date('2025-01-02')
				})
			])

			assert.equal(bc.lastblock.money.length, 5)

			bc.pay(mySk, targetPk, 3, new Date('2025-01-03'))

			const result = bc.lastblock.money
			const expected = [20250103003, 20250103004]

			assert.equal(bc.lastblock.money.length, 2)
			assert.deepEqual(result, expected)
		})

		it('Should increase total if I am the target.', () => {
			const bc = new Blockchain([
				makeBlockObj({
					date: new Date('2025-01-03'),
					moneycount: 4,
					total: 26,
					transactions: [makeTransaction({
						type: TXTYPE.CREATE,
						signer: myPk
					})]
				}),
				makeBlockObj({
					signed: true,
					date: new Date('2025-01-02')

				})
			])

			bc.pay(mySk, myPk, 4, new Date('2025-01-03'))

			assert.equal(bc.lastblock.total, 30)
		})

		it('Should throw error if blockchain can t afford it.', () => {
			const bc = new Blockchain([makeBlockObj(), makeBlockObj({ signed: true, date: new Date('2026-01-19') })])

			assert.throws(() => { bc.pay(mySk, targetPk, 2) }, InvalidTransactionError, 'Unsufficient funds.')
		})
	})

})