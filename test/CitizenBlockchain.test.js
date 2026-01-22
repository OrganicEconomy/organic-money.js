import { describe, it } from 'mocha';
import { assert } from 'chai';

import { InvalidTransactionError } from '../src/errors.js';
import { Blockchain } from '../src/Blockchain.js';
import { CitizenBlockchain } from '../src/CitizenBlockchain.js';
import { privateKey1, publicKey1, privateKey2, publicKey2, privateKey3, publicKey3 } from './testUtils.js'
import { dateToInt } from '../src/crypto.js'

/**
describe('CitizenBlockchain', () => {
	const validBirthBlock = () => {
		// A valid birth block for someone named Gus,
		// born the 28/11/1989 and subscribing on
		// the 01/01/2025.
		const res = {
			version: Blockchain.VERSION,
			closedate: 20250101,
			previousHash: Blockchain.REF_HASH,
			signer: publicKey1,
			money: [20250101000],
			invests: [20250101000],
			total: 0,
			merkleroot: 0,
			transactions: [
				{
					version: Blockchain.VERSION,
					date: 19891189,
					source: 'Gus',
					target: publicKey1,
					money: [],
					invests: [],
					type: Blockchain.TXTYPE.INIT,
					signer: 0,
					hash: 0
				},
				{
					version: Blockchain.VERSION,
					date: 20250101,
					source: publicKey1,
					target: publicKey1,
					money: [20250101000],
					invests: [20250101000],
					type: Blockchain.TXTYPE.CREATE,
					signer: 0,
					hash: 0
				}
			]
		}
		Blockchain.signblock(res, privateKey1);
		return res;
	}

	const validInitBlock = () => {
		const res = {
			closedate: '21/09/2021',
			previousHash: validBirthBlock().hash,
			merkleroot: 0,
			signer: publicKey2,
			total: 0,
			version: 1,
			money: [],
			invests: [],
			transactions: []
		}
		Blockchain.signblock(res, privateKey2);
		return res;
	}

	const validCashBlock = () => {
		const res = {
			closedate: 20250102,
			previousHash: validInitBlock().hash,
			merkleroot: 0,
			signer: publicKey1,
			total: 27,
			version: 1,
			money: [20250101000, 20250102000, 20250102001, 20250102002, 20250102003],
			invests: [202501019000, 202501029000, 202501029001, 202501029002, 202501029003],
			transactions: [
				{
					version: Blockchain.VERSION,
					date: 20250102,
					source: publicKey1,
					target: publicKey1,
					money: [20250102000, 20250102001, 20250102002, 20250102003],
					invests: [202501029000, 202501029001, 202501029002, 202501029003],
					type: Blockchain.TXTYPE.CREATE,
					signer: 0,
					hash: 0
				},
				{
					version: Blockchain.VERSION,
					date: 20250102,
					source: publicKey2,
					target: publicKey1,
					money: [20241228000, 20241228001, 20250101002, 20250101003, 20250101004, 20250101005, 20250101006, 20250101007, 20250101008, 20250101009, 20250101010, 20250101011, 20250101012, 20250101013, 20250101014, 20250101015, 20250101016, 20250101017, 20250101018, 20250101019, 20250101020, 20250101021, 20250101022, 20250101023, 20250101024, 20250101025, 20250101026],
					invests: [],
					type: Blockchain.TXTYPE.PAY,
					signer: 0,
					hash: 0
				}
			]
		}
		Blockchain.signblock(res, privateKey1);
		return res;
	}

	const validEngagedBlock = () => {
		const res = {
			closedate: 20250102,
			previousHash: validInitBlock().hash,
			merkleroot: 0,
			signer: publicKey1,
			total: 27,
			version: 1,
			money: [20250101000],
			invests: [20250101000],
			transactions: [
				{
					version: Blockchain.VERSION,
					date: 20250102,
					source: publicKey1,
					target: 0,
					money: [20250102002, 20250102003, 20250103000, 20250103001, 20250104000, 20250104001],
					invests: [],
					type: Blockchain.TXTYPE.ENGAGE,
					signer: publicKey1,
					hash: 0
				},
				{
					version: Blockchain.VERSION,
					date: 20250102,
					source: publicKey1,
					target: 0,
					money: [],
					invests: [202501029002, 202501029003, 202501039000, 202501039001, 202501049000, 202501049001],
					type: Blockchain.TXTYPE.ENGAGE,
					signer: publicKey1,
					hash: 0
				}
			]
		}
		Blockchain.signblock(res, privateKey1);
		return res;
	}

	describe('createMoneyAndInvests', () => {
		it('Should throw error if date is in the futur.', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			assert.throws(() => { bc.createMoneyAndInvests(privateKey1, tomorrow) }, 'Cannot create futur money, live in the present.')
		})

		it('Should return transaction in OK case.', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()]);

			bc.createMoneyAndInvests(privateKey1, new Date('2025-01-02'));
			const result = bc.lastblock.transactions[0]

			assert.ok(Blockchain.isValidTransaction(result))
			delete result.hash

			const expected = {
				version: 1,
				type: Blockchain.TXTYPE.CREATE,
				date: 20250102,
				source: publicKey1,
				target: publicKey1,
				signer: 0,
				money: [20250102000],
				invests: [202501029000]
			}

			assert.deepEqual(result, expected)
		})

		it('Should create 1+Total^(1/3) Money.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			bc.createMoneyAndInvests(privateKey1, new Date('2025-01-03'))

			const result = bc.lastblock.transactions[0]
			delete result.hash

			const expected = {
				version: Blockchain.VERSION,
				type: Blockchain.TXTYPE.CREATE,
				date: 20250103,
				source: publicKey1,
				target: publicKey1,
				money: [20250103000, 20250103001, 20250103002, 20250103003],
				invests: [202501039000, 202501039001, 202501039002, 202501039003],
				signer: 0
			}

			assert.deepEqual(result, expected)
		})

		it('Should return null if given date was already done.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()]);

			const result = bc.createMoneyAndInvests(privateKey1, new Date('2025-01-01'));

			assert.isNull(result)
		})

		it('Should increase money of the block.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			const tx = bc.createMoneyAndInvests(privateKey1, new Date('2025-01-03'))
			const expected = [
				20250101000,
				20250102000, 20250102001, 20250102002, 20250102003,
				20250103000, 20250103001, 20250103002, 20250103003,
			]

			assert.deepEqual(bc.lastblock.money, expected)
		})

		it('Should increase invests of the block.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			const tx = bc.createMoneyAndInvests(privateKey1, new Date('2025-01-03'))
			const expected = [
				202501019000,
				202501029000, 202501029001, 202501029002, 202501029003,
				202501039000, 202501039001, 202501039002, 202501039003,
			]

			assert.deepEqual(bc.lastblock.invests, expected)
		})

		it('Should create 1+Total^(1/3) minus engaged money/invests.', () => {
			const bc = new CitizenBlockchain([validEngagedBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.createMoneyAndInvests(privateKey1, new Date('2025-01-02'))
			delete result.hash

			const expected = {
				version: Blockchain.VERSION,
				type: Blockchain.TXTYPE.CREATE,
				date: 20250102,
				source: publicKey1,
				target: publicKey1,
				money: [20250102000, 20250102001],
				invests: [202501029000, 202501029001],
				signer: 0
			}

			assert.deepEqual(result, expected)
		})
	})

	describe('engageInvests', () => {
		it('Should throw error if daily amount is unaffordable.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const dailyAmount = 5 // total is 27 so daily creation is 3+1=4

			const fn = () => { bc.engageInvests(privateKey1, publicKey2, dailyAmount, 12) }

			assert.throws(fn, InvalidTransactionError, 'Unsufficient funds.')
		})

		it('Should return a transaction with correct invests engaged.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const dailyAmount = 4
			const days = 3
			const date = new Date("2025-01-02")

			const expected = {
				version: Blockchain.VERSION,
				date: 20250102,
				source: publicKey1,
				target: publicKey2,
				money: [],
				invests: [
					202501029000, 202501029001, 202501029002, 202501029003,
					202501039000, 202501039001, 202501039002, 202501039003,
					202501049000, 202501049001, 202501049002, 202501049003,
				],
				type: Blockchain.TXTYPE.ENGAGE,
				signer: 0,
			}

			const tx = bc.engageInvests(privateKey1, publicKey2, dailyAmount, days, date)
			delete tx.hash

			assert.deepEqual(tx, expected)
		})

		it('Should return a signed transaction.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const dailyAmount = 4
			const days = 3
			const date = new Date("2025-01-04")
			const tx = bc.engageInvests(privateKey1, publicKey2, dailyAmount, days, date)

			const signature = Blockchain.isValidTransaction(tx)

			assert.ok(signature, 'invalid signature')
		})

		it('Should add the returned transaction to the blockchain.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const tx = bc.engageInvests(privateKey1, publicKey2, 3, 3)

			assert.deepEqual(bc.lastblock.transactions[0], tx)
		})

		it('Should throw error if daily amount is already engaged.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			bc.engageInvests(privateKey1, publicKey2, 3, 12)

			const fn = () => { bc.engageInvests(privateKey1, publicKey2, 2, 12) }

			assert.throws(fn, InvalidTransactionError, 'Unsufficient funds.')
		})

		it('Should engage invests that was not already engaged.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			bc.engageInvests(privateKey1, publicKey2, 2, 3, new Date("2025-01-02"))

			const expected = [
				202501039002, 202501039003, // the 3rd, 2 firsts are already engaged
				202501049002, 202501049003, // the 4th too
				202501059000, 202501059001, // the 5th, nothing was engaged
			]

			const tx = bc.engageInvests(privateKey1, publicKey2, 2, 3, new Date("2025-01-03"))

			assert.deepEqual(tx.invests, expected)
		})
	})

	describe('engageMoney', () => {
		it('Should throw error if daily amount is unaffordable.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const dailyAmount = 5 // total is 27 so daily creation is 3+1=4

			const fn = () => { bc.engageMoney(privateKey1, publicKey2, dailyAmount, 12) }

			assert.throws(fn, InvalidTransactionError, 'Unsufficient funds.')
		})

		it('Should return a transaction with correct money engaged.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const dailyAmount = 4
			const days = 3
			const date = new Date("2025-01-02")

			const expected = {
				version: Blockchain.VERSION,
				date: 20250102,
				source: publicKey1,
				target: publicKey2,
				money: [
					20250102000, 20250102001, 20250102002, 20250102003,
					20250103000, 20250103001, 20250103002, 20250103003,
					20250104000, 20250104001, 20250104002, 20250104003,
				],
				invests: [],
				type: Blockchain.TXTYPE.ENGAGE,
				signer: 0,
			}

			const tx = bc.engageMoney(privateKey1, publicKey2, dailyAmount, days, date)
			delete tx.hash

			assert.deepEqual(tx, expected)
		})

		it('Should return a signed transaction.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const dailyAmount = 4
			const days = 3
			const date = new Date("2025-01-04")
			const tx = bc.engageMoney(privateKey1, publicKey2, dailyAmount, days, date)

			const signature = Blockchain.isValidTransaction(tx)

			assert.ok(signature, 'invalid signature')
		})

		it('Should add the returned transaction to the blockchain.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const tx = bc.engageMoney(privateKey1, publicKey2, 3, 3)

			assert.deepEqual(bc.lastblock.transactions[0], tx)
		})

		it('Should throw error if daily amount is already engaged.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			bc.engageMoney(privateKey1, publicKey2, 3, 12)

			const fn = () => { bc.engageMoney(privateKey1, publicKey2, 2, 12) }

			assert.throws(fn, InvalidTransactionError, 'Unsufficient funds.')
		})

		it('Should engage money that was not already engaged.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			bc.engageMoney(privateKey1, publicKey2, 2, 3, new Date("2025-01-02"))

			const expected = [
				20250103002, 20250103003, // the 3rd, 2 firsts are already engaged
				20250104002, 20250104003, // the 4th too
				20250105000, 20250105001, // the 5th, nothing was engaged
			]

			const tx = bc.engageMoney(privateKey1, publicKey2, 2, 3, new Date("2025-01-03"))

			assert.deepEqual(tx.money, expected)
		})
	})

	describe('getAvailableMoneyAmount', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new CitizenBlockchain()
			const result = bc.getAvailableMoneyAmount()

			assert.equal(result, 0)
		})

		it('Should return 0 for validation waiting blockchain', () => {
			const bc = new CitizenBlockchain([validBirthBlock()])
			const result = bc.getAvailableMoneyAmount()

			assert.equal(result, 0)
		})

		it('Should return last block s money for valid blockchain', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.getAvailableMoneyAmount()

			assert.equal(result, 5)
		})
	})

	describe('generatePaper', () => {
		it('Should throw error if blockchain can t afford the amount.', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])

			assert.throws(() => { bc.generatePaper(privateKey1, 2, publicKey2) }, 'Unsufficient funds')
		})

		it('Should throw error if date is already passed in the blockchain.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			assert.throws(() => { bc.generatePaper(privateKey1, 2, publicKey2, new Date('2025-01-01')) }, 'Invalid date')
		})

		it('Should return a valid transaction.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.generatePaper(privateKey1, 3, publicKey2, new Date('2025-01-03'))

			assert.ok(Blockchain.isValidTransaction(result), "invalid signature")
			delete result.hash

			const expected = {
				version: Blockchain.VERSION,
				type: Blockchain.TXTYPE.PAPER,
				date: 20250103,
				money: [20250101000, 20250102000, 20250102001],
				invests: [],
				source: publicKey1,
				target: 0,
				signer: publicKey2
			}

			assert.deepEqual(result, expected)
		})

		it('Should add the created transaction to the blockchain.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			const tx = bc.generatePaper(privateKey1, 3, publicKey2, new Date('2025-01-03'))

			const result = bc.lastblock.transactions[0]

			assert.deepEqual(result, tx)
		})

		it('Should decrease money of the block.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			bc.generatePaper(privateKey1, 3, publicKey2, new Date('2025-01-03'))

			const result = bc.lastblock.money
			const expected = [20250102002, 20250102003]

			assert.deepEqual(result, expected)
		})
	})

	describe('getLevel', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new CitizenBlockchain()
			const result = bc.getLevel()

			assert.equal(result, 0)
		})

		it('Should return 2 for t=1 to 7', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])
			for (let i = 1; i < 8; i++) {
				bc.lastblock.total = i
				assert.equal(bc.getLevel(), 2, "i = " + i)
			}
		})

		it('Should return 3 for t=8 to 26', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])
			for (let i = 8; i < 26; i++) {
				bc.lastblock.total = i
				assert.equal(bc.getLevel(), 3)
			}
		})
	})

	describe('getMoneyBeforeNextLevel', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new CitizenBlockchain()
			const result = bc.getMoneyBeforeNextLevel()

			assert.equal(result, 0)
		})

		it('Should return 16 for total at 11 (target is 27)', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])
			bc.lastblock.total = 11

			const result = bc.getMoneyBeforeNextLevel()

			assert.equal(result, 16)
		})

		it('Should return percent if as_percent is true', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])
			bc.lastblock.total = 11

			const result = bc.getMoneyBeforeNextLevel(true)

			assert.equal(result, 40)
		})
	})

	describe('hasLevelUpOnLastTx', () => {
		it('Should return false if there is no transaction.', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])

			const result = bc.hasLevelUpOnLastTx()

			assert.isNotOk(result)
		})

		it('Should return false if last Transaction did not change level (from 27 to 63).', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const money = []
			for (let i = 0; i < 36; i++) {
				money.push(20241229000 + i)
			}

			bc.addTransaction({
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey2,
				target: publicKey1,
				money: money,
				invests: [],
				type: Blockchain.TXTYPE.PAY,
				signer: 0
			})
			bc.lastblock.total += 36;

			const result = bc.hasLevelUpOnLastTx()

			assert.isNotOk(result)
		})

		it('Should return true after passed from 27 to 64 Total.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const money = []
			for (let i = 0; i < 37; i++) {
				money.push(20241229000 + i)
			}

			bc.addTransaction({
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey2,
				target: publicKey1,
				money: money,
				invests: [],
				type: Blockchain.TXTYPE.PAY,
				signer: 0
			})
			bc.lastblock.total += 37;

			const result = bc.hasLevelUpOnLastTx()

			assert.ok(result)
		})
	})

	describe('isWaitingValidation', () => {
		it('Should return false for empty blockchain', () => {
			const bc = new CitizenBlockchain()
			const result = bc.isWaitingValidation()

			assert.isNotOk(result)
		})

		it('Should return false for already valid blockchain', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])
			const result = bc.isWaitingValidation()

			assert.isNotOk(result)
		})

		it('Should return false if the block is not a birth one', () => {
			const bc = new CitizenBlockchain([validInitBlock()])
			const result = bc.isWaitingValidation()

			assert.isNotOk(result)
		})

		it('Should return true for blockchain effectively waiting for validation', () => {
			const bc = new CitizenBlockchain([validBirthBlock()])
			const result = bc.isWaitingValidation()

			assert.ok(result)
		})
	})

	describe('isValidated', () => {
		it('Should return false for empty blockchain', () => {
			const bc = new CitizenBlockchain()
			const result = bc.isValidated()

			assert.isNotOk(result)
		})

		it('Should return false if the first block is not a birth one', () => {
			const bc = new CitizenBlockchain([validInitBlock()])
			const result = bc.isValidated()

			assert.isNotOk(result)
		})

		it('Should return true for a valid blockchain', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])
			const result = bc.isValidated()

			assert.ok(result)
		})

		it('Should return true for a long time valid', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const result = bc.isValidated()

			assert.ok(result)
		})
	})


	describe('makeBirthBlock', () => {
		it('Should return corectly filled block', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'

			const block = bc.makeBirthBlock(privateKey1, birthdate, name, today)
			delete block.hash
			delete block.transactions[0].hash
			delete block.transactions[1].hash

			const expected = {
				version: Blockchain.VERSION,
				closedate: dateToInt(today),
				previousHash: Blockchain.REF_HASH,
				signer: publicKey1,
				money: [20250225000],
				invests: [202502259000],
				total: 0,
				merkleroot: 0,
				transactions: [
					{
						version: Blockchain.VERSION,
						date: 20021212,
						source: publicKey1,
						target: name,
						money: [],
						invests: [],
						type: Blockchain.TXTYPE.INIT,
						signer: 0
					},
					{
						version: Blockchain.VERSION,
						date: 20250225,
						source: publicKey1,
						target: publicKey1,
						money: [20250225000],
						invests: [202502259000],
						type: Blockchain.TXTYPE.CREATE,
						signer: 0
					}
				]
			}

			assert.deepEqual(block, expected)
		})

		it('Should return a signed block.', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'
			const block = bc.makeBirthBlock(privateKey1, birthdate, name, today)

			const signature = Blockchain.isValidBlock(block, publicKey1)

			assert.ok(signature)
		})

		it('Should return a block with signed transactions.', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'
			const block = bc.makeBirthBlock(privateKey1, birthdate, name, today)

			const signature1 = Blockchain.isValidTransaction(block.transactions[0])
			const signature2 = Blockchain.isValidTransaction(block.transactions[1])

			assert.ok(signature1)
			assert.ok(signature2)
		})
	})

	describe('startBlockchain', () => {
		it('Should make a ready to go blockchain', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-01')
			const name = 'Gus'

			bc.startBlockchain(name, birthdate, privateKey2, privateKey1, today)
			for (let block of bc.blocks) {
				delete block.hash
				delete block.previousHash
				for (let tx of block.transactions) {
					delete tx.hash
				}
			}

			const expected = [
				{
					closedate: 20250201,
					signer: publicKey2,
					total: 0,
					money: [20250201000],
					invests: [202502019000],
					version: 1,
					transactions: [],
					merkleroot: 0
				},
				{
					version: Blockchain.VERSION,
					closedate: dateToInt(today),
					signer: publicKey1,
					money: [20250201000],
					invests: [202502019000],
					total: 0,
					merkleroot: 0,
					transactions: [
						{
							version: Blockchain.VERSION,
							date: 20021212,
							source: publicKey1,
							target: name,
							money: [],
							invests: [],
							type: Blockchain.TXTYPE.INIT,
							signer: 0
						},
						{
							version: Blockchain.VERSION,
							date: 20250201,
							source: publicKey1,
							target: publicKey1,
							money: [20250201000],
							invests: [202502019000],
							type: Blockchain.TXTYPE.CREATE,
							signer: 0
						}
					]
				}
			]

			assert.deepEqual(bc.blocks, expected)
		})

		it('Should use todays date if none given', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = dateToInt(new Date())
			const name = 'Gus'

			bc.startBlockchain(name, birthdate, privateKey2, privateKey1)

			assert.equal(bc.lastblock.closedate, today)
			assert.equal(bc.blocks[1].closedate, today)
			assert.equal(bc.blocks[1].transactions[1].date, today)
		})

		it('Should make and return a new private key if none given.', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const name = 'Gus'

			const result = bc.startBlockchain(name, birthdate, privateKey2)

			assert.equal(result.length, 64)
		})
	})

	describe('validateAccount', () => {
		it('Should return a valid initialization block', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'
			const block = bc.makeBirthBlock(privateKey1, birthdate, name, today)

			bc.validateAccount(privateKey2, new Date('2025-01-03'))
			delete bc.lastblock.hash
			delete bc.lastblock.previousHash

			const expectedInitializationBlock = {
				closedate: 20250103,
				signer: publicKey2,
				total: 0,
				money: [20250225000],
				invests: [202502259000],
				version: 1,
				transactions: [],
				merkleroot: 0
			}

			assert.deepEqual(bc.lastblock, expectedInitializationBlock)
		})

		it('Should return a signed initialization block', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'
			const block = bc.makeBirthBlock(privateKey1, birthdate, name, today)

			bc.validateAccount(privateKey2, new Date('2025-01-03'))

			assert.ok(Blockchain.isValidBlock(bc.lastblock, publicKey2))
		})
	})
})
*/