import { describe, it } from 'mocha';
import { assert } from 'chai';

import { EcosystemBlockchain } from '../src/index.js';
import { Blockchain } from '../src/Blockchain.js';
import { privateKey1, publicKey1, privateKey2, publicKey2, privateKey3, publicKey3 } from './testUtils.js'
import { randomPrivateKey, aesEncrypt, aesDecrypt, publicFromPrivate, 
	dateToInt, intToDate, intToIndex, formatMoneyIndex, formatInvestIndex,
	buildInvestIndexes, buildMoneyIndexes } from '../src/crypto.js'

describe('EcosystemBlockchain', () => {
	const validBirthBlock = () => {
		// A valid birth block for new ecosystem with publicKey3,
		// created the 12/01/2025 and subscribing
		// by the user with publicKey1
		const res =  {
			version: Blockchain.VERSION,
			closedate: 20250112,
			previousHash: Blockchain.ECOREF_HASH,
			signer: publicKey3,
			money: [],
			invests: [],
			total: 0,
			merkleroot: 0,
			transactions: [
				{
					version: Blockchain.VERSION,
					date: 20250112,
					source: publicKey1,
					target: 'my brand new ecosystem',
					money: [],
					invests: [],
					type: Blockchain.TXTYPE.INIT,
					signer: 0,
					hash: 0
				},
				{
					version: Blockchain.VERSION,
					date: 20250112,
					source: publicKey1,
					target: publicKey1,
					money: [],
					invests: [],
					type: Blockchain.TXTYPE.SETADMIN,
					signer: 0,
					hash: 0
				}
			]
		}
		Blockchain.signblock(res, privateKey3);
		return res;
	}

	const validInitBlock = () => {
		const res = {
			closedate: 20250113,
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
			closedate: 20250114,
			previousHash: validInitBlock().hash,
			merkleroot: 0,
			signer: publicKey1,
			total: 0,
			version: 1,
			money: [20241228000, 20241228001, 20250101002, 20250101003],
			invests: [],
			transactions: [
				{
					version: Blockchain.VERSION,
					date: 20250114,
					source: publicKey2,
					target: publicKey3,
					money: [20241228000, 20241228001, 20250101002, 20250101003],
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

	const validInvestBlock = () => {
		const res = {
			closedate: 20250114,
			previousHash: validInitBlock().hash,
			merkleroot: 0,
			signer: publicKey1,
			total: 0,
			version: 1,
			money: [],
			invests: [20241228000, 20241228001, 20250101002, 20250101003],
			transactions: [
				{
					version: Blockchain.VERSION,
					date: 20250114,
					source: publicKey2,
					target: publicKey3,
					money: [],
					invests: [20241228000, 20241228001, 20250101002, 20250101003],
					type: Blockchain.TXTYPE.ENGAGE,
					signer: 0,
					hash: 0
				}
			]
		}
		Blockchain.signblock(res, privateKey1);
		return res;
	}

	describe('isWaitingValidation', () => {
		it('Should return false for empty blockchain', () => {
			const bc = new EcosystemBlockchain()
			const result = bc.isWaitingValidation()

			assert.isNotOk(result)
		})

		it('Should return false for already valid blockchain', () => {
			const bc = new EcosystemBlockchain([validInitBlock(), validBirthBlock()])
			const result = bc.isWaitingValidation()

			assert.isNotOk(result)
		})

		it('Should return false if the block is not a birth one', () => {
			const bc = new EcosystemBlockchain([validInitBlock()])
			const result = bc.isWaitingValidation()

			assert.isNotOk(result)
		})

		it('Should return true for blockchain effectively waiting for validation', () => {
			const bc = new EcosystemBlockchain([validBirthBlock()])
			const result = bc.isWaitingValidation()

			assert.ok(result)
		})
	})

	describe('isValidated', () => {
		it('Should return false for empty blockchain', () => {
			const bc = new EcosystemBlockchain()
			const result = bc.isValidated()

			assert.isNotOk(result)
		})

		it('Should return false if the first block is not a birth one', () => {
			const bc = new EcosystemBlockchain([validInitBlock()])
			const result = bc.isValidated()

			assert.isNotOk(result)
		})

		it('Should return true for a valid blockchain', () => {
			const bc = new EcosystemBlockchain([validInitBlock(), validBirthBlock()])
			const result = bc.isValidated()

			assert.ok(result)
		})

		it('Should return true for a long time valid', () => {
			const bc = new EcosystemBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const result = bc.isValidated()

			assert.ok(result)
		})
	})

	describe('makeBirthBlock', () => {
		it('Should return corectly filled block', () => {
			const bc = new EcosystemBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'new ecosystem name'

			const block = bc.makeBirthBlock(privateKey1, publicKey2, name, today)
			delete block.hash
			delete block.transactions[0].hash
			delete block.transactions[1].hash

			const expected = {
				version: Blockchain.VERSION,
				closedate: dateToInt(today),
				previousHash: Blockchain.ECOREF_HASH,
				signer: publicKey1, // The ecosystem signs only this first block
				money: [],
				invests: [],
				total: 0,
				merkleroot: 0,
				transactions: [
					{
						version: Blockchain.VERSION,
						date: dateToInt(today),
						source: publicKey1, // The ecosystem sets its name
						target: name,
						money: [],
						invests: [],
						type: Blockchain.TXTYPE.INIT,
						signer: 0
					},
					{
						version: Blockchain.VERSION,
						date: dateToInt(today),
						source: publicKey1, // the ecosystem
						target: publicKey2, // setting admin id
						money: [],
						invests: [],
						type: Blockchain.TXTYPE.SETADMIN,
						signer: 0
					}
				]
			}

			assert.deepEqual(block, expected)
		})

		it('Should return a signed block.', () => {
			const bc = new EcosystemBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'my ecosystem'
			const block = bc.makeBirthBlock(privateKey1, publicKey2, name, today)

			const signature = Blockchain.isValidBlock(block, publicKey1)

			assert.ok(signature)
		})

		it('Should return a block with signed transactions.', () => {
			const bc = new EcosystemBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'my ecosystem'
			const block = bc.makeBirthBlock(privateKey1, publicKey2, name, today)

			const signature1 = Blockchain.isValidTransaction(block.transactions[0])
			const signature2 = Blockchain.isValidTransaction(block.transactions[1])

			assert.ok(signature1)
			assert.ok(signature2)
		})
	})

	describe('startBlockchain', () => {
		it('Should make a ready to go blockchain', () => {
			const bc = new EcosystemBlockchain()
			const today = new Date('2025-02-01')
			const name = 'Gus'

			bc.startBlockchain(name, privateKey3, publicKey2, privateKey1, today)
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
					signer: publicKey3,
					total: 0,
					money: [],
					invests: [],
					version: 1,
					transactions: [],
					merkleroot: 0
				},
				{
					version: Blockchain.VERSION,
					closedate: 20250201,
					signer: publicKey1,
					money: [],
					invests: [],
					total: 0,
					merkleroot: 0,
					transactions: [
						{
							version: Blockchain.VERSION,
							date: 20250201,
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
							target: publicKey2,
							money: [],
							invests: [],
							type: Blockchain.TXTYPE.SETADMIN,
							signer: 0
						}
					]
				}
			]

			assert.deepEqual(bc.blocks, expected)
		})

		it('Should use todays date if none given', () => {
			const bc = new EcosystemBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = dateToInt(new Date())
			const name = 'Gus'

			bc.startBlockchain(name, privateKey3, publicKey2, privateKey1)

			assert.equal(bc.lastblock.closedate, today)
			assert.equal(bc.blocks[1].closedate, today)
			assert.equal(bc.blocks[1].transactions[1].date, today)
		})

		it('Should make and return a new private key if none given.', () => {
			const bc = new EcosystemBlockchain()
			const birthdate = new Date('2002-12-12')
			const name = 'Gus'

			const result = bc.startBlockchain(name, privateKey2, publicKey3)

			assert.equal(result.length, 64)
		})
	})

	describe('validateAccount', () => {
		it('Should return a valid initialization block', () => {
			const bc = new EcosystemBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'my new ecosystem'
			const block = bc.makeBirthBlock(privateKey1, publicKey3, name, today)

			bc.validateAccount(privateKey2, new Date('2025-01-03'))
			delete bc.lastblock.hash
			delete bc.lastblock.previousHash

			const expectedInitializationBlock = {
				closedate: 20250103,
				signer: publicKey2,
				total: 0,
				money: [],
				invests: [],
				version: 1,
				transactions: [],
				merkleroot: 0
			}

			assert.deepEqual(bc.lastblock, expectedInitializationBlock)
		})

		it('Should return a signed initialization block', () => {
			const bc = new EcosystemBlockchain()
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'my new ecosystem'
			const block = bc.makeBirthBlock(privateKey1, publicKey3, name, today)

			bc.validateAccount(privateKey2, new Date('2025-01-03'))

			assert.ok(Blockchain.isValidBlock(bc.lastblock, publicKey2))
		})
	})
})