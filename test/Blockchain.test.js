import { describe, it } from 'mocha';
import { assert } from 'chai';
import nodeassert from 'node:assert';


import { InvalidTransactionError, UnauthorizedError } from '../src/errors.js'
import { Blockchain } from '../src/Blockchain.js';
import { privateKey1, publicKey1, privateKey2, publicKey2, privateKey3, publicKey3, makeBlockObj, makeTransactionObj, makeBlock, makeTransaction } from './testUtils.js'
import { CreateTransaction, Transaction, TXTYPE } from '../src/Transaction.js';

describe('Blockchain', () => {

	describe('constructor', () => {
		it('Should load given blocks objects to Blocks.', () => {
			const blockObj1 = makeBlockObj(new Date(), 1, 1, 0, true)
			const blockObj2 = makeBlockObj(new Date(), 2, 2, 0, false)
			const bc = new Blockchain([blockObj1, blockObj2])

			assert.equal(bc.blocks.length, 2)
			assert.equal(bc.blocks[0].toString(), '[Block]')
			assert.equal(bc.blocks[1].toString(), '[Block]')
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

	/**
	describe('cashPaper', () => {

		let paper1 = () => {
			let paper = {
				version: Blockchain.VERSION,
				date: 20250101,
				source: publicKey2,
				target: 0,
				money: [20250101000],
				invests: [],
				type: Blockchain.TXTYPE.PAPER,
				signer: 0
			}
			paper = Blockchain.signtx(paper, privateKey2)
			return paper
		}

		let paper2 = () => {
			let paper = {
				version: Blockchain.VERSION,
				date: 20250102,
				source: publicKey2,
				target: 0,
				money: [20250101001, 20250101002, 20250101003],
				invests: [],
				type: Blockchain.TXTYPE.PAPER,
				signer: 0
			}
			paper = Blockchain.signtx(paper, privateKey2)
			return paper
		}

		it('Should throw an error if target is not 0.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			tx.target = publicKey1

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Target is != 0')
		})

		it('Should throw an error if transaction has no target.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			delete tx.target
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Target is != 0')
		})
		
		it('Should throw an error if transaction is not signed.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			delete tx.hash

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Wrong signature ' + tx.hash)
		})

		it('Should throw an error if transaction has no version.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			delete tx.version
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Missing version ' + tx.hash)
		})

		it('Should throw an error if transaction has no date.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			delete tx.date
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Wrong date ' + tx.hash)
		})

		it('Should throw an error if transaction has no source.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			delete tx.source
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Wrong source format ' + tx.hash)
		})

		it('Should throw an error if transaction has no money.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			delete tx.money
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Wrong money format ' + tx.hash)
		})

		it('Should throw an error if transaction has no invests field.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			delete tx.invests
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Wrong invests format ' + tx.hash)
		})

		it('Should throw an error if transaction has no type.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			delete tx.type
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Wrong transaction type ' + tx.hash)
		})

		it('Should throw an error if transaction type is != PAPER.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = paper1()
			tx.type = Blockchain.TXTYPE.CREATE
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.cashPaper(tx) }, InvalidTransactionError, 'Wrong transaction type ' + tx.hash)
		})

		it('Should return the transaction.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const paper = paper1()
			const result = bc.cashPaper(paper)

			assert.deepEqual(result, paper)
		})

		it('Should add the transactions to last block.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const paper = paper1()
			bc.cashPaper(paper)

			assert.deepEqual(bc.lastblock.transactions[0], paper)
		})

		it('Should increase the blockchain total.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const paper = paper2()
			bc.cashPaper(paper)

			assert.deepEqual(bc.lastblock.total, 3)
		})
	})*/

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

	/**
	describe('getEngagedInvests', () => {
		it('Should return all engaged invests if no date is given.', () => {
			const bc = new Blockchain([validEngagedBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.getEngagedInvests()

			const expected = [202501029002, 202501029003, 202501039000, 202501039001, 202501049000, 202501049001]

			assert.deepEqual(result, expected)
		})

		it('Should return engaged invests of given date if given.', () => {
			const bc = new Blockchain([validEngagedBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.getEngagedInvests(new Date('2025-01-03'))

			const expected = [202501039000, 202501039001]

			assert.deepEqual(result, expected)
		})

		it('Should return engaged invests from every transactions.', () => {
			const bc = new Blockchain([validEngagedBlock2(), validInitBlock(), validBirthBlock()])

			const result = bc.getEngagedInvests()

			const expected = [202501039002, 202501039003, 202501049002, 202501049003, 202501059000, 202501059001,
				202501029002, 202501029003, 202501039000, 202501039001, 202501049000, 202501049001]

			assert.deepEqual(result, expected)
		})

		it('Should return engaged invests of given date if given from every transactions.', () => {
			const bc = new Blockchain([validEngagedBlock2(), validInitBlock(), validBirthBlock()])

			const result = bc.getEngagedInvests(new Date('2025-01-03'))

			const expected = [202501039002, 202501039003, 202501039000, 202501039001]

			assert.deepEqual(result, expected)
		})
	})*/

	/**
	describe('getEngagedMoney', () => {
		it('Should return all engaged money if no date is given.', () => {
			const bc = new Blockchain([validEngagedBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.getEngagedMoney()

			const expected = [20250102002, 20250102003, 20250103000, 20250103001, 20250104000, 20250104001]

			assert.deepEqual(result, expected)
		})

		it('Should return engaged money of given date if given.', () => {
			const bc = new Blockchain([validEngagedBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.getEngagedMoney(new Date('2025-01-03'))

			const expected = [20250103000, 20250103001]

			assert.deepEqual(result, expected)
		})

		it('Should return engaged money from every transactions.', () => {
			const bc = new Blockchain([validEngagedBlock2(), validInitBlock(), validBirthBlock()])

			const result = bc.getEngagedMoney()

			const expected = [20250103002, 20250103003, 20250104002, 20250104003, 20250105000, 20250105001,
				20250102002, 20250102003, 20250103000, 20250103001, 20250104000, 20250104001]

			assert.deepEqual(result, expected)
		})

		it('Should return engaged money of given date if given from every transactions.', () => {
			const bc = new Blockchain([validEngagedBlock2(), validInitBlock(), validBirthBlock()])

			const result = bc.getEngagedMoney(new Date('2025-01-03'))

			const expected = [20250103002, 20250103003, 20250103000, 20250103001]

			assert.deepEqual(result, expected)
		})
	})*/

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
			const bc = new Blockchain([makeBlockObj()])
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
			const blockObj1 = makeBlockObj({ signed: true })
			const blockchain = new Blockchain([blockObj1])

			const tx = makeTransaction({ date: new Date('2026-01-20') })

			blockchain.addTransaction(tx)

			assert.equal(blockchain.blocks.length, 2)
		})

		it('Should NOT create a new block if last one is NOT signed', () => {
			const bc = new Blockchain([makeBlockObj()]);

			bc.addTransaction(makeTransaction({ date: new Date('2026-01-20') }))
			bc.addTransaction(makeTransaction({ date: new Date('2026-01-21') }))
			bc.addTransaction(makeTransaction({ date: new Date('2026-01-22') }))

			assert.equal(bc.blocks.length, 1)
		})

		it('Should throw an error if transaction already is in last block.', () => {
			const bc = new Blockchain([makeBlockObj()]);
			const tx = makeTransaction(new Date('2026-01-20'), 2)

			bc.addTransaction(tx)

			assert.throws(() => { bc.addTransaction(tx) }, InvalidTransactionError, 'Transaction duplicate ' + tx.signature)
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

		/**
		it('Should report running engagement from previous block.', () => {
			const bc = new Blockchain([validEngagedBlock(), validInitBlock(), validBirthBlock()])

			bc.newBlock()

			const expected = validEngagedBlock().transactions

			assert.deepEqual(bc.lastblock.transactions, expected)
		})
 
		it('Should NOT report finished engagements from previous block.', () => {
			const bc = new Blockchain([validNoMoreEngagedBlock(), validInitBlock(), validBirthBlock()])

			bc.newBlock()

			assert.equal(bc.lastblock.transactions.length, 0)
		})
		*/
	})

	describe('getMyPublicKey', () => {
		it('Should return null for empty Blockchain.', () => {
			const bc = new Blockchain()

			const result = bc.getMyPublicKey()

			assert.isNull(result)
		})

		it('Should return the correct key from birth block.', () => {
			const bc = new Blockchain([makeBlockObj({
				previousHash: Blockchain.REF_HASH,
				signer: publicKey2
			})])

			const result = bc.getMyPublicKey()

			assert.equal(result, publicKey2)
		})

		it('Should return the correct key from last CREATE transaction.', () => {
			const bc = new Blockchain([
				makeBlockObj({
					transactions: [
						makeTransaction({
							type: TXTYPE.CREATE,
							signer: publicKey2
						})
					]
				})
			])

			const result = bc.getMyPublicKey()

			assert.equal(result, publicKey2)
		})
	})

	describe('income', () => {

		it('Should throw an error if target is not blockchain owner.', () => {
			const bc = new Blockchain([makeBlockObj({
				transactions: [makeTransaction({
					type: TXTYPE.CREATE,
					signer: publicKey1
				})]
			})])

			const tx = makeTransaction({
				type: TXTYPE.PAY,
				target: publicKey3,
				moneycount: 2,
				signer: publicKey2,
				sk: privateKey2
			})

			assert.isTrue(tx.isValid())
			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction is NOT valid.', () => {
			const bc = new Blockchain([makeBlockObj({
				transactions: [makeTransaction({
					type: TXTYPE.CREATE,
					signer: publicKey1
				})]
			})])

			const tx = makeTransaction()

			assert.isFalse(tx.isValid())
			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction type is != PAY.', () => {
			const bc = new Blockchain([makeBlockObj({
				transactions: [makeTransaction({
					type: TXTYPE.CREATE,
					signer: publicKey1
				})]
			})])

			const tx = new Transaction(makeTransactionObj({
				type: TXTYPE.SETADMIN,
				target: publicKey1,
				moneycount: 2,
				investscount: 0,
				signer: publicKey2,
				sk: privateKey2
			}))

			assert.isTrue(tx.isValid())
			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should add the transaction to last block.', () => {
			const bc = new Blockchain([makeBlockObj({
				transactions: [makeTransaction({
					type: TXTYPE.CREATE,
					signer: publicKey1
				})]
			})])

			const tx = makeTransaction({
				type: TXTYPE.PAY,
				target: publicKey1,
				moneycount: 2,
				signer: publicKey2,
				sk: privateKey2
			})

			bc.income(tx)

			assert.isTrue(tx.isValid())
			assert.deepEqual(bc.lastblock.lastTransaction, tx)
		})

		it('Should increase the blockchain total.', () => {
			const bc = new Blockchain([makeBlockObj({
				transactions: [makeTransaction({
					type: TXTYPE.CREATE,
					signer: publicKey1
				})],
				total: 3
			})])

			const tx = makeTransaction({
				type: TXTYPE.PAY,
				signer: publicKey2,
				sk: privateKey2,
				target: publicKey1,
				moneycount: 4
			})

			bc.income(tx)

			assert.isTrue(tx.isValid())
			assert.deepEqual(bc.lastblock.total, 7)
		})
	})

	describe('pay', () => {

		it('Should make valid transaction.', () => {
			const bc = new Blockchain([makeBlockObj({
				date: new Date('2025-01-01'),
				moneycount: 3
			})])

			bc.pay(privateKey1, publicKey2, 3, new Date('2025-01-03'))
			const transaction = bc.lastblock.lastTransaction

			assert.isTrue(transaction.isValid())

			const expected = {
				version: Blockchain.VERSION,
				type: TXTYPE.PAY,
				date: new Date('2025-01-03'),
				money: [20250101000, 20250101001, 20250101002],
				invests: [],
				target: publicKey2,
				signer: publicKey1
			}

			nodeassert.partialDeepStrictEqual(transaction, expected)
		})

		it('Should decrease money of the block.', () => {
			const bc = new Blockchain([makeBlockObj({
				date: new Date('2025-01-03'),
				moneycount: 5,
				type: TXTYPE.CREATE
			})])

			assert.equal(bc.lastblock.money.length, 5)

			bc.pay(privateKey1, publicKey2, 3, new Date('2025-01-03'))

			const result = bc.lastblock.money
			const expected = [20250103003, 20250103004]

			assert.equal(bc.lastblock.money.length, 2)
			assert.deepEqual(result, expected)
		})

		it('Should increase total if I am the target.', () => {
			const bc = new Blockchain([makeBlockObj({
				date: new Date('2025-01-03'),
				moneycount: 4,
				total: 26,
				type: TXTYPE.CREATE,
				transactions: [makeTransaction({
					type: TXTYPE.CREATE,
					signer: publicKey1
				})]
			})])

			bc.pay(privateKey1, publicKey1, 4, new Date('2025-01-03'))

			const result = bc.lastblock.money

			assert.deepEqual(bc.lastblock.total, 30)
		})

		it('Should throw error if blockchain can t afford it.', () => {
			const bc = new Blockchain([makeBlockObj()])

			assert.throws(() => { bc.pay(privateKey1, publicKey2, 2) }, InvalidTransactionError, 'Unsufficient funds.')
		})
	})

})