import { describe, it } from 'mocha';
import { assert } from 'chai';
import { sha256 } from 'ethereum-cryptography/sha256.js'
import { MerkleTree } from 'merkletreejs'
import { hexToBytes } from 'ethereum-cryptography/utils.js';


import { InvalidTransactionError, UnauthorizedError } from '../src/errors.js'
import { Blockchain } from '../src/Blockchain.js';
import { privateKey1, publicKey1, privateKey2, publicKey2, privateKey3, publicKey3 } from './testUtils.js'
import { randomPrivateKey, aesEncrypt, aesDecrypt, publicFromPrivate, 
	dateToInt, intToDate, intToIndex, formatMoneyIndex, formatInvestIndex,
	buildInvestIndexes, buildMoneyIndexes } from '../src/crypto.js'

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
			money: [20250101000],
			invests: [20250101000],
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
			invests: [202501019000, 202501029000, 202501029001, 202501029002, 202501029003]
		}

		const tx1 = {
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
		const tx2 = {
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

		Blockchain.signtx(tx1, privateKey1)
		Blockchain.signtx(tx2, privateKey1)
		res.transactions = [tx1, tx2]
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
			const msg = randomPrivateKey()
			const result = await aesEncrypt(msg, 'test_pwd')

			assert.property(result, 'msg')
			assert.property(result, 'iv')
			assert.property(result, 'sha')
		})
	})

	describe('aesDecrypt', () => {
		it('Should decrypt data correctly.', async () => {
			const msg = hexToBytes(randomPrivateKey())
			const encrypted = await aesEncrypt(msg, 'test_pwd')
			const result = await aesDecrypt(encrypted, 'test_pwd')

			assert.deepEqual(result, msg)
		})

		it('Should throw error for invalid password.', async () => {
			const msg = randomPrivateKey()
			const encrypted = await aesEncrypt(msg, 'test_pwd')

			let error = null
			try {
				await aesDecrypt(encrypted, 'wrong_password')
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

			const result = dateToInt(date)

			assert.equal(result, 20211115)
		})

		it('Should work with dates including 1 digit month and day.', () => {
			const date = new Date('2021-09-05')

			const result = dateToInt(date)

			assert.equal(result, 20210905)
		})
	})

	describe('intToDate', () => {
		it('Should return a valid Date object.', () => {
			const date = new Date('2021-11-15')

			const result = intToDate(20211115)

			assert.equal(result.getTime(), date.getTime())
		})

		it('Should work with dates including 1 digit month and day.', () => {
			const date = new Date('2021-09-05')

			const result = intToDate(20210905)

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

	describe('merkleBlock', () => {
		it('Should add the merkle root to the given block.', () => {
			let block = validCashBlock()
			const expectedMerkleRoot = '8a044af1b880a376db04243b8926b92c7f180e741182e25a1e044f9899c73d6c'

			block = Blockchain.merkleBlock(block)

			assert.deepEqual(block.merkleroot, expectedMerkleRoot)
		})

		it('Should make valid merkle root.', () => {
			let leaf, proof, root, result
			let block = validCashBlock()

			block = Blockchain.merkleBlock(block)
			const leaves = block.transactions.map(x => x.hash)
			const tree = new MerkleTree(leaves, sha256)
			root = block.merkleroot

			for (let tx of block.transactions) {
				leaf = tx.hash
				proof = tree.getProof(leaf)
				result = tree.verify(proof, leaf, root)

				assert.isTrue(result)
			}
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
			const bc = new Blockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

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
				hash: "304402204646b3bb86df2bc60e4614c52a6c00a5b0958c4e16ebcdc89baf99852601057c0220327ee93dcea833015edd38feb1c3175b2d86421aae500844398749299e4c42eb"
			}

			assert.deepEqual(result, expected)
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
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])
			const result = bc.isEmpty()

			assert.isNotOk(result)
		})
	})

	describe('getAvailableMoney', () => {
		it('Should return first created money for new Blockchain.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])
			const result = bc.getAvailableMoney()

			const expected = [20250101000]

			assert.deepEqual(result, expected)
		})

		it('Should return each index.', () => {
			const bc = new Blockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const result = bc.getAvailableMoney()

			const expected =  [20250101000, 20250102000, 20250102001, 20250102002, 20250102003] 

			assert.deepEqual(result, expected)
		})

		it('Should return only given amount if given.', () => {
			const bc = new Blockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
			const result = bc.getAvailableMoney(2)

			const expected = [20250101000, 20250102000]

			assert.deepEqual(result, expected)
		})

		it('Should return only given amount for complexe cases.', () => {
			const bc = new Blockchain([validCashBlock(), validInitBlock(), validBirthBlock()])
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
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])
			bc.lastblock.total = 27

			const result = bc.getAvailableMoney(3)

			assert.deepEqual(result, [])
		})
	})

	describe('removeMoney', () => {
		it('Should filter properly.', () => {
			const bc = new Blockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			const result = bc.removeMoney([20250101000, 20250102000]);
			const expected = [20250102001, 20250102002, 20250102003];

			assert.deepEqual(result, expected)
		})
	})

	describe('addTransaction', () => {
		it('Should add the given transaction to last block', () => {
			const bc = new Blockchain([validCashBlock(), validInitBlock(), validBirthBlock()]);
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
				hash: 1
			}
			const tx2 = {
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey1,
				target: publicKey1,
				money: [],
				invests: [],
				type: Blockchain.TXTYPE.CREATE,
				signer: 0,
				hash: 2
			}
			const tx3 = {
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey1,
				target: publicKey1,
				money: [],
				invests: [],
				type: Blockchain.TXTYPE.CREATE,
				signer: 0,
				hash: 3
			}

			bc.addTransaction(tx)
			bc.addTransaction(tx2)
			bc.addTransaction(tx3)

			assert.equal(bc.blocks.length, 2)
		})

		it('Should throw an error if transaction already is in last block.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

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
			Blockchain.signtx(tx, privateKey2)
			bc.addTransaction(tx)

			assert.throws(() => { bc.addTransaction(tx) }, InvalidTransactionError, 'Transaction duplicate ' + tx.hash)
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

			const signature = bc.sealLastBlock(privateKey3)

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
			const bc = new Blockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

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
			const bc = new Blockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			bc.pay(privateKey1, publicKey2, 3, new Date('2025-01-03'))

			const result = bc.lastblock.money
			const expected = [20250102002, 20250102003]

			assert.deepEqual(result, expected)
		})

		it('Should increase total if I m the target.', () => {
			const bc = new Blockchain([validCashBlock(), validInitBlock(), validBirthBlock()])

			bc.pay(privateKey1, publicKey1, 3, new Date('2025-01-03'))

			const result = bc.lastblock.money
			const expected = [20250102002, 20250102003]

			assert.deepEqual(bc.lastblock.total, 30)
		})

		it('Should throw error if blockchain can t afford it.', () => {
			const bc = new Blockchain([validInitBlock(), validBirthBlock()])

			assert.throws(() => { bc.pay(privateKey1, publicKey2, 2) }, InvalidTransactionError, 'Unsufficient funds.')
		})
	})
})