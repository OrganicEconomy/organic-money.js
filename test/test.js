const { describe, it } = require('mocha')
const Blockchain = require('../index')
const { sha256 } = require('ethereum-cryptography/sha256')
const secp = require('ethereum-cryptography/secp256k1')
const { hexToBytes, toHex } = require("ethereum-cryptography/utils");
const assert = require('chai').assert
const msgpack = require('msgpack-lite')

const privateKey1 = 'ed945716dddb7af2c9774939e9946f1fee31f5ec0a3c6ec96059f119c396912f'
const publicKey1 = '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3'
const privateKey2 = 'e68955130b2c4adc6165b0bae6e6b8f4bcce1879dbf0c6f91b3acc69479ef272'
const publicKey2 = '03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46'

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
		invests: [20250101000, 20250102000, 20250102001, 20250102002, 20250102003],
		transactions: [
			{
				version: Blockchain.VERSION,
				date: 20250102,
				source: publicKey1,
				target: publicKey1,
				money: [20250102000, 20250102001, 20250102002, 20250102003],
				invests: [20250102000, 20250102001, 20250102002, 20250102003],
				type: Blockchain.TXTYPE.CREATE,
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
				hash: 0
			}
		]
	}
	Blockchain.signblock(res, privateKey1);
	return res;
}

const validBlockchain = () => {
	return new Blockchain([validInitBlock(), validBirthBlock()])
}

const validCashedBlockchain = () => {
	return new Blockchain([
		validCashBlock(),
		validInitBlock(),
		validBirthBlock()
	])
}

describe('blockchain', () => {

	// describe('asBinary', () => {
	//   it('Should return binary blockchain... Yes !', () => {
	//     const bc = validBlockchain()

	//   	printBlockchain(bc)
	//   	console.log(bc)

	//     const expected = hexToBytes('')

	//     const result = bc.asBinary()

	//     assert.deepEqual(result, expected)
	//   })
	// })

	// describe('asB64', () => {
	//   it('Should return b64 encoded blockchain...', () => {
	//     const bc = validBlockchain()

	//     const expected = ''
	//     const result = bc.asB64()

	//     assert.deepEqual(result, expected)
	//   })
	// })

	describe('getLastTx', () => {
		it('Should return null if no transaction exists.', () => {
			const bc = new Blockchain()

			const result = bc.getLastTx()

			assert.isNull(result)
		})

		it('Should return the lastly added Transaction', () => {
			const bc = validCashedBlockchain()

			const result = bc.getLastTx()
			const expected = {
				version: Blockchain.VERSION,
				date: 20250102,
				source: publicKey1,
				target: publicKey1,
				money: [20250102000, 20250102001, 20250102002, 20250102003],
				invests: [20250102000, 20250102001, 20250102002, 20250102003],
				type: Blockchain.TXTYPE.CREATE,
				hash: 0
			}

			assert.deepEqual(result, expected)
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
		//   const bc = validBlockchain()
		//   const bc2 = new Blockchain()
		//   const bin = bc.asBinary()

		//   bc2.load(bin)

		//   assert.deepEqual(bc2.blocks, bc.blocks)
		// })

		// it('Should load correctly from b64', () => {
		//   const bc = validBlockchain()
		//   const bc2 = new Blockchain()
		//   const b64 = bc.asB64()

		//   bc2.load(b64)

		//   assert.deepEqual(bc2.blocks, bc.blocks)
		// })
	})

	describe('makeBirthBlock', () => {
		it('Should return corectly filled block', () => {
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'

			const block = Blockchain.makeBirthBlock(privateKey1, birthdate, name, today)
			delete block.hash

			const expected = {
				version: Blockchain.VERSION,
				closedate: Blockchain.dateToInt(today),
				previousHash: Blockchain.REF_HASH,
				signer: publicKey1,
				money: [20250225001],
				invests: [20250225001],
				total: 0,
				merkleroot: 0,
				transactions: [
					{
						version: Blockchain.VERSION,
						date: 20021212,
						source: name,
						target: publicKey1,
						money: [],
						invests: [],
						type: Blockchain.TXTYPE.INIT
					},
					{
						version: Blockchain.VERSION,
						date: 20250225,
						source: publicKey1,
						target: publicKey1,
						money: [20250225001],
						invests: [20250225001],
						type: Blockchain.TXTYPE.CREATE
					}
				]
			}

			assert.deepEqual(block, expected)
		})

		it('Should return a signed block', () => {
			const birthdate = new Date('2002-12-12')
			const today = new Date('2025-02-25')
			const name = 'Gus'
			const block = Blockchain.makeBirthBlock(privateKey1, birthdate, name, today)

			const signature = Blockchain.verifyBlock(block, publicKey1)

			assert.ok(signature)
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
		it('Should make valid signature', () => {
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

	describe('isValidBirthBlock', () => {
		it('Should return true for valid block', () => {
			const result = Blockchain.isValidBirthBlock(validBirthBlock())

			assert.isTrue(result)
		})
	})

	describe('isValidInitializationBlock', () => {
		it('Should return true for valid block', () => {
			const result = Blockchain.isValidInitializationBlock(validInitBlock())

			assert.isTrue(result)
		})
	})

	describe('validateAccount', () => {
		it('Should return a 2 blocks long Blockchain', () => {
			const result = Blockchain.validateAccount(validBirthBlock(), privateKey2)

			assert.equal(result.blocks.length, 2)
		})

		it('Should return unmodified birth block', () => {
			const bb = validBirthBlock()
			const result = Blockchain.validateAccount(bb, privateKey2)

			assert.equal(result.blocks[1], bb)
		})

		it('Should return a valid initialization block', () => {
			const result = Blockchain.validateAccount(validBirthBlock(), privateKey2)

			const pubkey = secp.getPublicKey(privateKey2, true)
			assert.ok(Blockchain.verifyBlock(result.blocks[0], pubkey))

			delete result.blocks[0].hash
			delete result.blocks[0].previousHash
			// console.log(result.blocks[0].previousHash)

			const expectedInitializationBlock = {
				closedate: new Date().toISOString().slice(0, 10),
				signer: publicKey2,
				total: 0,
				money: [],
				invests: [],
				version: 1,
				transactions: [],
				merkleroot: 0
			}

			assert.deepEqual(result.blocks[0], expectedInitializationBlock)
		})
	})

	describe('getLevel', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new Blockchain()
			const result = bc.getLevel()

			assert.equal(result, 0)
		})

		it('Should return 2 for t=1 to 7', () => {
			const bc = validBlockchain()
			for (let i = 1; i < 8; i++) {
				bc.blocks[0].total = i
				assert.equal(bc.getLevel(), 2, "i = " + i)
			}
		})

		it('Should return 3 for t=8 to 26', () => {
			const bc = validBlockchain()
			for (let i = 8; i < 26; i++) {
				bc.blocks[0].total = i
				assert.equal(bc.getLevel(), 3)
			}
		})
	})

	describe('getMoneyBeforeNextLevel', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new Blockchain()
			const result = bc.getMoneyBeforeNextLevel()

			assert.equal(result, 0)
		})

		it('Should return 16 for total at 11 (target is 27)', () => {
			const bc = validBlockchain()
			bc.blocks[0].total = 11

			const result = bc.getMoneyBeforeNextLevel()

			assert.equal(result, 16)
		})

		it('Should return percent if as_percent is true', () => {
			const bc = validBlockchain()
			bc.blocks[0].total = 11

			const result = bc.getMoneyBeforeNextLevel(true)

			assert.equal(result, 40)
		})
	})

	describe('getAvailableMoneyAmount', () => {
		it('Should return 0 for empty blockchain', () => {
			const bc = new Blockchain()
			const result = bc.getAvailableMoneyAmount()

			assert.equal(result, 0)
		})

		it('Should return 0 for validation waiting blockchain', () => {
			const bc = new Blockchain([validBirthBlock()])
			const result = bc.getAvailableMoneyAmount()

			assert.equal(result, 0)
		})

		it('Should return last block s money for valid blockchain', () => {
			const bc = validCashedBlockchain()

			const result = bc.getAvailableMoneyAmount()

			assert.equal(result, 5)
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
			const bc = validBlockchain()
			const result = bc.isEmpty()

			assert.isNotOk(result)
		})
	})

	describe('isWaitingValidation', () => {
		it('Should return false for empty blockchain', () => {
			const bc = new Blockchain()
			const result = bc.isWaitingValidation()

			assert.isNotOk(result)
		})

		it('Should return false for already valid blockchain', () => {
			const bc = validBlockchain()
			const result = bc.isWaitingValidation()

			assert.isNotOk(result)
		})

		it('Should return false if the block is not a birth one', () => {
			const bc = new Blockchain([validInitBlock()])
			const result = bc.isWaitingValidation()

			assert.isNotOk(result)
		})

		it('Should return true for blockchain effectively waiting for validation', () => {
			const bc = new Blockchain([validBirthBlock()])
			const result = bc.isWaitingValidation()

			assert.ok(result)
		})
	})

	describe('isValidated', () => {
		it('Should return false for empty blockchain', () => {
			const bc = new Blockchain()
			const result = bc.isValidated()

			assert.isNotOk(result)
		})

		it('Should return false if the first block is not a birth one', () => {
			const bc = new Blockchain([validInitBlock()])
			const result = bc.isValidated()

			assert.isNotOk(result)
		})

		it('Should return true for a valid blockchain', () => {
			const bc = validBlockchain()
			const result = bc.isValidated()

			assert.ok(result)
		})

		it('Should return true for a long time valid', () => {
			const bc = validCashedBlockchain()
			const result = bc.isValidated()

			assert.ok(result)
		})
	})

	describe('createMoney', () => {
		it('Should throw error if date is in the futur.', () => {
			const bc = validBlockchain()

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			assert.throws(() => { bc.createMoney(privateKey1, tomorrow) }, 'Cannot create futur money, live in the present.')
		})

		it('Should return transaction in OK case.', () => {
			const bc = validBlockchain();

			bc.createMoney(privateKey1, new Date('2025-01-02'));
			const result = bc.blocks[0].transactions[0]

			assert.ok(Blockchain.verifyTx(result, secp.getPublicKey(privateKey1)))
			delete result.hash

			const expected = {
				version: 1,
				type: Blockchain.TXTYPE.CREATE,
				date: 20250102,
				signer: publicKey1,
				target: publicKey1,
				money: [20250102000],
				invests: [20250102000]
			}

			assert.deepEqual(result, expected)
		})

		it('Should create 1+Total^(1/3) Money.', () => {
			const bc = validCashedBlockchain()
			bc.createMoney(privateKey1, new Date('2025-01-03'))

			const result = bc.blocks[0].transactions[0]
			delete result.hash

			const expected = {
				version: Blockchain.VERSION,
				type: Blockchain.TXTYPE.CREATE,
				date: 20250103,
				signer: publicKey1,
				target: publicKey1,
				money: [20250103000, 20250103001, 20250103002, 20250103003],
				invests: [20250103000, 20250103001, 20250103002, 20250103003]
			}

			assert.deepEqual(result, expected)
		})

		it('Should return null if given date was already done.', () => {
			const bc = validCashedBlockchain();

			const result = bc.createMoney(privateKey1, new Date('2025-01-01'));

			assert.isNull(result)
		})

		it('Should increase money and invests of the block.', () => {
			const bc = validCashedBlockchain()

			const tx = bc.createMoney(privateKey1, new Date('2025-01-03'))
			const expected = [
				20250101000,
				20250102000, 20250102001, 20250102002, 20250102003,
				20250103000, 20250103001, 20250103002, 20250103003,
			]

			assert.deepEqual(bc.blocks[0].money, expected)
			assert.deepEqual(bc.blocks[0].invests, expected)
		})
	})

	describe('getAvailableMoney', () => {
		it('Should return [] for new Blockchain.', () => {
			const bc = validBlockchain()
			const result = bc.getAvailableMoney()

			const expected = []

			assert.deepEqual(result, expected)
		})

		it('Should return each index.', () => {
			const bc = validCashedBlockchain()
			const result = bc.getAvailableMoney()

			const expected =  [20250101000, 20250102000, 20250102001, 20250102002, 20250102003] 

			assert.deepEqual(result, expected)
		})

		it('Should return only given amount if given.', () => {
			const bc = validCashedBlockchain()
			const result = bc.getAvailableMoney(2)

			const expected = [20250101000, 20250102000]

			assert.deepEqual(result, expected)
		})

		it('Should return only given amount for complexe cases.', () => {
			const bc = validCashedBlockchain()
			bc.blocks[0].money = [
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

		it('Should raise an error if amount is too big (1).', () => {
			const bc = validBlockchain()

			assert.throws(() => { bc.getAvailableMoney(2) }, 'Unsufficient founds.')
		})

		it('Should raise an error if amount is too big (2).', () => {
			const bc = validBlockchain()
			bc.blocks[0].total = 27
			bc.createMoney(privateKey1, new Date('2021-09-21'))

			assert.throws(() => { bc.getAvailableMoney(5) }, 'Unsufficient founds.')
		})
	})

	describe('removeMoney', () => {
		it('Should filter properly.', () => {
			const bc = validCashedBlockchain()

			const result = bc.removeMoney([20250101000, 20250102000]);
			const expected = [20250102001, 20250102002, 20250102003];

			assert.deepEqual(result, expected)
		})
	})

	describe('pay', () => {
		it('Should make valid transaction.', () => {
			const bc = validCashedBlockchain()

			bc.pay(privateKey1, publicKey2, 3, new Date('2025-01-03'))
			const result = bc.blocks[0].transactions[0]

			assert.ok(Blockchain.verifyTx(result, publicKey1))
			delete result.hash

			const expected = {
				date: 20250103,
				money: [20250101000, 20250102000, 20250102001],
				invests: [],
				signer: publicKey1,
				type: Blockchain.TXTYPE.PAY,
				target: publicKey2,
				version: Blockchain.VERSION
			}

			assert.deepEqual(result, expected)
		})

		it('Should decrease money of the block.', () => {
			const bc = validCashedBlockchain()

			bc.pay(privateKey1, publicKey2, 3, new Date('2025-01-03'))

			const result = bc.blocks[0].money
			const expected = [20250102002, 20250102003]

			assert.deepEqual(result, expected)
		})
	})

	describe('addTx', () => {
		it('Should add the given transaction to last block', () => {
			const bc = validCashedBlockchain();
			const tx = {
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey1,
				target: publicKey1,
				money: [],
				invests: [],
				type: Blockchain.TXTYPE.CREATE,
				hash: 0
			}

			bc.addTx(tx)

			assert.deepEqual(bc.blocks[0].transactions[0], tx)
		})

		it('Should create a new block if last one is signed', () => {
			const bc = validBlockchain();
			const tx = {
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey1,
				target: publicKey1,
				money: [],
				invests: [],
				type: Blockchain.TXTYPE.CREATE,
				hash: 0
			}

			bc.addTx(tx)

			assert.equal(bc.blocks.length, 3)
		})

		it('Should NOT create a new block if last one is NOT signed', () => {
			const bc = validBlockchain();
			const tx = {
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey1,
				target: publicKey1,
				money: [],
				invests: [],
				type: Blockchain.TXTYPE.CREATE,
				hash: 0
			}

			bc.addTx(tx)
			bc.addTx(tx)
			bc.addTx(tx)

			assert.equal(bc.blocks.length, 3)
		})
	})

	describe('hasLevelUpOnLastTx', () => {
		it('Should return false if there is no transaction.', () => {
			const bc = validBlockchain()

			const result = bc.hasLevelUpOnLastTx()

			assert.isNotOk(result)
		})

		it('Should return false if last Transaction did not change level (from 27 to 63).', () => {
			const bc = validCashedBlockchain()
			const money = []
			for (let i = 0; i < 36; i++) {
				money.push(20241229000 + i)
			}

			bc.addTx({
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey2,
				target: publicKey1,
				money: money,
				invests: [],
				type: Blockchain.TXTYPE.PAY
			})
			bc.blocks[0].total += 36;

			const result = bc.hasLevelUpOnLastTx()

			assert.isNotOk(result)
		})

		it('Should return true after passed from 27 to 64 Total.', () => {
			const bc = validCashedBlockchain()
			const money = []
			for (let i = 0; i < 37; i++) {
				money.push(20241229000 + i)
			}

			bc.addTx({
				version: Blockchain.VERSION,
				date: 20250103,
				source: publicKey2,
				target: publicKey1,
				money: money,
				invests: [],
				type: Blockchain.TXTYPE.PAY
			})
			bc.blocks[0].total += 37;

		  const result = bc.hasLevelUpOnLastTx()

		  assert.ok(result)
		})
	})

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
			const msg = Blockchain.randomPrivateKey()
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

	describe('isValid', () => {
		it('Should return true for initialized blockchain.', () => {
			const bc = validBlockchain()

			const result = bc.isValid()

			assert.ok(result)
		})
	})
})
