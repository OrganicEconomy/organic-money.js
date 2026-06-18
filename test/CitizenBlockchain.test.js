import { describe, it } from 'mocha';
import { assert } from 'chai';

import { InvalidTransactionError, UnauthorizedError, InvalidBlockchainError } from '../src/errors.js';
import { Blockchain } from '../src/Blockchain.js';
import { CitizenBlockchain } from '../src/CitizenBlockchain.js';
import { mySk, myPk, targetSk, targetPk, makeBlock, makeBlockObj, makeTransaction, referentSk, referentPk } from './testUtils.js'
import { dateToInt, intToDate, randomPrivateKey, buildInvestIndexes, buildMoneyIndexes } from '../src/crypto.js'
import { TXTYPE, PayerOrderTransaction, EarnTransaction, PayTransaction, CreateTransaction } from '../src/Transaction.js'


describe('CitizenBlockchain', () => {
	function level3CitizenBlockchain() {
		const bc = new CitizenBlockchain()
		bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))
		bc.receivePay(makeTransaction({
			target: myPk,
			type: TXTYPE.PAY,
			signer: referentPk,
			sk: referentSk,
			moneycount: 27,
			date: new Date('2025-01-03')
		}))
		return bc
	}

	describe('_addTransaction', () => {
		it('Should add the given transaction to last block', () => {
			const blockObj1 = makeBlockObj({ signed: true })
			const blockObj2 = makeBlockObj({ signed: false })
			const blockchain = new CitizenBlockchain([blockObj2, blockObj1])

			const tx = makeTransaction()

			blockchain._addTransaction(tx)

			assert.deepEqual(blockchain.lastTransaction, tx)
		})

		it('Should create a new block if last one is signed', () => {
			const blockObj1 = makeBlockObj({ signed: true })
			const blockchain = new CitizenBlockchain([blockObj1])

			const tx = makeTransaction({ date: new Date() })

			blockchain._addTransaction(tx)

			assert.equal(blockchain.blocks.length, 2)
		})

		it('Should NOT create a new block if last one is NOT signed', () => {
			const bc = new CitizenBlockchain([makeBlockObj(), makeBlockObj({ signed: true, date: new Date('2026-01-19') })]);

			bc._addTransaction(makeTransaction({ date: new Date('2026-01-20') }))
			bc._addTransaction(makeTransaction({ date: new Date('2026-01-21') }))
			bc._addTransaction(makeTransaction({ date: new Date('2026-01-22') }))

			assert.equal(bc.blocks.length, 2)
		})

		it('Should throw an error if transaction already is in last block.', () => {
			const bc = new CitizenBlockchain([makeBlockObj(), makeBlockObj({ signed: true, date: new Date('2026-01-19') })]);
			const tx = makeTransaction(new Date('2026-01-20'), 2)

			bc._addTransaction(tx)

			assert.throws(() => { bc._addTransaction(tx) }, InvalidTransactionError, 'Transaction duplicate ' + tx.signature)
		})

		it('Should add money to experience if type is PAY and target is blockchain owner.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), targetSk, mySk)

			const tx = makeTransaction({
				type: TXTYPE.PAY,
				signer: targetPk,
				sk: targetSk,
				target: myPk,
				moneycount: 7
			})

			bc.receivePay(tx)

			assert.isTrue(tx.isValid())
			assert.equal(bc.experience, 7)
		})
	})
	
	describe('createMoneyAndInvests', () => {
		it('Should throw error if private key does not belong to the blockchain owner.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk)

			assert.throws(() => { bc.createMoneyAndInvests(targetSk) }, UnauthorizedError)
		})

		it('Should throw error if date is in the futur.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk)

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			assert.throws(() => { bc.createMoneyAndInvests(mySk, tomorrow) }, InvalidTransactionError)
		})

		it('Should return transaction in OK case.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))

			const tx = bc.createMoneyAndInvests(mySk, new Date('2025-01-03'))

			assert.isTrue(tx.isValid())
			
			delete tx.signature
			const expected = {
				version: 1,
				type: TXTYPE.CREATE,
				date: intToDate(20250103),
				target: "",
				signer: myPk,
				money: [20250103000],
				invests: [202501039000]
			}

			assert.deepEqual(tx, expected)
		})

		it('Should create 1+Total^(1/3) Money.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))
			bc.receivePay(makeTransaction({
				target: myPk,
				type: TXTYPE.PAY,
				signer: referentPk,
				sk: referentSk,
				moneycount: 27,
				date: new Date('2025-01-02')
			 }))
			bc.createMoneyAndInvests(mySk, new Date('2025-01-03'))

			const tx = bc.lastblock.transactions[0]
			delete tx.signature

			const expected = {
				version: Blockchain.VERSION,
				type: TXTYPE.CREATE,
				date: intToDate(20250103),
				target: "",
				money: [20250103000, 20250103001, 20250103002, 20250103003],
				invests: [202501039000, 202501039001, 202501039002, 202501039003],
				signer: myPk
			}

			assert.deepEqual(tx, expected)
		})

		it('Should return null if given date was already done.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-01'))
			bc.createMoneyAndInvests(mySk, new Date('2025-01-01'))

			const result = bc.createMoneyAndInvests(mySk, new Date('2025-01-01'))

			assert.isNull(result)
		})

		it('Should increase money of the block.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))
			bc.receivePay(makeTransaction({
				target: myPk,
				type: TXTYPE.PAY,
				signer: referentPk,
				sk: referentSk,
				moneycount: 27,
				date: new Date('2025-01-03')
			}))

			bc.createMoneyAndInvests(mySk, new Date('2025-01-03'))
			const expected = [
				20250102000, 20250103000, 20250103001, 20250103002, 20250103003,
			]

			assert.deepEqual(bc.money, expected)
		})

		it('Should increase invests of the block.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))
			bc.receivePay(makeTransaction({
				target: myPk,
				type: TXTYPE.PAY,
				signer: referentPk,
				sk: referentSk,
				moneycount: 27,
				date: new Date('2025-01-03')
			}))

			bc.createMoneyAndInvests(mySk, new Date('2025-01-03'))
			const expected = [
				202501029000, 202501039000, 202501039001, 202501039002, 202501039003,
			]

			assert.deepEqual(bc.invests, expected)
		})

		it('Should not corrupt the previous CREATE transaction.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))

			const prevCreateTx = bc.getLastCreationTransaction()

			bc.createMoneyAndInvests(mySk, new Date('2025-01-03'))

			assert.isTrue(prevCreateTx.isValid())
		})

		it('Should create 1+Total^(1/3) minus engaged money/invests.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))
			bc.receivePay(makeTransaction({
				target: myPk,
				type: TXTYPE.PAY,
				signer: referentPk,
				sk: referentSk,
				moneycount: 27,
				date: new Date('2025-01-03')
			}))
			bc._addTransaction(makeTransaction({
				date: new Date('2025-01-03'),
				type: TXTYPE.ENGAGE,
				money: [20250103000, 20250103001]
			}))
			bc._addTransaction(makeTransaction({
				date: new Date('2025-01-03'),
				type: TXTYPE.ENGAGE,
				invests: [202501039000]
			}))

			const tx = bc.createMoneyAndInvests(mySk, new Date('2025-01-03'))

			delete tx.signature

			const expected = {
				version: Blockchain.VERSION,
				type: TXTYPE.CREATE,
				date: new Date('2025-01-03'),
				target: "",
				money: [20250103002, 20250103003],
				invests: [202501039001, 202501039002, 202501039003],
				signer: myPk
			}

			assert.deepEqual(tx, expected)
		})
	})

	describe('getLastCreationTransaction', () => {
		it('Should return the last CREATE when multiple exist in the same unsigned block.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))
			bc.createMoneyAndInvests(mySk, new Date('2025-01-03'))
			bc.createMoneyAndInvests(mySk, new Date('2025-01-04'))

			const lastCreate = bc.getLastCreationTransaction()

			assert.equal(dateToInt(lastCreate.date), '20250104')
		})

		it('Should not create duplicate money when called multiple times before block is signed.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))
			bc.createMoneyAndInvests(mySk, new Date('2025-01-03'))
			bc.createMoneyAndInvests(mySk, new Date('2025-01-04'))

			bc.createMoneyAndInvests(mySk, new Date('2025-01-05'))

			const allMoney = bc.money
			assert.equal(allMoney.length, new Set(allMoney).size, 'Duplicate money indexes detected')
		})
	})

	describe('makeFilteredMoneyIndexes', () => {
		it('Should not mutate the fromdate parameter.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))

			const fromdate = new Date('2025-01-03')
			const originalTime = fromdate.getTime()

			bc.makeFilteredMoneyIndexes(1, fromdate, new Date('2025-01-05'))

			assert.equal(fromdate.getTime(), originalTime)
		})
	})

	describe('makeFilteredInvestsIndexes', () => {
		it('Should not mutate the fromdate parameter.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))

			const fromdate = new Date('2025-01-03')
			const originalTime = fromdate.getTime()

			bc.makeFilteredInvestsIndexes(1, fromdate, new Date('2025-01-05'))

			assert.equal(fromdate.getTime(), originalTime)
		})
	})

	describe('engageInvests', () => {
		it('Should throw error if private key does not belong to the blockchain owner.', () => {
			const bc = level3CitizenBlockchain()

			assert.throws(() => { bc.engageInvests(targetSk, referentPk, 1, 1) }, UnauthorizedError)
		})

		it('Should throw error if daily amount is unaffordable.', () => {
			const bc = level3CitizenBlockchain()
			const dailyAmount = 5 // experience is 27 so daily creation is 3+1=4

			const fn = () => { bc.engageInvests(mySk, targetPk, dailyAmount, 12) }

			assert.throws(fn, InvalidTransactionError, 'Unsufficient funds.')
		})

		it('Should return a transaction with correct invests engaged.', () => {
			const bc = level3CitizenBlockchain()
			const dailyAmount = 4
			const days = 3
			const date = new Date("2025-01-02")

			const expected = {
				version: Blockchain.VERSION,
				date: new  Date("2025-01-02"),
				target: targetPk,
				money: [],
				invests: [
					202501029000, 202501029001, 202501029002, 202501029003,
					202501039000, 202501039001, 202501039002, 202501039003,
					202501049000, 202501049001, 202501049002, 202501049003,
				],
				type: TXTYPE.ENGAGE,
				signer: myPk,
			}

			const tx = bc.engageInvests(mySk, targetPk, dailyAmount, days, date)
			delete tx.signature

			assert.deepEqual(tx, expected)
		})

		it('Should return a signed transaction.', () => {
			const bc = level3CitizenBlockchain()
			const dailyAmount = 4
			const days = 3
			const date = new Date("2025-01-04")
			const tx = bc.engageInvests(mySk, targetPk, dailyAmount, days, date)

			assert.isTrue(tx.isValid(), 'invalid signature')
		})

		it('Should add the returned transaction to the blockchain.', () => {
			const bc = level3CitizenBlockchain()
			const tx = bc.engageInvests(mySk, targetPk, 3, 3)

			assert.deepEqual(bc.lastTransaction, tx)
		})

		it('Should throw error if daily amount is already engaged.', () => {
			const bc = level3CitizenBlockchain()
			bc.engageInvests(mySk, targetPk, 3, 12)

			const fn = () => { bc.engageInvests(mySk, targetPk, 2, 12) }

			assert.throws(fn, InvalidTransactionError, 'Unsufficient funds.')
		})

		it('Should engage invests that was not already engaged.', () => {
			const bc = level3CitizenBlockchain()
			bc.engageInvests(mySk, targetPk, 2, 3, new Date("2025-01-02"))

			const expected = [
				202501039002, 202501039003, // the 3rd, 2 firsts are already engaged
				202501049002, 202501049003, // the 4th too
				202501059000, 202501059001, // the 5th, nothing was engaged
			]

			const tx = bc.engageInvests(mySk, targetPk, 2, 3, new Date("2025-01-03"))

			assert.deepEqual(tx.invests, expected)
		})
	})

	describe('engageMoney', () => {
		it('Should throw error if private key does not belong to the blockchain owner.', () => {
			const bc = level3CitizenBlockchain()

			assert.throws(() => { bc.engageMoney(targetSk, referentPk, 1, 1) }, UnauthorizedError)
		})

		it('Should throw error if daily amount is unaffordable.', () => {
			const bc = level3CitizenBlockchain()
			const dailyAmount = 5 // experience is 27 so daily creation is 3+1=4

			const fn = () => { bc.engageMoney(mySk, targetPk, dailyAmount, 12) }

			assert.throws(fn, InvalidTransactionError, 'Unsufficient funds.')
		})

		it('Should return a transaction with correct money engaged.', () => {
			const bc = level3CitizenBlockchain()
			const dailyAmount = 4
			const days = 3
			const date = new Date("2025-01-02")

			const expected = {
				version: Blockchain.VERSION,
				date: new Date("2025-01-02"),
				target: targetPk,
				money: [
					20250102000, 20250102001, 20250102002, 20250102003,
					20250103000, 20250103001, 20250103002, 20250103003,
					20250104000, 20250104001, 20250104002, 20250104003,
				],
				invests: [],
				type: TXTYPE.ENGAGE,
				signer: myPk
			}

			const tx = bc.engageMoney(mySk, targetPk, dailyAmount, days, date)
			delete tx.signature

			assert.deepEqual(tx, expected)
		})

		it('Should return a signed transaction.', () => {
			const bc = level3CitizenBlockchain()
			const dailyAmount = 4
			const days = 3
			const date = new Date("2025-01-04")
			const tx = bc.engageMoney(mySk, targetPk, dailyAmount, days, date)

			assert.isTrue(tx.isValid(), 'invalid signature')
		})

		it('Should add the returned transaction to the blockchain.', () => {
			const bc = level3CitizenBlockchain()
			const tx = bc.engageMoney(mySk, targetPk, 3, 3)

			assert.deepEqual(bc.lastTransaction, tx)
		})

		it('Should throw error if daily amount is already engaged.', () => {
			const bc = level3CitizenBlockchain()
			bc.engageMoney(mySk, targetPk, 3, 12)

			const fn = () => { bc.engageMoney(mySk, targetPk, 2, 12) }

			assert.throws(fn, InvalidTransactionError, 'Unsufficient funds.')
		})

		it('Should engage money that was not already engaged.', () => {
			const bc = level3CitizenBlockchain()
			bc.engageMoney(mySk, targetPk, 2, 3, new Date("2025-01-02"))

			const expected = [
				20250103002, 20250103003, // the 3rd, 2 firsts are already engaged
				20250104002, 20250104003, // the 4th too
				20250105000, 20250105001, // the 5th, nothing was engaged
			]

			const tx = bc.engageMoney(mySk, targetPk, 2, 3, new Date("2025-01-03"))

			assert.deepEqual(tx.money, expected)
		})

		it('Should throw error if a future day in the engagement period has insufficient funds.', () => {
			const bc = level3CitizenBlockchain()
			bc.engageMoney(mySk, targetPk, 2, 1, new Date('2025-01-05')) // 2 of 4 slots taken on Jan 05

			// Jan 04: 4 available → 3 requested → passes initial check
			// Jan 05: 4 - 2 = 2 available → 3 requested → should throw
			assert.throws(
				() => bc.engageMoney(mySk, targetPk, 3, 2, new Date('2025-01-04')),
				InvalidTransactionError,
				'Unsufficient funds.'
			)
		})
	})

	describe('getAvailableMoneyAmount', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new CitizenBlockchain()
			const result = bc.getAvailableMoneyAmount()

			assert.equal(result, 0)
		})

		it('Should return 0 for validation waiting blockchain', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2020-12-12'), mySk)
			const result = bc.getAvailableMoneyAmount()

			assert.equal(result, 0)
		})

		it('Should return last block s money for valid blockchain', () => {
			const bc = level3CitizenBlockchain()
			bc._addTransaction(makeTransaction({
				type: TXTYPE.CREATE,
				moneycount: 4,
				investcount: 4
			}))

			const result = bc.getAvailableMoneyAmount()

			assert.equal(result, 5)
		})
	})

	describe('generatePaper', () => {
		it('Should throw error if private key does not belong to the blockchain owner.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk)
			bc._addTransaction(makeTransaction({ type: TXTYPE.CREATE, moneycount: 3 }))

			assert.throws(() => { bc.generatePaper(targetSk, 1, referentPk) }, UnauthorizedError)
		})

		it('Should throw error if blockchain can t afford the amount.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), mySk, targetSk)

			assert.throws(() => { bc.generatePaper(targetSk, 2, myPk) }, 'Unsufficient funds')
		})

		it('Should throw error if date is before last transaction.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk, new Date('2025-01-02'))
			bc._addTransaction(makeTransaction({
				type: TXTYPE.CREATE,
				moneycount: 3,
				investscount: 3,
				date: new Date('2025-01-05')
			}))

			assert.throws(() => { bc.generatePaper(mySk, 2, referentPk, new Date('2025-01-03')) }, InvalidTransactionError)
		})

		it('Should return a valid transaction.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20250101'), referentSk, mySk, intToDate('20250101'))
			bc._addTransaction(makeTransaction({
				type: TXTYPE.CREATE,
				moneycount: 1,
				investcount: 1,
				date: new Date('2025-01-02')
			}))
			bc._addTransaction(makeTransaction({
				type: TXTYPE.CREATE,
				moneycount: 3,
				investcount: 3,
				date: new Date('2025-01-03')
			}))

			const result = bc.generatePaper(mySk, 3, referentPk, intToDate('20250103'))

			assert.isTrue(result.isValid())
			assert.equal(result.type, TXTYPE.PAPER)
			assert.equal(dateToInt(result.date), '20250103')
			assert.equal(result.target, referentPk)
			assert.equal(result.signer, myPk)
			assert.deepEqual(result.money, [20250101000, 20250102000, 20250103000])
		})

		it('Should add the created transaction to the blockchain.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk)
			bc._addTransaction(makeTransaction({
				type: TXTYPE.CREATE,
				moneycount: 3,
				investcount: 3
			}))

			const tx = bc.generatePaper(mySk, 3, targetPk)

			const result = bc.lastblock.transactions[0]

			assert.deepEqual(result, tx)
		})

		it('Should decrease money of the block.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', new Date('2025-01-02'), referentSk, mySk)
			bc._addTransaction(makeTransaction({
				type: TXTYPE.CREATE,
				moneycount: 3,
				investcount: 3
			}))

			bc.generatePaper(mySk, 2, targetPk)

			assert.equal(bc.lastblock.money.length, 2)
		})
	})

	describe('getLevel', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new CitizenBlockchain()

			const result = bc.getLevel()

			assert.equal(result, 0)
		})

		it('Should return 0 for a blockchain waiting for validation', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk)

			const result = bc.getLevel()

			assert.equal(result, 0)
		})

		it('Should return 2 for t=1 to 7', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk, targetSk)
			bc.addBlock(makeBlock({
				experience: 0
			}))

			for (let i = 1; i < 8; i++) {
				bc.receivePay(makeTransaction({
					type: TXTYPE.PAY,
					money: [20240101000 + i],
					target: targetPk
				}))
				assert.equal(bc.getLevel(), 2, "Error at i = " + i)
			}
		})

		it('Should return 3 for t=8 to 26', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk, targetSk)
			bc.addBlock(makeBlock({
				experience: 8
			}))

			for (let i = 8; i < 26; i++) {
				bc.receivePay(makeTransaction({
					type: TXTYPE.PAY,
					money: [20240101000 + i],
					target: targetPk
				}))
				assert.equal(bc.getLevel(), 3, "Error at i = " + i)
			}
		})
	})

	describe('getMoneyBeforeNextLevel', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new CitizenBlockchain()
			const result = bc.getMoneyBeforeNextLevel()

			assert.equal(result, 0)
		})

		it('Should return 16 for experience at 11 (target is 27)', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk)
			bc.addBlock(makeBlock({
				experience: 11
			}))

			const result = bc.getMoneyBeforeNextLevel()

			assert.equal(result, 16)
		})

		it('Should return percent if as_percent is true', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk)
			bc.addBlock(makeBlock({
				experience: 11
			}))

			const result = bc.getMoneyBeforeNextLevel(true)

			assert.equal(result, 40)
		})
	})

	describe('hasLevelUpOnLastTx', () => {
		it('Should return false if there is no transaction.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk)

			const result = bc.hasLevelUpOnLastTx()

			assert.isFalse(result)
		})

		it('Should return false if last Transaction did not change level (from 27 to 63).', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk, targetSk)
			bc.addBlock(makeBlock({
				experience: 27
			}))
			bc.receivePay(makeTransaction({
				type: TXTYPE.PAY,
				moneycount: 36,
				target: targetPk
			}))

			const result = bc.hasLevelUpOnLastTx()

			assert.isFalse(result, "Changed level while it should not have.")
		})

		it('Should return true after passed from 27 to 64 Total.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk, targetSk)
			bc.addBlock(makeBlock({
				experience: 27
			}))
			bc.receivePay(makeTransaction({
				type: TXTYPE.PAY,
				moneycount: 37,
				target: targetPk
			}))

			const result = bc.hasLevelUpOnLastTx()

			assert.isTrue(result)
		})

		it('Should return true after passed from 63 to 64 Total.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk, targetSk)
			bc.addBlock(makeBlock({
				experience: 63
			}))
			bc.receivePay(makeTransaction({
				type: TXTYPE.PAY,
				moneycount: 1,
				target: targetPk
			}))

			const result = bc.hasLevelUpOnLastTx()

			assert.isTrue(result)
		})

		it('Should return true after passed from 27 to 64 Total via EARN.', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk, targetSk)
			bc.addBlock(makeBlock({
				experience: 27
			}))
			bc.receiveEarn(makeTransaction({
				type: TXTYPE.EARN,
				moneycount: 37,
				target: targetPk
			}))

			const result = bc.hasLevelUpOnLastTx()

			assert.isTrue(result)
		})

		it('Should return true after passed from 27 to 64 Total via PAPER (cashPaper).', () => {
			const bc = new CitizenBlockchain()
			bc.startBlockchain('Gus', intToDate('20240101'), mySk, targetSk)
			bc.addBlock(makeBlock({
				experience: 27
			}))
			bc.cashPaper(makeTransaction({
				type: TXTYPE.PAPER,
				moneycount: 37,
				target: targetPk
			}))

			const result = bc.hasLevelUpOnLastTx()

			assert.isTrue(result)
		})
	})

	describe('isWaitingValidation', () => {
		it('Should return false for empty blockchain', () => {
			const bc = new CitizenBlockchain()
			const result = bc.isWaitingValidation()

			assert.isFalse(result)
		})

		it('Should return false for already valid blockchain', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk)
			bc.validateAccount(targetSk)

			const result = bc.isWaitingValidation()

			assert.isFalse(result)
		})

		it('Should return false if the block is not a birth one', () => {
			const bc = new CitizenBlockchain()
			bc.addBlock(makeBlock())

			const result = bc.isWaitingValidation()

			assert.isFalse(result)
		})

		it('Should return true for blockchain effectively waiting for validation', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk)

			const result = bc.isWaitingValidation()

			assert.isTrue(result)
		})
	})

	describe('isValidated', () => {
		it('Should return false for empty blockchain', () => {
			const bc = new CitizenBlockchain()
			bc.addBlock(makeBlock())
			const result = bc.isValidated()

			assert.isFalse(result)
		})

		it('Should return false if the first block is not a birth one', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk)
			const result = bc.isValidated()

			assert.isFalse(result)
		})

		it('Should return true for a valid brand new blockchain', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk)
			bc.validateAccount(targetSk)
			const result = bc.isValidated()

			assert.isTrue(result)
		})

		it('Should return true for a long time valid', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk)
			bc.validateAccount(targetSk)
			bc.addBlock(makeBlock())
			const result = bc.isValidated()

			assert.isTrue(result)
		})
	})
	
	describe('makeBirthBlock', () => {
		it('Should be one block lenght.', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'
			
			bc.makeBirthBlock(name, birthdate, mySk, today)
			
			assert.equal(bc.blocks.length, 1)
		})

		it('Should have a BirthBlock.', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'
			const block = bc.makeBirthBlock(name, birthdate, mySk, today)

			assert.equal(bc.lastblock.toString(), "[BirthBlock]")
		})

		it('Should generate private key if none given.', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'

			bc.makeBirthBlock(name, birthdate)

			assert.isNotNull(bc.lastblock.signer)
			assert.isTrue(bc.lastblock.isSigned())
			assert.isTrue(bc.lastblock.isValid())
		})

	})

	describe('startBlockchain', () => {
		it('Should make a ready to go blockchain', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-01')
			const name = 'Gus'

			bc.startBlockchain(name, birthdate, targetSk, mySk, today)

			assert.equal(bc.blocks.length, 2)
			assert.equal(bc.blocks[0].toString(), '[InitializationBlock]')
			assert.equal(bc.blocks[1].toString(), '[BirthBlock]')
			assert.isTrue(bc.blocks[0].isSigned())
			assert.isTrue(bc.blocks[1].isSigned())
		})

		it('Should use todays date if none given', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = dateToInt(new Date())
			const name = 'Gus'

			bc.startBlockchain(name, birthdate, targetSk, mySk)

			assert.equal(dateToInt(bc.lastblock.closedate), today)
			assert.equal(dateToInt(bc.blocks[1].closedate), today)
		})

		it('Should make and return a new private key if none given.', () => {
			const bc = new CitizenBlockchain()
			const birthdate = new Date('2002-12-12')
			const name = 'Gus'

			const result = bc.startBlockchain(name, birthdate, targetSk)

			assert.equal(result.length, 64)
		})
	})	

	describe('pay', () => {
		it('Should make valid transaction.', () => {
			const bc = new CitizenBlockchain([
				makeBlockObj({
					date: new Date('2025-01-01'),
					moneycount: 3,
					transactions: [makeTransaction({ type: TXTYPE.CREATE, signer: myPk })]
				}),
				makeBlockObj({ signed: true, date: new Date('2025-01-01') })
			])

			bc.pay(mySk, targetPk, 3, new Date('2025-01-03'))
			const transaction = bc.lastblock.lastTransaction

			assert.isTrue(transaction.isValid())
			assert.equal(transaction.version, Blockchain.VERSION)
			assert.equal(transaction.type, TXTYPE.PAY)
			assert.equal(transaction.date.getTime(), new Date('2025-01-03').getTime())
			assert.deepEqual(transaction.money, [20250101000, 20250101001, 20250101002])
			assert.deepEqual(transaction.invests, [])
			assert.equal(transaction.target, targetPk)
			assert.equal(transaction.signer, myPk)
		})

		it('Should decrease money of the block.', () => {
			const bc = new CitizenBlockchain([
				makeBlockObj({
					date: new Date('2025-01-03'),
					moneycount: 5,
					transactions: [makeTransaction({ type: TXTYPE.CREATE, signer: myPk })]
				}),
				makeBlockObj({ signed: true, date: new Date('2025-01-02') })
			])

			bc.pay(mySk, targetPk, 3, new Date('2025-01-03'))

			assert.equal(bc.lastblock.money.length, 2)
			assert.deepEqual(bc.lastblock.money, [20250103003, 20250103004])
		})

		it('Should increase experience if I am the target.', () => {
			const bc = new CitizenBlockchain([
				makeBlockObj({
					date: new Date('2025-01-03'),
					moneycount: 4,
					experience: 26,
					transactions: [makeTransaction({ type: TXTYPE.CREATE, signer: myPk })]
				}),
				makeBlockObj({ signed: true, date: new Date('2025-01-02') })
			])

			bc.pay(mySk, myPk, 4, new Date('2025-01-03'))

			assert.equal(bc.lastblock.experience, 30)
		})

		it('Should throw UnauthorizedError if private key does not match blockchain owner.', () => {
			const bc = new CitizenBlockchain([
				makeBlockObj({ date: new Date('2025-01-01'), moneycount: 3 }),
				makeBlockObj({ signed: true, date: new Date('2025-01-01') })
			])

			assert.throws(() => { bc.pay(targetSk, targetPk, 3, new Date('2025-01-03')) }, UnauthorizedError)
		})

		it('Should throw error if blockchain can t afford it.', () => {
			const bc = new CitizenBlockchain([
				makeBlockObj({ transactions: [makeTransaction({ type: TXTYPE.CREATE, signer: myPk })] }),
				makeBlockObj({ signed: true, date: new Date('2026-01-19') })
			])

			assert.throws(() => { bc.pay(mySk, targetPk, 2) }, InvalidTransactionError, 'Unsufficient funds.')
		})
	})

	describe('validateAccount', () => {
		it('Should be two blocks lenght.', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk,)
			bc.validateAccount(targetSk)

			assert.equal(bc.blocks.length, 2)
		})

		it('Should have an InitializationBlock.', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk)

			const block = bc.validateAccount(targetSk)

			assert.equal(block.toString(), "[InitializationBlock]")
		})

		it('Should set correct previous hash.', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk)
			bc.validateAccount(targetSk)

			assert.equal(bc.lastblock.previousHash, bc.blocks[1].signature)
		})

		it('Should keep money and invest.', () => {
			const bc = new CitizenBlockchain()
			bc.makeBirthBlock('Gus', new Date('2002-12-12'), mySk, new Date("2026-01-12"))
			bc.validateAccount(targetSk)

			assert.deepEqual(bc.lastblock.money, [20260112000])
			assert.deepEqual(bc.lastblock.invests, [202601129000])
		})
	})

	describe('cashPaper', () => {
		it('Should increment experience by money.length.', () => {
			const bc = level3CitizenBlockchain()
			const experienceBefore = bc.lastblock.experience

			const paper = makeTransaction({
				type: TXTYPE.PAPER,
				moneycount: 3,
				target: referentPk,
				signer: referentPk,
				sk: referentSk
			})
			bc.cashPaper(paper)

			assert.equal(bc.lastblock.experience, experienceBefore + 3)
		})

		it('Should throw if cashing a paper signed by myself.', () => {
			const bc = level3CitizenBlockchain()

			const paper = makeTransaction({
				type: TXTYPE.PAPER,
				moneycount: 3,
				target: referentPk,
				signer: myPk,
				sk: mySk
			})

			assert.throws(() => bc.cashPaper(paper), InvalidTransactionError, 'Cannot cash a paper you signed yourself.')
		})
	})

	describe('newBlock', () => {
		it('Should preserve experience when creating a new block.', () => {
			const bc = level3CitizenBlockchain()
			const experienceBefore = bc.lastblock.experience
			bc.closeLastBlock(mySk)

			bc.newBlock()

			assert.equal(bc.lastblock.experience, experienceBefore)
		})
	})

	describe('payerOrder', () => {
		const DATE2 = new Date('2025-01-02')

		it('Should throw UnauthorizedError if SK does not match blockchain owner.', () => {
			const bc = level3CitizenBlockchain()

			assert.throws(
				() => bc.payerOrder(targetSk, referentPk, targetPk, [], DATE2),
				UnauthorizedError
			)
		})

		it('Should create a PayerOrderTransaction with correct fields.', () => {
			const bc = level3CitizenBlockchain()
			const invests = buildInvestIndexes(DATE2, 1)

			const tx = bc.payerOrder(mySk, referentPk, targetPk, invests, DATE2)

			assert.equal(tx.type, TXTYPE.PAYERORDER)
			assert.equal(tx.signer, myPk)
			assert.equal(tx.target, targetPk)
			assert.equal(tx.ecosystem, referentPk)
			assert.ok(tx.isValid())
		})

		it('Should add the transaction to the citizen blockchain.', () => {
			const bc = level3CitizenBlockchain()
			const invests = buildInvestIndexes(DATE2, 1)

			const tx = bc.payerOrder(mySk, referentPk, targetPk, invests, DATE2)

			assert.include(bc.lastblock.transactions, tx)
		})

		it('Should return the transaction.', () => {
			const bc = level3CitizenBlockchain()
			const invests = buildInvestIndexes(DATE2, 1)

			const result = bc.payerOrder(mySk, referentPk, targetPk, invests, DATE2)

			assert.instanceOf(result, PayerOrderTransaction)
		})
	})

	describe('receivePay', () => {
		const DATE2 = new Date('2025-01-03')

		it('Should throw if not a PayTransaction.', () => {
			const bc = level3CitizenBlockchain()

			const tx = new PayerOrderTransaction(mySk, targetPk, [], referentPk, DATE2)

			assert.throws(() => bc.receivePay(tx))
		})

		it('Should throw if not targeting this citizen.', () => {
			const bc = level3CitizenBlockchain()

			const tx = new EarnTransaction(referentSk, targetPk, [20250101000], DATE2)

			assert.throws(() => bc.receivePay(tx))
		})

		it('Should increment experience by money.length.', () => {
			const bc = level3CitizenBlockchain()
			const experienceBefore = bc.lastblock.experience

			const tx = new PayTransaction(referentSk, myPk, DATE2, [20250101000, 20250101001])
			bc.receivePay(tx)

			assert.equal(bc.lastblock.experience, experienceBefore + 2)
		})

		it('Should record the transaction in the blockchain.', () => {
			const bc = level3CitizenBlockchain()

			const tx = new PayTransaction(referentSk, myPk, DATE2, [20250101000])
			bc.receivePay(tx)

			assert.include(bc.lastblock.transactions, tx)
		})

		it('Should return the transaction.', () => {
			const bc = level3CitizenBlockchain()

			const tx = new PayTransaction(referentSk, myPk, DATE2, [20250101000])
			const result = bc.receivePay(tx)

			assert.equal(result, tx)
		})

		it('Should throw if the payer is the same citizen (self-pay must use pay()).', () => {
			const bc = level3CitizenBlockchain()

			const tx = new PayTransaction(mySk, myPk, DATE2, [20250101000])

			assert.throws(() => bc.receivePay(tx), InvalidTransactionError)
		})
	})

	describe('receiveEarn', () => {
		const DATE2 = new Date('2025-01-03')

		it('Should throw if not an EarnTransaction.', () => {
			const bc = level3CitizenBlockchain()

			const tx = new PayerOrderTransaction(mySk, targetPk, [], referentPk, DATE2)

			assert.throws(() => bc.receiveEarn(tx))
		})

		it('Should throw if not targeting this citizen.', () => {
			const bc = level3CitizenBlockchain()

			const tx = new EarnTransaction(referentSk, targetPk, [20250101000], DATE2)

			assert.throws(() => bc.receiveEarn(tx))
		})

		it('Should increment experience by money.length.', () => {
			const bc = level3CitizenBlockchain()
			const experienceBefore = bc.lastblock.experience

			const tx = new EarnTransaction(referentSk, myPk, [20250101000, 20250101001], DATE2)
			bc.receiveEarn(tx)

			assert.equal(bc.lastblock.experience, experienceBefore + 2)
		})

		it('Should record the transaction in the blockchain.', () => {
			const bc = level3CitizenBlockchain()

			const tx = new EarnTransaction(referentSk, myPk, [20250101000], DATE2)
			bc.receiveEarn(tx)

			assert.include(bc.lastblock.transactions, tx)
		})

		it('Should return the transaction.', () => {
			const bc = level3CitizenBlockchain()

			const tx = new EarnTransaction(referentSk, myPk, [20250101000], DATE2)
			const result = bc.receiveEarn(tx)

			assert.equal(result, tx)
		})
	})

	describe('isValid', () => {
		function makeOwnerCreateTx(date) {
			return makeTransaction({ type: TXTYPE.CREATE, date, moneycount: 1, investscount: 1, signer: myPk, sk: mySk })
		}

		it('Should return true for a chain where CREATE quantity matches the level implied by experience.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 0, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const createTx = makeTransaction({ type: TXTYPE.CREATE, date: new Date('2025-01-02'), moneycount: 1, investscount: 1, signer: myPk, sk: mySk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 0, transactions: [createTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.isTrue(bc.isValid())
		})

		it('Should return false if a CREATE transaction creates the wrong amount of money for the level implied by experience.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 0, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const badCreate = makeTransaction({ type: TXTYPE.CREATE, date: new Date('2025-01-02'), moneycount: 5, investscount: 5, signer: myPk, sk: mySk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 0, transactions: [badCreate], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return false if experience does not match the actual PAY transaction in the block.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const payTx = makeTransaction({ type: TXTYPE.PAY, date: new Date('2025-01-02'), moneycount: 3, target: myPk, signer: targetPk, sk: targetSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 20, transactions: [payTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return false if experience carry-forward between blocks is wrong (no transactions but experience changed).', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 99, transactions: [], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return true when experience increases via a received PAY targeting me.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const payTx = makeTransaction({ type: TXTYPE.PAY, date: new Date('2025-01-02'), moneycount: 3, target: myPk, signer: targetPk, sk: targetSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [payTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.isTrue(bc.isValid())
		})

		it('Should return true when experience increases via a received EARN targeting me.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const earnTx = makeTransaction({ type: TXTYPE.EARN, date: new Date('2025-01-02'), moneycount: 3, target: myPk, signer: targetPk, sk: targetSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [earnTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.isTrue(bc.isValid())
		})

		it('Should return false if a foreign-targeted EARN (not mine) is credited as if it were.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const earnTx = makeTransaction({ type: TXTYPE.EARN, date: new Date('2025-01-02'), moneycount: 3, target: targetPk, signer: referentPk, sk: referentSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [earnTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return true when experience increases via a paper cashed from someone else.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const paperTx = makeTransaction({ type: TXTYPE.PAPER, date: new Date('2025-01-02'), moneycount: 3, target: referentPk, signer: targetPk, sk: targetSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [paperTx], signed: true, signer: referentSk })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.isTrue(bc.isValid())
		})

		it('Should return false if experience increases for a paper I signed myself (generated, not cashed).', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const paperTx = makeTransaction({ type: TXTYPE.PAPER, date: new Date('2025-01-02'), moneycount: 3, target: referentPk, signer: myPk, sk: mySk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [paperTx], signed: true, signer: referentSk })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.isFalse(bc.isValid())
		})

		it('Should return false if two CREATE transactions across the chain reuse the same date, producing overlapping money ids.', () => {
			const create1 = makeTransaction({ type: TXTYPE.CREATE, date: new Date('2025-01-01'), moneycount: 1, investscount: 1, signer: myPk, sk: mySk })
			const oldest = makeBlock({ date: new Date('2025-01-01'), experience: 0, transactions: [create1], signed: true })

			const payTx = makeTransaction({ type: TXTYPE.PAY, date: new Date('2025-01-02'), moneycount: 8, target: myPk, signer: targetPk, sk: targetSk })
			const middle = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, experience: 8, transactions: [payTx], signed: true })

			const create2 = makeTransaction({ type: TXTYPE.CREATE, date: new Date('2025-01-01'), moneycount: 3, investscount: 3, signer: myPk, sk: mySk })
			const newest = makeBlock({ date: new Date('2025-01-03'), previousHash: middle.signature, experience: 8, transactions: [create2], signed: true })

			const bc = new CitizenBlockchain([newest.export(), middle.export(), oldest.export()])

			assert.isFalse(bc.isValid())
		})
	})

	describe('assertIsValid', () => {
		function makeOwnerCreateTx(date) {
			return makeTransaction({ type: TXTYPE.CREATE, date, moneycount: 1, investscount: 1, signer: myPk, sk: mySk })
		}

		it('Should not throw for a chain where CREATE quantity matches the level implied by experience.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 0, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const createTx = makeTransaction({ type: TXTYPE.CREATE, date: new Date('2025-01-02'), moneycount: 1, investscount: 1, signer: myPk, sk: mySk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 0, transactions: [createTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.doesNotThrow(() => bc.assertIsValid())
		})

		it('Should throw a specific message if a CREATE transaction creates the wrong amount of money for the level implied by experience.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 0, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const badCreate = makeTransaction({ type: TXTYPE.CREATE, date: new Date('2025-01-02'), moneycount: 5, investscount: 5, signer: myPk, sk: mySk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 0, transactions: [badCreate], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /level/i)
		})

		it('Should throw a specific message if experience does not match the actual PAY transaction in the block.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const payTx = makeTransaction({ type: TXTYPE.PAY, date: new Date('2025-01-02'), moneycount: 3, target: myPk, signer: targetPk, sk: targetSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 20, transactions: [payTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /experience/i)
		})

		it('Should throw a specific message if experience carry-forward between blocks is wrong (no transactions but experience changed).', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 99, transactions: [], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /experience/i)
		})

		it('Should not throw when experience increases via a received PAY targeting me.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const payTx = makeTransaction({ type: TXTYPE.PAY, date: new Date('2025-01-02'), moneycount: 3, target: myPk, signer: targetPk, sk: targetSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [payTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.doesNotThrow(() => bc.assertIsValid())
		})

		it('Should not throw when experience increases via a received EARN targeting me.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const earnTx = makeTransaction({ type: TXTYPE.EARN, date: new Date('2025-01-02'), moneycount: 3, target: myPk, signer: targetPk, sk: targetSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [earnTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.doesNotThrow(() => bc.assertIsValid())
		})

		it('Should throw a specific message if a foreign-targeted EARN (not mine) is credited as if it were.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const earnTx = makeTransaction({ type: TXTYPE.EARN, date: new Date('2025-01-02'), moneycount: 3, target: targetPk, signer: referentPk, sk: referentSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [earnTx], signed: true })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /experience/i)
		})

		it('Should not throw when experience increases via a paper cashed from someone else.', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const paperTx = makeTransaction({ type: TXTYPE.PAPER, date: new Date('2025-01-02'), moneycount: 3, target: referentPk, signer: targetPk, sk: targetSk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [paperTx], signed: true, signer: referentSk })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.doesNotThrow(() => bc.assertIsValid())
		})

		it('Should throw a specific message if experience increases for a paper I signed myself (generated, not cashed).', () => {
			const older = makeBlock({ date: new Date('2025-01-01'), experience: 10, transactions: [makeOwnerCreateTx(new Date('2025-01-01'))], signed: true })
			const paperTx = makeTransaction({ type: TXTYPE.PAPER, date: new Date('2025-01-02'), moneycount: 3, target: referentPk, signer: myPk, sk: mySk })
			const newer = makeBlock({ date: new Date('2025-01-02'), previousHash: older.signature, experience: 13, transactions: [paperTx], signed: true, signer: referentSk })
			const bc = new CitizenBlockchain([newer.export(), older.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /experience/i)
		})

		it('Should forward the banList to the base class checks (block signer banned).', () => {
			const block = makeBlock({ date: new Date('2025-01-02'), signed: true })
			const bc = new CitizenBlockchain([block.export()])
			const banList = new Map([[myPk, new Date('2025-01-01')]])

			assert.throws(() => bc.assertIsValid(0, banList), InvalidBlockchainError, /banned/i)
		})

		it('Should not throw for a CREATE where money and invests span different days due to heterogeneous engagement (some days partially or fully engaged).', () => {
			// level=1 over 3 days.
			// day2 invests are fully engaged → no invests from day2 in the CREATE.
			// day3 money is fully engaged    → no money from day3 in the CREATE.
			// Valid CREATE: money=[day1_m, day2_m], invests=[day1_i, day3_i]
			const D1 = new Date('2025-01-01')
			const D2 = new Date('2025-01-02')
			const D3 = new Date('2025-01-03')
			const heterogeneousCreate = new CreateTransaction(mySk,
				[...buildMoneyIndexes(D1, 1), ...buildMoneyIndexes(D2, 1)],
				[...buildInvestIndexes(D1, 1), ...buildInvestIndexes(D3, 1)],
				D3
			)
			const oldest = makeBlock({ date: D1, experience: 0, transactions: [], signed: true })
			const newest = makeBlock({ date: D3, previousHash: oldest.signature, experience: 0, transactions: [heterogeneousCreate], signed: true })
			const bc = new CitizenBlockchain([newest.export(), oldest.export()])

			assert.doesNotThrow(() => bc.assertIsValid())
		})

		it('Should not throw for a CREATE where money.length !== invests.length due to full-day engagement on one side.', () => {
			// level=1. day2 invests are all engaged → 2 money items (day1+day2) but only 1 invest (day1).
			const D1 = new Date('2025-01-01')
			const D2 = new Date('2025-01-02')
			const asymmetricCreate = new CreateTransaction(mySk,
				[...buildMoneyIndexes(D1, 1), ...buildMoneyIndexes(D2, 1)],
				[...buildInvestIndexes(D1, 1)],
				D2
			)
			const oldest = makeBlock({ date: D1, experience: 0, transactions: [], signed: true })
			const newest = makeBlock({ date: D2, previousHash: oldest.signature, experience: 0, transactions: [asymmetricCreate], signed: true })
			const bc = new CitizenBlockchain([newest.export(), oldest.export()])

			assert.doesNotThrow(() => bc.assertIsValid())
		})

		it('Should throw if a CREATE has the right total invest count but all invests concentrated on fewer days than the money (wrong day distribution).', () => {
			const D1 = new Date('2025-01-01')
			const D2 = new Date('2025-01-02')
			// level=1, money from 2 days → 2 items. Invests should be 1 per day = 2 total, one per day.
			// Attack: 2 invests both from day 1 → same total but wrong distribution.
			const maliciousCreate = new CreateTransaction(mySk,
				[...buildMoneyIndexes(D1, 1), ...buildMoneyIndexes(D2, 1)],
				[...buildInvestIndexes(D1, 2)],
				D2
			)
			const oldest = makeBlock({ date: D1, experience: 0, transactions: [], signed: true })
			const newest = makeBlock({ date: D2, previousHash: oldest.signature, experience: 0, transactions: [maliciousCreate], signed: true })
			const bc = new CitizenBlockchain([newest.export(), oldest.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /level/i)
		})

		it('Should throw a specific message if two CREATE transactions across the chain reuse the same date, producing overlapping money ids.', () => {
			const create1 = makeTransaction({ type: TXTYPE.CREATE, date: new Date('2025-01-01'), moneycount: 1, investscount: 1, signer: myPk, sk: mySk })
			const oldest = makeBlock({ date: new Date('2025-01-01'), experience: 0, transactions: [create1], signed: true })

			const payTx = makeTransaction({ type: TXTYPE.PAY, date: new Date('2025-01-02'), moneycount: 8, target: myPk, signer: targetPk, sk: targetSk })
			const middle = makeBlock({ date: new Date('2025-01-02'), previousHash: oldest.signature, experience: 8, transactions: [payTx], signed: true })

			const create2 = makeTransaction({ type: TXTYPE.CREATE, date: new Date('2025-01-01'), moneycount: 3, investscount: 3, signer: myPk, sk: mySk })
			const newest = makeBlock({ date: new Date('2025-01-03'), previousHash: middle.signature, experience: 8, transactions: [create2], signed: true })

			const bc = new CitizenBlockchain([newest.export(), middle.export(), oldest.export()])

			assert.throws(() => bc.assertIsValid(), InvalidBlockchainError, /duplicate/i)
		})
	})

})
