import { describe, it } from 'mocha';
import { assert } from 'chai';


import { InvalidTransactionError, UnauthorizedError, InvalidBlockchainError } from '../src/errors.js'
import { Blockchain } from '../src/Blockchain.js';
import { mySk, myPk, targetSk, targetPk, referentPk, makeBlockObj, makeBlock, makeTransaction } from './testUtils.js'
import { TXTYPE } from '../src/Transaction.js';
import { intToDate, dateToInt } from '../src/crypto.js';
import { BirthBlock, InitializationBlock, REF_HASH, BLOCKTYPE } from '../src/Block.js';

describe('Blockchain', () => {

	describe('constructor', () => {
		it('Should load given blocks objects to CitizenBlocks.', () => {
			const blockObj1 = makeBlockObj()
			const blockObj2 = makeBlockObj()
			const bc = new Blockchain([blockObj1, blockObj2])

			assert.equal(bc.blocks.length, 2)
			assert.equal(bc.blocks[0].toString(), '[CitizenBlock]')
			assert.equal(bc.blocks[1].toString(), '[CitizenBlock]')
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

	})

	describe('isValid', () => {
		it('Should return true for empty blockchain.', () => {
			const bc = new Blockchain()

			const result = bc.isValid()

			assert.ok(result)
		})

		it('Should return true for a single open (unsigned) block.', () => {
			const bc = new Blockchain([makeBlockObj()])

			assert.isTrue(bc.isValid())
		})

		it('Should return true for a valid chain of linked, signed blocks.', () => {
			const oldest = makeBlock({ date: new Date('2025-01-01'), signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isTrue(bc.isValid())
		})

		it('Should return true if only the current (most recent) block is unsigned.', () => {
			const oldest = makeBlock({ date: new Date('2025-01-01'), signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, signed: false })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isTrue(bc.isValid())
		})

		it('Should return false if previousHash does not match the previous block signature.', () => {
			const oldest = makeBlock({ date: new Date('2025-01-01'), signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: 'wronghash', signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return false if a non-current (older) block is unsigned.', () => {
			const oldest = makeBlock({ date: new Date('2025-01-01'), signed: false })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: '', signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return false if an older block has a later closedate than a newer block.', () => {
			const oldest = makeBlock({ date: new Date('2025-01-05'), signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return true if two adjacent blocks share the same closedate (e.g. birth + validation same day).', () => {
			const oldest = makeBlock({ date: new Date('2025-01-01'), signed: true })
			const newest = makeBlock({ date: new Date('2025-01-01'), previousHash: oldest.signature, signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isTrue(bc.isValid())
		})

		it('Should return false if the owner public key changes between blocks.', () => {
			const createTx1 = makeTransaction({ type: TXTYPE.CREATE, signer: myPk, sk: mySk, date: new Date('2025-01-01') })
			const oldest = makeBlock({ date: new Date('2025-01-01'), transactions: [createTx1], signed: true })
			const createTx2 = makeTransaction({ type: TXTYPE.CREATE, signer: targetPk, sk: targetSk, date: new Date('2025-01-02') })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, transactions: [createTx2], signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return true if the owner public key is the same across blocks.', () => {
			const createTx1 = makeTransaction({ type: TXTYPE.CREATE, signer: myPk, sk: mySk, date: new Date('2025-01-01') })
			const oldest = makeBlock({ date: new Date('2025-01-01'), transactions: [createTx1], signed: true })
			const createTx2 = makeTransaction({ type: TXTYPE.CREATE, signer: myPk, sk: mySk, date: new Date('2025-01-02') })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, transactions: [createTx2], signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isTrue(bc.isValid())
		})

		it('Should return false if a transaction signature is duplicated across blocks.', () => {
			const tx = makeTransaction({ date: new Date('2025-01-01') })
			const oldest = makeBlock({ date: new Date('2025-01-01'), transactions: [tx], signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, transactions: [tx], signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return true if a role transaction (e.g. SETADMIN) is legitimately carried forward across blocks.', () => {
			const setAdminTx = makeTransaction({ type: TXTYPE.SETADMIN, date: new Date('2025-01-01') })
			const oldest = makeBlock({ date: new Date('2025-01-01'), transactions: [setAdminTx], signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, transactions: [setAdminTx], signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.isTrue(bc.isValid())
		})

		it('Should return false if any block fails its own isValid() check.', () => {
			const tx = makeTransaction({ date: new Date('2025-01-01') })
			tx.signature = 'forged'
			const oldest = makeBlock({ date: new Date('2025-01-01'), transactions: [tx], signed: false })
			const bc = new Blockchain([oldest.export()])

			assert.isFalse(bc.isValid())
		})

		describe('depth parameter', () => {
			it('Should only check the last N blocks when depth > 0, ignoring older inconsistencies.', () => {
				const corruptOldest = makeBlock({ date: new Date('2025-01-01'), signed: true })
				const middle = makeBlock({ date: new Date('2025-01-02'), previousHash: 'wronghash', signed: true })
				const newest = makeBlock({ date: new Date('2025-01-03'), previousHash: middle.signature, signed: true })
				const bc = new Blockchain([newest.export(), middle.export(), corruptOldest.export()])

				assert.isFalse(bc.isValid())
				assert.isTrue(bc.isValid(2))
			})
		})
	})

	describe('assertIsValid', () => {
		it('Should not throw for an empty blockchain.', () => {
			const bc = new Blockchain()

			assert.doesNotThrow(() => bc.assertIsValid())
		})

		it('Should not throw for a valid chain of linked, signed blocks.', () => {
			const oldest = makeBlock({ date: new Date('2025-01-01'), signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.doesNotThrow(() => bc.assertIsValid())
		})

		it('Should throw a specific message if previousHash does not match the previous block signature.', () => {
			const oldest = makeBlock({ date: new Date('2025-01-01'), signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: 'wronghash', signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /previousHash/i)
		})

		it('Should throw a specific message if a non-current (older) block is unsigned.', () => {
			const oldest = makeBlock({ date: new Date('2025-01-01'), signed: false })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: '', signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /must be signed/i)
		})

		it('Should throw a specific message if an older block has a later closedate than a newer block.', () => {
			const oldest = makeBlock({ date: new Date('2025-01-05'), signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /closedate/i)
		})

		it('Should throw a specific message if the owner public key changes between blocks.', () => {
			const createTx1 = makeTransaction({ type: TXTYPE.CREATE, signer: myPk, sk: mySk, date: new Date('2025-01-01') })
			const oldest = makeBlock({ date: new Date('2025-01-01'), transactions: [createTx1], signed: true })
			const createTx2 = makeTransaction({ type: TXTYPE.CREATE, signer: targetPk, sk: targetSk, date: new Date('2025-01-02') })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, transactions: [createTx2], signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /owner/i)
		})

		it('Should throw a specific message if a transaction signature is duplicated across blocks.', () => {
			const tx = makeTransaction({ date: new Date('2025-01-01') })
			const oldest = makeBlock({ date: new Date('2025-01-01'), transactions: [tx], signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, transactions: [tx], signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /duplicate/i)
		})

		it('Should not throw if a role transaction (e.g. SETADMIN) is legitimately carried forward across blocks.', () => {
			const setAdminTx = makeTransaction({ type: TXTYPE.SETADMIN, date: new Date('2025-01-01') })
			const oldest = makeBlock({ date: new Date('2025-01-01'), transactions: [setAdminTx], signed: true })
			const newest = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, transactions: [setAdminTx], signed: true })
			const bc = new Blockchain([newest.export(), oldest.export()])

			assert.doesNotThrow(() => bc.assertIsValid())
		})

		it('Should propagate the block-level error if a block fails its own assertIsValid() check.', () => {
			const tx = makeTransaction({ date: new Date('2025-01-01') })
			tx.signature = 'forged'
			const oldest = makeBlock({ date: new Date('2025-01-01'), transactions: [tx], signed: false })
			const bc = new Blockchain([oldest.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError)
		})

		describe('depth parameter', () => {
			it('Should only check the last N blocks when depth > 0, ignoring older inconsistencies.', () => {
				const corruptOldest = makeBlock({ date: new Date('2025-01-01'), signed: true })
				const middle = makeBlock({ date: new Date('2025-01-02'), previousHash: 'wronghash', signed: true })
				const newest = makeBlock({ date: new Date('2025-01-03'), previousHash: middle.signature, signed: true })
				const bc = new Blockchain([newest.export(), middle.export(), corruptOldest.export()])

				assert.throws(() => bc.assertIsValid(), InvalidBlockchainError)
				assert.doesNotThrow(() => bc.assertIsValid(2))
			})
		})
	})

	describe('export', () => {
		it('Should export every block and transaction.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, experience: 12 })])
			bc._addTransaction(makeTransaction({
				moneycount: 4,
				investscount: 4
			}))
			bc.closeLastBlock(mySk)
			bc.newBlock()

			const result = bc.export()

			assert.equal(result.length, 3)
			assert.hasAllKeys(result[1], ['v', 'd', 'p', 's', 'r', 'm', 'i', 't', 'h', 'x'])
			assert.hasAllKeys(result[1].x[0], ['v', 't', 'm', 'i', 'd', 's', 'p', 'h',])
		})

		it('Should import correctly from export.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, experience: 12 })])
			bc._addTransaction(makeTransaction({
				moneycount: 4,
				investscount: 4
			}))
			bc.closeLastBlock(mySk)
			bc.newBlock()

			const result = new Blockchain(bc.export())

			assert.deepEqual(result, bc)
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
			bc._addTransaction(tx1)
			bc._addTransaction(tx2)

			const result = bc.removeMoney([20250101000, 20250102000]);
			const expected = [20250102001, 20250102002, 20250102003];

			assert.deepEqual(result, expected)
		})

		it('Should only remove one occurrence per requested id, even if the id appears more than once (different citizens can generate the same money id).', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date('2025-01-01') })])
			bc.lastblock.money = [20250101000, 20250101000, 20250101001]

			const result = bc.removeMoney([20250101000])

			assert.deepEqual(result, [20250101000, 20250101001])
		})
	})

	describe('removeInvests', () => {
		it('Should filter properly.', () => {
			const tx1 = makeTransaction({ date: new Date("2025-01-01"), investscount: 1 })
			const tx2 = makeTransaction({ date: new Date("2025-01-02"), investscount: 4 })
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date('2025-01-01') })])
			bc._addTransaction(tx1)
			bc._addTransaction(tx2)

			const toRemove = [tx1.invests[0], tx2.invests[0]]
			const result = bc.removeInvests(toRemove)

			assert.deepEqual(result, tx2.invests.slice(1))
		})

		it('Should only remove one occurrence per requested id, even if the id appears more than once (different citizens can generate the same invest id).', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date('2025-01-01') })])
			bc.lastblock.invests = [202501019000, 202501019000, 202501019001]

			const result = bc.removeInvests([202501019000])

			assert.deepEqual(result, [202501019000, 202501019001])
		})
	})

	describe('_addTransaction', () => {
		it('Should add the given transaction to last block', () => {
			const blockObj1 = makeBlockObj({ signed: true })
			const blockObj2 = makeBlockObj({ signed: false })
			const blockchain = new Blockchain([blockObj2, blockObj1])

			const tx = makeTransaction()

			blockchain._addTransaction(tx)

			assert.deepEqual(blockchain.lastTransaction, tx)
		})

		it('Should create a new block if last one is signed', () => {
			const blockObj1 = makeBlockObj({ signed: true, date: new Date('2026-01-19') })
			const blockchain = new Blockchain([blockObj1])

			const tx = makeTransaction({ date: new Date('2026-01-20') })

			blockchain._addTransaction(tx)

			assert.equal(blockchain.blocks.length, 2)
		})

		it('Should NOT create a new block if last one is NOT signed', () => {
			const bc = new Blockchain([makeBlockObj(), makeBlockObj({ signed: true, date: new Date('2026-01-19') })]);

			bc._addTransaction(makeTransaction({ date: new Date('2026-01-20') }))
			bc._addTransaction(makeTransaction({ date: new Date('2026-01-21') }))
			bc._addTransaction(makeTransaction({ date: new Date('2026-01-22') }))

			assert.equal(bc.blocks.length, 2)
		})

		it('Should throw an error if transaction already is in last block.', () => {
			const bc = new Blockchain([makeBlockObj(), makeBlockObj({ signed: true, date: new Date('2026-01-19') })]);
			const tx = makeTransaction({ date: new Date('2026-01-20'), moneycount: 2 })

			bc._addTransaction(tx)

			assert.throws(() => { bc._addTransaction(tx) }, InvalidTransactionError, 'Transaction duplicate ' + tx.signature)
		})

		it('Should throw error if transaction date is already passed in the blockchain.', () => {
			const bc = new Blockchain([makeBlockObj()]);
			bc.closeLastBlock(mySk)
			const tx = makeTransaction({ date: new Date('2026-01-20') })

			assert.throws(() => { bc._addTransaction(tx) }, InvalidTransactionError, 'Invalid date')
		})

		it('Should throw an error if transaction signature is invalid.', () => {
			const bc = new Blockchain([makeBlockObj(), makeBlockObj({ signed: true, date: new Date('2026-01-19') })])
			const tx = makeTransaction({ date: new Date('2026-01-20') })
			tx.signature = '0'.repeat(tx.signature.length)

			assert.throws(() => { bc._addTransaction(tx) }, InvalidTransactionError, 'Invalid transaction')
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

		it('Should set new block date to "infinity".', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true }), makeBlockObj({ signed: true })])

			assert.equal(bc.blocks.length, 2)

			bc.newBlock()

			assert.equal(dateToInt(bc.lastblock.closedate), "99991231")
		})

		it('Should add a Block type.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true })])

			bc.newBlock()

			assert.equal(bc.blocks[0].toString(), '[Block]')
		})

		it('Should report money and invests.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, experience: 12 })])
			bc._addTransaction(makeTransaction({
				moneycount: 4,
				investscount: 4
			}))
			bc.closeLastBlock(mySk)

			bc.newBlock()

			assert.equal(bc.lastblock.money.length, 4)
			assert.equal(bc.lastblock.invests.length, 4)
		})

		it('Should report running engagement from previous block.', () => {
			const bc = new Blockchain([makeBlockObj({ signed: true, date: new Date("2025-01-01") })])
			const tx = makeTransaction({
				type: TXTYPE.ENGAGE,
				money: [20250101000, 20250102000, 20250103000],
				date: new Date("2025-01-02")
			})
			bc._addTransaction(tx)
			bc.closeLastBlock(mySk, new Date("2025-01-02"))

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
			bc._addTransaction(tx)
			bc.closeLastBlock(mySk, new Date("2025-01-03"))

			bc.newBlock()

			assert.equal(bc.blocks.length, 3)
			assert.equal(bc.lastblock.transactions.length, 0)
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
				signer: targetPk,
				type: BLOCKTYPE.CITIZENBIRTH
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

	describe('getHistory', () => {
		it('Should return transactions from every block when depth is 0 (default).', () => {
			const tx1 = makeTransaction({ date: new Date('2025-01-01') })
			const tx2 = makeTransaction({ date: new Date('2025-01-02') })
			const tx3 = makeTransaction({ date: new Date('2025-01-03') })
			const bc = new Blockchain([
				makeBlockObj({ date: new Date('2025-01-03'), transactions: [tx3] }),
				makeBlockObj({ date: new Date('2025-01-02'), transactions: [tx2], signed: true }),
				makeBlockObj({ date: new Date('2025-01-01'), transactions: [tx1], signed: true })
			])

			const result = bc.getHistory()

			assert.equal(result.length, 3)
		})

		it('Should only look in the given number of most recent blocks when depth > 0.', () => {
			const tx1 = makeTransaction({ date: new Date('2025-01-01') })
			const tx2 = makeTransaction({ date: new Date('2025-01-02') })
			const tx3 = makeTransaction({ date: new Date('2025-01-03') })
			const bc = new Blockchain([
				makeBlockObj({ date: new Date('2025-01-03'), transactions: [tx3] }),
				makeBlockObj({ date: new Date('2025-01-02'), transactions: [tx2], signed: true }),
				makeBlockObj({ date: new Date('2025-01-01'), transactions: [tx1], signed: true })
			])

			const result = bc.getHistory(2)

			assert.equal(result.length, 2)
			assert.notInclude(result.map(tx => tx.signature), tx1.signature)
		})
	})

})