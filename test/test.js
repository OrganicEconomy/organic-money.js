const { describe, it } = require('mocha')
const { Blockchain, CitizenBlockchain, EcosystemBlockchain, InvalidTransactionError, UnauthorizedError} = require('../index')
const { sha256 } = require('ethereum-cryptography/sha256')
const secp = require('ethereum-cryptography/secp256k1')
const { hexToBytes, toHex } = require("ethereum-cryptography/utils");
const assert = require('chai').assert
const msgpack = require('msgpack-lite')

/***********************************************************************
 *                           TESTS TOOLS
 **********************************************************************/

const privateKey1 = 'ed945716dddb7af2c9774939e9946f1fee31f5ec0a3c6ec96059f119c396912f'
const publicKey1 = '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3'
const privateKey2 = 'e68955130b2c4adc6165b0bae6e6b8f4bcce1879dbf0c6f91b3acc69479ef272'
const publicKey2 = '03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46'
const privateKey3 = 'f8a33b8aa0cbf892f1c9e617126711f7304d6e5cead1d592a8b4288c0985b3c5'
const publicKey3 = '02f126a536777e95f23b5798b1e357dc2a4f5b1869b739c290b4b2efbc18eca6fd'

describe('Blockchain', () => {
	const validBirthBlock = () => {
		// A valid birth block for someone named Gus,
		// born the 28/11/1989 and subscribing on
		// the 01/01/2025.
		const res =  {
			version: Blockchain.VERSION,
			closedate: 20250101,
			previousHash: Blockchain.REF_HASH,
			signer: publicKey1,
			money: [20250101000],
			invests: [20250101000],
			total: 0,
			merkleroot: 0,
			transactions: [
				Blockchain.signtx({
					version: Blockchain.VERSION,
					date: 19891189,
					source: publicKey1,
					target: 'Gus',
					money: [],
					invests: [],
					type: Blockchain.TXTYPE.INIT,
					signer: 0,
					hash: 0
				}, privateKey1),
				Blockchain.signtx({
					version: Blockchain.VERSION,
					date: 20250101,
					source: publicKey1,
					target: publicKey1,
					money: [20250101000],
					invests: [20250101000],
					type: Blockchain.TXTYPE.CREATE,
					signer: 0,
					hash: 0
				}, privateKey1)
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

	const validPaperdBlock = () => {
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
					source: publicKey2,
					target: 0,
					money: [20241228000, 20241228001, 20250101002, 20250101003],
					invests: [],
					type: Blockchain.TXTYPE.PAPER,
					signer: publicKey3,
					hash: 0
				}
			]
		}
		Blockchain.signblock(res, privateKey3);
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

	const validEngagedBlock2 = () => {
		const res = {
			closedate: 20250102,
			previousHash: validPaperdBlock().hash,
			merkleroot: 0,
			signer: publicKey1,
			total: 27,
			version: 1,
			money: [20250101000],
			invests: [20250101000],
			transactions: [
				{
					version: Blockchain.VERSION,
					date: 20250103,
					source: publicKey1,
					target: 0,
					money: [20250103002, 20250103003, 20250104002, 20250104003, 20250105000, 20250105001],
					invests: [],
					type: Blockchain.TXTYPE.ENGAGE,
					signer: publicKey1,
					hash: 0
				},
				{
					version: Blockchain.VERSION,
					date: 20250103,
					source: publicKey1,
					target: 0,
					money: [],
					invests: [202501039002, 202501039003, 202501049002, 202501049003, 202501059000, 202501059001],
					type: Blockchain.TXTYPE.ENGAGE,
					signer: publicKey1,
					hash: 0
				},
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
		Blockchain.signblock(res, privateKey3);
		return res;
	}

	const validNoMoreEngagedBlock = () => {
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
					money: [20250102002, 20250102003],
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
					invests: [202501029002, 202501029003],
					type: Blockchain.TXTYPE.ENGAGE,
					signer: publicKey1,
					hash: 0
				}
			]
		}
		Blockchain.signblock(res, privateKey1);
		return res;
	}
	/***********************************************************************
	 *                           STATIC METHODS
	 **********************************************************************/
	describe('aesEncrypt', () => {
		it('Should encrypt data correctly.', async () => {
			const msg = Blockchain.randomPrivateKey()
			const result = await Blockchain.aesEncrypt(msg, 'test_pwd')

			assert.property(result, 'msg')
			assert.property(result, 'iv')
			assert.property(result, 'sha')
		})
	})

	describe('aesDecrypt', () => {
		it('Should decrypt data correctly.', async () => {
			const msg = hexToBytes(Blockchain.randomPrivateKey())
			const encrypted = await Blockchain.aesEncrypt(msg, 'test_pwd')
			const result = await Blockchain.aesDecrypt(encrypted, 'test_pwd')

			assert.deepEqual(result, msg)
		})

		it('Should throw error for invalid password.', async () => {
			const msg = Blockchain.randomPrivateKey()
			const encrypted = await Blockchain.aesEncrypt(msg, 'test_pwd')

			let error = null
			try {
				await Blockchain.aesDecrypt(encrypted, 'wrong_password')
			} catch (err) {
				error = err
			}
			assert.typeOf(error, 'Error')
			assert.equal(error.message, 'Invalid password')
		})
	})

	describe('dateToInt', () => {
		it('Should return the date in YYYYMMDD format.', () => {
			const date = new Date('2021-11-15')

			const result = Blockchain.dateToInt(date)

			assert.equal(result, 20211115)
		})

		it('Should work with dates including 1 digit month and day.', () => {
			const date = new Date('2021-09-05')

			const result = Blockchain.dateToInt(date)

			assert.equal(result, 20210905)
		})
	})

	describe('intToDate', () => {
		it('Should return a valid Date object.', () => {
			const date = new Date('2021-11-15')

			const result = Blockchain.intToDate(20211115)

			assert.equal(result.getTime(), date.getTime())
		})

		it('Should work with dates including 1 digit month and day.', () => {
			const date = new Date('2021-09-05')

			const result = Blockchain.intToDate(20210905)

			assert.equal(result.getTime(), date.getTime())
		})
	})

	describe('hashblock', () => {
		it('Should make valid hash', () => {
			const block = {
				version: 1,
				closedate: '28/11/1989',
				previousHash: Blockchain.REF_HASH,
				signer: publicKey1,
				merkleroot: 0,
				transactions: [],
				money: [],
				invests: [],
				total: 0
			}

			const expected = hexToBytes('ef5691bc90b1748bc9d95c18783ef9cdadf11bb326608bc07a6950c96df7a75a')

			const result = Blockchain.hashblock(block)

			assert.deepEqual(result, expected)
		})

		it('Should ignore existing hash', () => {
			const block = {
				version: 1,
				closedate: '28/11/1989',
				previousHash: Blockchain.REF_HASH,
				signer: publicKey1,
				merkleroot: 0,
				transactions: [],
				money: [],
				invests: [],
				total: 0,
				hash: 12
			}

			const expected = hexToBytes('ef5691bc90b1748bc9d95c18783ef9cdadf11bb326608bc07a6950c96df7a75a')

			const result = Blockchain.hashblock(block)

			assert.deepEqual(result, expected)
		})
	})

	describe('hashtx', () => {
		// it('Should make valid hash', () => {
		//   const tx = {
		//     version: 1,
		//     type: Blockchain.TXTYPE.CREATE,
		//     date: '20101221',
		//     signer: publicKey1,
		//     target: publicKey1,
		// 	money: [],
		// 	invests: []
		//   }

		//   const expected = hexToBytes('159a659898428e906945a9a18cb983a74a42eb766b4bbdffcbee0a39ea9299d2')

		//   const result = Blockchain.hashtx(tx)

		//   assert.deepEqual(result, expected)
		// })

		// it('Should ignore existing hash', () => {
		//   const tx = {
		//     version: 1,
		//     total: 0,
		//     d: '2010-12-21',
		//     signer: '02e31267fc0e24e6a3da9e40fedb23f98c750bddb3278a1873ab49c601f3bbd66b',
		//     a: 1,
		//     h: 12
		//   }

		//   const expected = hexToBytes('155df9b6196747e744926feb7d4ca84ea6f911ffa5d41d3488e1d72868fd113f')

		//   const result = Blockchain.hashtx(tx)

		//   assert.deepEqual(result, expected)
		// })
	})

	describe('signblock', () => {
		it('Should make valid signature.', () => {
			const block = {
				version: 1,
				closedate: '28/11/1989',
				previousHash: Blockchain.REF_HASH,
				signer: publicKey1,
				total: 0,
				money: [],
				invests: [],
				merkleroot: 0
			}

			const expected = {
				version: 1,
				closedate: '28/11/1989',
				previousHash: Blockchain.REF_HASH,
				signer: publicKey1,
				total: 0,
				money: [],
				invests: [],
				merkleroot: 0,
				hash: '30440220770c161689997e1652f29f1abd2ac6bfc46b7de94b0e8b4528575776e8d246d3022001221607c6eaf2d81ba02394b53d464a5a79275806ed8a966b0e14a7f30675c7'
			}


			const signedBlock = Blockchain.signblock(block, privateKey1)

			assert.deepEqual(signedBlock, expected)
		})
	})

	describe('isValidBlock', () => {
		it('Should return false if no hash.', () => {
			const block = validCashBlock()
			delete block.hash

			const result = Blockchain.isValidBlock(block)

			assert.isNotOk(result)
		})
	})

	describe('isValidBirthBlock', () => {
		it('Should return true for valid block', () => {
			const result = Blockchain.isValidBirthBlock(validBirthBlock())

			assert.isTrue(result)
		})

		it('Should return false if a transaction is not signed.', () => {
			const birthblock = validBirthBlock()
			delete birthblock.transactions[0].hash

			const result = Blockchain.isValidBirthBlock(birthblock)

			assert.isNotOk(result)
		})
	})

	describe('isValidInitializationBlock', () => {
		it('Should return true for valid block', () => {
			const result = Blockchain.isValidInitializationBlock(validInitBlock())

			assert.isTrue(result)
		})
	})

	// describe('asBinary', () => {
	//   it('Should return binary blockchain... Yes !', () => {
	//     const bc = new Blockchain([validInitBlock(), validBirthBlock()])

	//   	printBlockchain(bc)

	//     const expected = hexToBytes('')

	//     const result = bc.asBinary()

	//     assert.deepEqual(result, expected)
	//   })
	// })

	// describe('asB64', () => {
	//   it('Should return b64 encoded blockchain...', () => {
	//     const bc = new Blockchain([validInitBlock(), validBirthBlock()])

	//     const expected = ''
	//     const result = bc.asB64()

	//     assert.deepEqual(result, expected)
	//   })
	// })

	/***********************************************************************
	 *                            UTILS METHODS
	 **********************************************************************/

	describe('addBlock', () => {
		it('Should add the given block to the blockchain.', () => {
			const bc = new Blockchain()

			bc.addBlock(validBirthBlock())

			assert.equal(bc.blocks.length, 1)
		})

		it('Should raise an error if previous block is not signed.', () => {
			const bc = new Blockchain()

			bc.addBlock(validBirthBlock())
			delete bc.lastblock.hash

			assert.throws(() => { bc.addBlock(validInitBlock()) }, UnauthorizedError, 'Cannot add block if previous is not signed.')
		})
	})

	describe('cashPaper', () => {
		/** A tool for this section tests */
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
	})

	describe('load', () => {
		it('Should load directly from object', () => {
			const bc = new Blockchain()
			const blocks = [validBirthBlock(), validInitBlock()]

			bc.load(blocks)

			assert.deepEqual(bc.blocks, blocks)
		})

		// it('Should load correctly from binary', () => {
		//   const bc = new Blockchain([validInitBlock(), validBirthBlock()])
		//   const bc2 = new Blockchain()
		//   const bin = bc.asBinary()

		//   bc2.load(bin)

		//   assert.deepEqual(bc2.blocks, bc.blocks)
		// })

		// it('Should load correctly from b64', () => {
		//   const bc = new Blockchain([validInitBlock(), validBirthBlock()])
		//   const bc2 = new Blockchain()
		//   const b64 = bc.asB64()

		//   bc2.load(b64)

		//   assert.deepEqual(bc2.blocks, bc.blocks)
		// })
	})

	describe('isValid', () => {
		it('Should return true for initialized blockchain.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const result = bc.isValid()

			assert.ok(result)
		})
	})

	describe('getLastTransaction', () => {
		it('Should return null if no transaction exists.', () => {
			const bc = new Blockchain()

			const result = bc.getLastTransaction()

			assert.isNull(result)
		})

		it('Should return the lastly added Transaction', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.getLastTransaction()
			const expected = {
				version: Blockchain.VERSION,
				date: 20250102,
				source: publicKey1,
				target: publicKey1,
				money: [20250102000, 20250102001, 20250102002, 20250102003],
				invests: [202501029000, 202501029001, 202501029002, 202501029003],
				type: Blockchain.TXTYPE.CREATE,
				signer: 0,
				hash: 0
			}

			assert.deepEqual(result, expected)
		})
	})

	describe('getAvailableMoneyAmount', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new Blockchain()
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
	})

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
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])
			const result = bc.isEmpty()

			assert.isNotOk(result)
		})
	})

	describe('getAvailableMoney', () => {
		it('Should return [] for new Blockchain.', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])
			const result = bc.getAvailableMoney()

			const expected = []

			assert.deepEqual(result, expected)
		})

		it('Should return each index.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const result = bc.getAvailableMoney()

			const expected =  [20250101000, 20250102000, 20250102001, 20250102002, 20250102003] 

			assert.deepEqual(result, expected)
		})

		it('Should return only given amount if given.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const result = bc.getAvailableMoney(2)

			const expected = [20250101000, 20250102000]

			assert.deepEqual(result, expected)
		})

		it('Should return only given amount for complexe cases.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			bc.lastblock.money = [
				20250101000, 20250101001, 20250101002, 20250101003, 20250101004,
				20250103000, 20250103001, 20250103002, 20250103003
			]
			const result = bc.getAvailableMoney(7)

			const expected = [
				20250101000, 20250101001, 20250101002, 20250101003, 20250101004,
				20250103000, 20250103001,
			]

			assert.deepEqual(result, expected)
		})

		it('Should return [] if amount is too big (1).', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const result = bc.getAvailableMoney(2)

			assert.deepEqual(result, [])
		})

		it('Should return [] if amount is too big (2).', () => {
			const bc = new CitizenBlockchain([validInitBlock(), validBirthBlock()])
			bc.lastblock.total = 27
			bc.createMoneyAndInvests(privateKey1, new Date('2021-09-21'))

			const result = bc.getAvailableMoney(3)

			assert.deepEqual(result, [])
		})
	})

	describe('removeMoney', () => {
		it('Should filter properly.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.removeMoney([20250101000, 20250102000]);
			const expected = [20250102001, 20250102002, 20250102003];

			assert.deepEqual(result, expected)
		})
	})

	describe('addTransaction', () => {
		it('Should add the given transaction to last block', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()]);
			const tx = {
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey1,
				target: publicKey1,
				money: [],
				invests: [],
				type: Blockchain.TXTYPE.CREATE,
				signer: 0,
				hash: 0
			}

			bc.addTransaction(tx)

			assert.deepEqual(bc.lastblock.transactions[0], tx)
		})

		it('Should create a new block if last one is signed', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()]);
			const tx = {
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey1,
				target: publicKey1,
				money: [],
				invests: [],
				type: Blockchain.TXTYPE.CREATE,
				signer: 0,
				hash: 0
			}

			bc.addTransaction(tx)

			assert.equal(bc.blocks.length, 3)
		})

		it('Should NOT create a new block if last one is NOT signed', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()]);
			delete bc.lastblock.hash

			const tx = {
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey1,
				target: publicKey1,
				money: [],
				invests: [],
				type: Blockchain.TXTYPE.CREATE,
				signer: 0,
				hash: 0
			}

			bc.addTransaction(tx)
			bc.addTransaction(tx)
			bc.addTransaction(tx)

			assert.equal(bc.blocks.length, 2)
		})
	})

	describe('newBlock', () => {
		it('Should throw error if previous block is not signed.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])
			delete bc.lastblock.hash

			const fn = () => { bc.newBlock() }

			assert.throws(fn, Error, 'Previous block not signed.')
		})

		it('Should add an empty block to the blockchain.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			assert.equal(bc.blocks.length, 2)

			bc.newBlock()

			assert.equal(bc.blocks.length, 3)
		})

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
	})

	describe('sealLastBlock', () => {
		it('Should raise an error if block contains Cashes Papers and signer is me.', () => {
			const bc = new Blockchain([validPaperdBlock(), validInitBlock(), validBirthBlock()])
			delete bc.lastblock.hash

			assert.throws(() => { bc.sealLastBlock(privateKey1) }, UnauthorizedError, 'Only Paper signer can seal a block with it.')
		})

		it('Should raise an error if block contains Cashes Papers and signer is not Paper signer.', () => {
			const bc = new Blockchain([validPaperdBlock(), validInitBlock(), validBirthBlock()])
			delete bc.lastblock.hash

			assert.throws(() => { bc.sealLastBlock(privateKey2) }, UnauthorizedError, 'Only Paper signer can seal a block with it.')
		})

		it('Should sign the last block even if it contains Cashes Papers while signer is Paper signer.', () => {
			const bc = new Blockchain([validPaperdBlock(), validInitBlock(), validBirthBlock()])
			delete bc.lastblock.hash

			signature = bc.sealLastBlock(privateKey3)

			assert.ok(signature)
		})
	})

	describe('getMyPublicKey', () => {
		it('Should return null for empty Blockchain.', () => {
			const bc = new Blockchain()

			const result = bc.getMyPublicKey()

			assert.isNull(result)
		})

		it('Should return the correct key from birth block.', () => {
			const bc = new Blockchain([validBirthBlock()])

			const result = bc.getMyPublicKey()

			assert.equal(result, publicKey1)
		})

		it('Should return the correct key from last CREATE transaction.', () => {
			const bc = new Blockchain([
				{
					version: Blockchain.VERSION,
					transactions: [
						{
							source: publicKey1,
							type: Blockchain.TXTYPE.CREATE,
						}
					]
				}
			])

			const result = bc.getMyPublicKey()

			assert.equal(result, publicKey1)
		})
	})

	/***********************************************************************
	 *                           MAIN METHODS
	 **********************************************************************/

	describe('income', () => {
		const makeTx = () => {
			const tx = {
				version: Blockchain.VERSION,
				date: 20250101,
				source: publicKey2,
				target: publicKey1,
				money: [20250101000],
				invests: [20250101000],
				type: Blockchain.TXTYPE.PAY,
				signer: 0
			}
			return Blockchain.signtx(tx, privateKey2)
		}
		it('Should throw an error if target is not blockchain owner.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			tx.target = publicKey2

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})
		
		it('Should throw an error if transaction is not signed.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			delete tx.hash

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction has no version.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			delete tx.version
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction has no date.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			delete tx.date
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction has no source.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			delete tx.source
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction has no target.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			delete tx.target
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction has no money.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			delete tx.money
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction has no invests.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			delete tx.invests
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction has no type.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			delete tx.type
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should throw an error if transaction type is != PAY.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			tx.type = Blockchain.TXTYPE.CREATE
			Blockchain.signtx(tx, privateKey2)

			assert.throws(() => { bc.income(tx) }, 'Invalid transaction')
		})

		it('Should add the transaction to last block.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			bc.income(tx)

			assert.deepEqual(bc.lastblock.transactions[0], tx)
		})

		it('Should increase the blockchain total.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			const tx = makeTx()
			bc.income(tx)

			assert.deepEqual(bc.lastblock.total, 1)
		})
	})

	describe('pay', () => {
		it('Should make valid transaction.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			bc.pay(privateKey1, publicKey2, 3, new Date('2025-01-03'))
			const result = bc.lastblock.transactions[0]

			assert.ok(Blockchain.isValidTransaction(result))
			delete result.hash

			const expected = {
				version: Blockchain.VERSION,
				type: Blockchain.TXTYPE.PAY,
				date: 20250103,
				money: [20250101000, 20250102000, 20250102001],
				invests: [],
				source: publicKey1,
				target: publicKey2,
				signer: 0
			}

			assert.deepEqual(result, expected)
		})

		it('Should decrease money of the block.', () => {
			const bc = new CitizenBlockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			bc.pay(privateKey1, publicKey2, 3, new Date('2025-01-03'))

			const result = bc.lastblock.money
			const expected = [20250102002, 20250102003]

			assert.deepEqual(result, expected)
		})

		it('Should throw error if blockchain can t afford it.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			assert.throws(() => { bc.pay(privateKey1, publicKey2, 2) }, InvalidTransactionError, 'Unsufficient funds.')
		})
	})
})

describe('CitizenBlockchain', () => {
	const validBirthBlock = () => {
		// A valid birth block for someone named Gus,
		// born the 28/11/1989 and subscribing on
		// the 01/01/2025.
		const res =  {
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
				closedate: Blockchain.dateToInt(today),
				previousHash: Blockchain.REF_HASH,
				signer: publicKey1,
				money: [20250225000],
				invests: [20250225000],
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
						invests: [20250225000],
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
					money: [],
					invests: [],
					version: 1,
					transactions: [],
					merkleroot: 0
				},
				{
					version: Blockchain.VERSION,
					closedate: Blockchain.dateToInt(today),
					signer: publicKey1,
					money: [20250201000],
					invests: [20250201000],
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
							invests: [20250201000],
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
			const today = Blockchain.dateToInt(new Date())
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
				money: [],
				invests: [],
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
				closedate: Blockchain.dateToInt(today),
				previousHash: Blockchain.ECOREF_HASH,
				signer: publicKey1, // The ecosystem signs only this first block
				money: [],
				invests: [],
				total: 0,
				merkleroot: 0,
				transactions: [
					{
						version: Blockchain.VERSION,
						date: Blockchain.dateToInt(today),
						source: publicKey1, // The ecosystem sets its name
						target: name,
						money: [],
						invests: [],
						type: Blockchain.TXTYPE.INIT,
						signer: 0
					},
					{
						version: Blockchain.VERSION,
						date: Blockchain.dateToInt(today),
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
			const today = Blockchain.dateToInt(new Date())
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

//describe('toto', () => {
//	describe('tata', () => {
//		it.only('Should encrypt data correctly.', async () => {
//			console.log(JSON.stringify({
//				v: 1,
//				d: 20250102,
//				f: publicKey1,
//				t: publicKey2,
//				m: [20241228000, 20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000,20241228000],
//				i: [],
//				t: 2,
//				s: 0,
//				h: '03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46'
//			}))
//		})
//	})
//})
