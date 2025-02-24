const { describe, it } = require('mocha')
const Blockchain = require('../index')
const { sha256 } = require('ethereum-cryptography/sha256')
const secp = require('ethereum-cryptography/secp256k1')
const { hexToBytes, toHex } = require("ethereum-cryptography/utils");
const assert = require('chai').assert
const msgpack = require('msgpack-lite')

const privateKey1 = hexToBytes('ed945716dddb7af2c9774939e9946f1fee31f5ec0a3c6ec96059f119c396912f')
const publicKey1 = hexToBytes('02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3')
const privateKey2 = hexToBytes('e68955130b2c4adc6165b0bae6e6b8f4bcce1879dbf0c6f91b3acc69479ef272')
const publicKey2 = hexToBytes('03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46')

const validBirthBlock = () => {
  const res =  {
    closedate: '28/11/1989',
    previousHash: Blockchain.REF_HASH,
    merkleroot: 0,
    signer: publicKey1,
    total: 0,
    version: 1,
    transactions: []
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
    transactions: []
  }
  Blockchain.signblock(res, privateKey2);
  return res;
}

const validBlockchain = () => {
  return new Blockchain([validInitBlock(), validBirthBlock()])
}

const toHexString = (byteArray) => {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

const printBlockchain = (blockchain) => {
	const res = [];
	blockchain.blocks.forEach(block => {
		res.push({
		  v: block.version,
		  d: block.closedate,
		  p: block.previousHash,
		  s: block.signer,
		  r: block.merkleroot,
		  t: block.total,
          x: block.transactions,
		  h: block.hash
        })
	});
    const packedblockchain = msgpack.encode(res)
	//console.log(toHexString(packedblockchain));
	console.log(toHexString(packedblockchain));
}

const printBlockHash = (block) => {
	const b = {
		v: block.version,
		d: block.closedate,
		p: block.previousHash,
		s: block.signer,
		r: block.merkleroot,
		t: block.total
	}
    const packedblock = msgpack.encode(b)
	console.log(toHexString(sha256(packedblock)));
}

const printTransactionHash = (tx) => {
	const transaction = {
		d: tx.date,
		m: tx.money,
		i: tx.invests,
		s: tx.signer,
		t: tx.type,
		p: tx.target,
		v: tx.version
	}
    const packedtx = msgpack.encode(transaction)
	console.log(toHexString(sha256(packedtx)));
}

describe('blockchain', () => {

  describe('asBinary', () => {
    it('Should return binary blockchain... Yes !', () => {
      const bc = validBlockchain()

		printBlockchain(bc)
		console.log(bc)

      const expected = hexToBytes('9288a17601a164aa32312f30392f32303231a170c7461230440220368cc9f21933a4e41ac555b22e7f365dc32275c4c3007760954f038b80d285e602201f44e7f715d434f8a1f74d0ac7ae2b5d3891565ec10690ce6c2783e2e049d109a173c7211203cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46a17200a17400a17890a168c747123045022100d394cca7e510b933130b7da3ff607f6f83c7c4062ca2b4cdf96e02d198dcf272022021ead0c1e96a14f07cad9c3d4edbd206863d4126bc379d0082802f536ebf0cee88a17601a164aa32382f31312f31393839a170d94063316135353163613163306465656135656665613531623165316465613131326564316465613061353135306635653131616231653530633161313565656435a173c7211202c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3a17200a17400a17890a168c7461230440220368cc9f21933a4e41ac555b22e7f365dc32275c4c3007760954f038b80d285e602201f44e7f715d434f8a1f74d0ac7ae2b5d3891565ec10690ce6c2783e2e049d109')

      const result = bc.asBinary()

      assert.deepEqual(result, expected)
    })
  })

  describe('asB64', () => {
    it('Should return b64 encoded blockchain...', () => {
      const bc = validBlockchain()

      const expected = 'koehdgGhZKoyMS8wOS8yMDIxoXDHSBIwRgIhAPAKSNCxOT3p8W/bUV32JQuDr4ZGckgxXpv2xNc8D+0jAiEA+jRg31wTMUm9uKpEiJbU3dnHh/TiZp6Gm40MK0fDwzmhc8cgEuaJVRMLLErcYWWwuubmuPS8zhh52/DG+Rs6zGlHnvJyoXIAoXQAoWjHRxIwRQIgXl5ZY1qd7hzzgJ5WOyhvQwcIN0JzIt+ifmnGPyS9FCkCIQDvGiLQv9ThOGicS1EZ0jJ2U7DxpOnLxxSrtXmMo9aXH4ehdgGhZKoyOC8xMS8xOTg5oXDZQGMxYTU1MWNhMWMwZGVlYTVlZmVhNTFiMWUxZGVhMTEyZWQxZGVhMGE1MTUwZjVlMTFhYjFlNTBjMWExNWVlZDWhc8cgEu2UVxbd23ryyXdJOemUbx/uMfXsCjxuyWBZ8RnDlpEvoXIAoXQAoWjHSBIwRgIhAPAKSNCxOT3p8W/bUV32JQuDr4ZGckgxXpv2xNc8D+0jAiEA+jRg31wTMUm9uKpEiJbU3dnHh/TiZp6Gm40MK0fDwzk='
      const result = bc.asB64()

      assert.deepEqual(result, expected)
    })
  })

  describe('getLastTx', () => {
    it('Should return null if no transaction exists.', () => {
      const bc = validBlockchain()

      const result = bc.getLastTx()

      assert.isNull(result)
    })

    it('Should return the lastly added Transaction', () => {
      const bc = validBlockchain()
      bc.addTx(bc.createMoney(privateKey1, '2021-09-25'))
      const lastTx = bc.createMoney(privateKey1, '2021-09-26')
      bc.addTx(lastTx)

      const result = bc.getLastTx()

      assert.deepEqual(result, lastTx)
    })
  })

  describe('load', () => {
    it('Should load directly from object', () => {
      const bc = new Blockchain()
      const blocks = [validBirthBlock(), validInitBlock()]

      bc.load(blocks)

      assert.deepEqual(bc.blocks, blocks)
    })

    it('Should load correctly from binary', () => {
      const bc = validBlockchain()
      const bc2 = new Blockchain()
      const bin = bc.asBinary()

      bc2.load(bin)

      assert.deepEqual(bc2.blocks, bc.blocks)
    })

    it('Should load correctly from b64', () => {
      const bc = validBlockchain()
      const bc2 = new Blockchain()
      const b64 = bc.asB64()

      bc2.load(b64)

      assert.deepEqual(bc2.blocks, bc.blocks)
    })
  })

  describe('makeBirthBlock', () => {
    it('Should return corectly filled block', () => {
      const birthdate = '12/12/2002'

      const block = Blockchain.makeBirthBlock(birthdate, privateKey1)
      delete block.hash

      const expected = {
        version: 1,
        closedate: birthdate,
        previousHash: Blockchain.REF_HASH,
        signer: secp.getPublicKey(privateKey1, true),
        total: 0,
		merkleroot: 0,
        transactions: []
      }

      assert.deepEqual(block, expected)
    })

    it('Should return a signed block', () => {
      const block = Blockchain.makeBirthBlock('12/12/2002', privateKey1)

      const signature = Blockchain.verifyBlock(block, secp.getPublicKey(privateKey1, true))

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
        total: 0
      }

      const expected = hexToBytes('650bd56d968b42f306d369dcabe0623a24e07b305578230b357fd982c6e43c68')

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
        total: 0,
        hash: 12
      }

      const expected = hexToBytes('650bd56d968b42f306d369dcabe0623a24e07b305578230b357fd982c6e43c68')

      const result = Blockchain.hashblock(block)

      assert.deepEqual(result, expected)
    })
  })

  describe('hashtx', () => {
    it('Should make valid hash', () => {
      const tx = {
        version: 1,
        type: Blockchain.TXTYPE.CREATE,
        date: '2010-12-21',
        signer: publicKey1,
        target: publicKey1,
		money: [],
		invests: []
      }

      const expected = hexToBytes('84e87d0b606615c1455df1c12834431195a0480dbc5fe58ef4c7a83d559f60f9')

      const result = Blockchain.hashtx(tx)

      assert.deepEqual(result, expected)
    })

    it('Should ignore existing hash', () => {
      const tx = {
        version: 1,
        total: 0,
        d: '2010-12-21',
        signer: '02e31267fc0e24e6a3da9e40fedb23f98c750bddb3278a1873ab49c601f3bbd66b',
        a: 1,
        h: 12
      }

      const expected = hexToBytes('155df9b6196747e744926feb7d4ca84ea6f911ffa5d41d3488e1d72868fd113f')

      const result = Blockchain.hashtx(tx)

      assert.deepEqual(result, expected)
    })
  })

  describe('signblock', () => {
    it('Should make valid signature', () => {
      const block = {
        version: 1,
        closedate: '28/11/1989',
        previousHash: Blockchain.REF_HASH,
        signer: publicKey1,
        total: 0,
		merkleroot: 0
      }

      const expected = {
        version: 1,
        closedate: '28/11/1989',
        previousHash: Blockchain.REF_HASH,
        signer: publicKey1,
        total: 0,
		merkleroot: 0,
        hash: hexToBytes('30440220368cc9f21933a4e41ac555b22e7f365dc32275c4c3007760954f038b80d285e602201f44e7f715d434f8a1f74d0ac7ae2b5d3891565ec10690ce6c2783e2e049d109')
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

  //describe('isValidInitializationBlock', () => {
  //  it('Should return true for valid block', () => {
  //    const result = Blockchain.isValidInitializationBlock(validInitBlock())

  //    assert.isTrue(result)
  //  })
  //})

  //describe('validateAccount', () => {
  //  it('Should return a 2 blocks long Blockchain', () => {
  //    const result = Blockchain.validateAccount(validBirthBlock(), privateKey2)

  //    assert.equal(result.blocks.length, 2)
  //  })

  //  it('Should return unmodified birth block', () => {
  //    const bb = validBirthBlock()
  //    const result = Blockchain.validateAccount(bb, privateKey2)

  //    assert.equal(result.blocks[1], bb)
  //  })

  //  it('Should return a valid initialization block', () => {
  //    const result = Blockchain.validateAccount(validBirthBlock(), privateKey2)

  //    const pubkey = secp.getPublicKey(privateKey2, true)
  //    assert.ok(Blockchain.verifyBlock(result.blocks[0], pubkey))

  //    delete result.blocks[0].h
  //    console.log(toHex(result.blocks[0].ph))

  //    const expectedInitializationBlock = {
  //      invest: [],
  //      d: new Date().toISOString().slice(0, 10),
  //      money: [],
  //      previousHash: hexToBytes('3045022100f5f0e37b8db1c72e42442a795cb69379d9671bbad25e6013fcea9c7be8a445540220485365844c4416533541b27d0a284bb5b7eaee139f8f919f55723c29c04e6f17'),
  //      signer: hexToBytes('03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46'),
  //      total: 0,
  //      version: 1
  //    }

  //    assert.deepEqual(result.blocks[0], expectedInitializationBlock)
  //  })
  //})

  //describe('getLevel', () => {
  //  it('Should return 0 for empty blockchain', () => {
  //    const bc = new Blockchain()
  //    const result = bc.getLevel()

  //    assert.equal(result, 0)
  //  })

  //  it('Should return 2 for t=1 to 3', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 1
  //    assert.equal(bc.getLevel(), 2)
  //    bc.blocks[0].t = 2
  //    assert.equal(bc.getLevel(), 2)
  //    bc.blocks[0].t = 3
  //    assert.equal(bc.getLevel(), 2)
  //  })
  //})

  //describe('getMoneyBeforeNextLevel', () => {
  //  it('Should return 0 for empty blockchain', () => {
  //    const bc = new Blockchain()
  //    const result = bc.getMoneyBeforeNextLevel()

  //    assert.equal(result, 0)
  //  })

  //  it('Should return 16 for total at 11 (target is 27)', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 11
  //    const result = bc.getMoneyBeforeNextLevel()

  //    assert.equal(result, 16)
  //  })

  //  it('Should return percent if as_percent is true', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 11

  //    const result = bc.getMoneyBeforeNextLevel(true)

  //    assert.equal(result, 15)
  //  })
  //})

  //describe('getAvailableMoneyAmount', () => {
  //  it('Should return 0 for empty blockchain', () => {
  //    const bc = new Blockchain()
  //    const result = bc.getAvailableMoneyAmount()

  //    assert.equal(result, 0)
  //  })

  //  it('Should return 0 for created blockchain', () => {
  //    const bc = new Blockchain([])
  //    const result = bc.getAvailableMoneyAmount()

  //    assert.equal(result, 0)
  //  })

  //  it('Should return 0 for validation waiting blockchain', () => {
  //    const bc = new Blockchain([validBirthBlock()])
  //    const result = bc.getAvailableMoneyAmount()

  //    assert.equal(result, 0)
  //  })

  //  it('Should return last block g for valid blockchain', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    bc.addTx(bc.createMoney(privateKey1, '2021-09-25'))
  //    bc.addTx(bc.createMoney(privateKey1, '2021-09-26'))
  //    const result = bc.getAvailableMoneyAmount()

  //    assert.equal(result, 8)
  //  })
  //})

  //describe('isEmpty', () => {
  //  it('Should return true for empty array', () => {
  //    const bc = new Blockchain([])
  //    const result = bc.isEmpty()

  //    assert.ok(result)
  //  })

  //  it('Should return true for empty blockchain', () => {
  //    const bc = new Blockchain()
  //    const result = bc.isEmpty()

  //    assert.ok(result)
  //  })

  //  it('Should return true for null blockchain', () => {
  //    const bc = new Blockchain(null)
  //    const result = bc.isEmpty()

  //    assert.ok(result)
  //  })
  //})

  //describe('isWaitingValidation', () => {
  //  it('Should return false for empty blockchain', () => {
  //    const bc = new Blockchain()
  //    const result = bc.isWaitingValidation()

  //    assert.isNotOk(result)
  //  })

  //  it('Should return false for only created blockchain', () => {
  //    const bc = new Blockchain([])
  //    const result = bc.isWaitingValidation()

  //    assert.isNotOk(result)
  //  })

  //  it('Should return false totally valid blockchain', () => {
  //    const bc = new Blockchain([validBirthBlock(), validBirthBlock()])
  //    const result = bc.isWaitingValidation()

  //    assert.isNotOk(result)
  //  })

  //  it('Should return false if the block is not a birth one', () => {
  //    const bc = new Blockchain([validInitBlock()])
  //    const result = bc.isWaitingValidation()

  //    assert.isNotOk(result)
  //  })

  //  it('Should return true for blockchain effectively waiting for validation', () => {
  //    const bc = new Blockchain([validBirthBlock()])
  //    const result = bc.isWaitingValidation()

  //    assert.ok(result)
  //  })
  //})

  //describe('isValidated', () => {
  //  it('Should return false for empty blockchain', () => {
  //    const bc = new Blockchain()
  //    const result = bc.isValidated()

  //    assert.isNotOk(result)
  //  })

  //  it('Should return false for only created blockchain', () => {
  //    const bc = new Blockchain([])
  //    const result = bc.isValidated()

  //    assert.isNotOk(result)
  //  })

  //  it('Should return false if the first block is not a birth one', () => {
  //    const bc = new Blockchain([validInitBlock()])
  //    const result = bc.isValidated()

  //    assert.isNotOk(result)
  //  })

  //  it('Should return true totally valid blockchain', () => {
  //    const bc = validBlockchain()
  //    const result = bc.isValidated()

  //    assert.ok(result)
  //  })
  //})

  describe('createMoney', () => {
    it('Should throw error if date is in the futur.', () => {
      const bc = validBlockchain()

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      assert.throws(() => { bc.createMoney(privateKey1, tomorrow) }, 'Cannot create futur money, live in the present.')
    })

    it('Should return blockchain in OK case.', () => {
      const bc = validBlockchain();
      const d = new Date().toISOString().slice(0, 10);
      bc.addTx(bc.createMoney(privateKey1, d));
      const result = bc.blocks[0].transactions[0]

      assert.ok(Blockchain.verifyTx(result, secp.getPublicKey(privateKey1)))
      delete result.hash

      const expected = {
        version: 1,
        type: Blockchain.TXTYPE.CREATE,
        date: d,
        signer: publicKey1,
        target: publicKey1,
        money: [0],
        invests: [0]
      }

      assert.deepEqual(result, expected)
    })

    it('Should create 1+Total^(1/3) Money.', () => {
      const bc = validBlockchain()
      bc.blocks[0].total = 27 // => 3 + 1 Money/day
      bc.addTx(bc.createMoney(privateKey1))
      const result = bc.blocks[0].transactions[0]

      assert.ok(Blockchain.verifyTx(result, secp.getPublicKey(privateKey1)))
      delete result.hash

      const d = new Date().toISOString().slice(0, 10)
      const expected = {
        version: Blockchain.VERSION,
        type: Blockchain.TXTYPE.CREATE,
        date: d,
        signer: publicKey1,
        target: publicKey1,
	    money: [0, 1, 2, 3],
        invests: [0, 1, 2, 3]
      }

      assert.deepEqual(result, expected)
    })
  })

  //describe('getAvailableMoney', () => {
  //  it('Should return {} for new Blockchain.', () => {
  //    const bc = validBlockchain()
  //    const result = bc.getAvailableMoney()

  //    const expected = {}

  //    assert.deepEqual(result, expected)
  //  })

  //  it('Should return each index.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    bc.addTx(bc.createMoney(privateKey1, '2021-09-25'))
  //    const result = bc.getAvailableMoney()

  //    const expected = { '2021-09-25': [0, 1, 2, 3] }

  //    assert.deepEqual(result, expected)
  //  })

  //  it('Should return each date.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    const d1 = '2021-09-23'
  //    const d2 = '2021-09-24'
  //    const d3 = '2021-09-25'
  //    bc.addTx(bc.createMoney(privateKey1, d1))
  //    bc.addTx(bc.createMoney(privateKey1, d2))
  //    bc.addTx(bc.createMoney(privateKey1, d3))
  //    const result = bc.getAvailableMoney()

  //    const expected = {}
  //    expected[d1] = [0, 1, 2, 3]
  //    expected[d2] = [0, 1, 2, 3]
  //    expected[d3] = [0, 1, 2, 3]

  //    assert.deepEqual(result, expected)
  //  })

  //  it('Should return only given amount if given.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    const d = '2021-09-25'
  //    bc.addTx(bc.createMoney(privateKey1, d))
  //    const result = bc.getAvailableMoney(2)

  //    const expected = {}
  //    expected[d] = [0, 1]

  //    assert.deepEqual(result, expected)
  //  })

  //  it('Should return only given amount for complexe cases.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    const d1 = '2021-09-23'
  //    const d2 = '2021-09-24'
  //    const d3 = '2021-09-25'
  //    bc.addTx(bc.createMoney(privateKey1, d1))
  //    bc.addTx(bc.createMoney(privateKey1, d2))
  //    bc.addTx(bc.createMoney(privateKey1, d3))
  //    const result = bc.getAvailableMoney(7)

  //    const expected = {}
  //    expected[d1] = [0, 1, 2, 3]
  //    expected[d2] = [0, 1, 2]

  //    assert.deepEqual(result, expected)
  //  })

  //  it('Should return only unspent Money.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    const d1 = '2021-09-23'
  //    const d2 = '2021-09-24'
  //    const d3 = '2021-09-25'
  //    bc.addTx(bc.createMoney(privateKey1, d1))
  //    bc.addTx(bc.createMoney(privateKey1, d2))
  //    bc.addTx(bc.createMoney(privateKey1, d3))
  //    bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 7))
  //    const result = bc.getAvailableMoney()

  //    const expected = {}
  //    expected[d2] = [3]
  //    expected[d3] = [0, 1, 2, 3]

  //    assert.deepEqual(result, expected)
  //  })
  //})

  //describe('createPaymentTx', () => {
  //  it('Should make valid transaction.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    bc.addTx(bc.createMoney(privateKey1, '2021-09-25'))
  //    bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 3, '2021-09-25'))
  //    const result = bc.blocks[0].transactions[0]

  //    assert.ok(Blockchain.verifyTx(result, secp.getPublicKey(privateKey1)))
  //    delete result.h

  //    const expected = {
  //      a: 3,
  //      d: '2021-09-25',
  //      gp: { '2021-09-25': [0, 1, 2] },
  //      signer: secp.getPublicKey(privateKey1, true),
  //      t: Blockchain.TXTYPE.PAYMENT,
  //      tu: secp.getPublicKey(privateKey2, true),
  //      version: Blockchain.VERSION
  //    }

  //    assert.deepEqual(result, expected)
  //  })
  //})

  //describe('addTx', () => {
  //  it('Should increase g of the block for tx of type guzi creation.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    const d = '2021-09-25'
  //    bc.addTx(bc.createMoney(privateKey1, d))
  //    const result = bc.blocks[0].g
  //    const expected = {}
  //    expected[d] = [0, 1, 2, 3]

  //    assert.deepEqual(result, expected)
  //  })

  //  it('Should decrease g of the block for tx of type payment.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    const d1 = '2021-09-23'
  //    const d2 = '2021-09-24'
  //    const d3 = '2021-09-25'
  //    bc.addTx(bc.createMoney(privateKey1, d1))
  //    bc.addTx(bc.createMoney(privateKey1, d2))
  //    bc.addTx(bc.createMoney(privateKey1, d3))
  //    bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 7))
  //    const result = bc.blocks[0].g
  //    const expected = {}
  //    expected[d2] = [3]
  //    expected[d3] = [0, 1, 2, 3]

  //    assert.deepEqual(result, expected)
  //  })

  //  it('Should increase my total if target is me.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].t = 27
  //    bc.addTx(bc.createMoney(privateKey1, '2021-09-23'))
  //    // TODO : public key must be Uint Array
  //    bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey1, true), 2))
  //    const result = bc.blocks[0].t
  //    const expected = 29

  //    assert.deepEqual(result, expected)
  //  })
  //})

  //describe('hasLevelUpOnLastTx', () => {
  //  it('Should return false if there is no transaction.', () => {
  //    const bc = validBlockchain()

  //    const result = bc.hasLevelUpOnLastTx()

  //    assert.isNotOk(result)
  //  })

  //  it('Should return false if last Transaction did not change level.', () => {
  //    const bc = validBlockchain()
  //    bc.addTx(bc.createMoney(privateKey1, '2021-09-23'))

  //    const result = bc.hasLevelUpOnLastTx()

  //    assert.isNotOk(result)
  //  })

  //  it('Should return true after passed from 26 to 27 Total.', () => {
  //    const bc = validBlockchain()
  //    bc.blocks[0].total = 26
  //    bc.addTx(bc.createMoney(privateKey1, '2021-09-23'))
  //    bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey1, true), 1))

  //    const result = bc.hasLevelUpOnLastTx()

  //    assert.ok(result)
  //  })
  //})

  //describe('aesEncrypt', () => {
  //  it('Should encrypt data correctly.', async () => {
  //    const msg = Blockchain.randomPrivateKey()
  //    const result = await Blockchain.aesEncrypt(msg, 'test_pwd')

  //    assert.property(result, 'msg')
  //    assert.property(result, 'iv')
  //    assert.property(result, 'sha')
  //  })
  //})

  //describe('aesDecrypt', () => {
  //  it('Should decrypt data correctly.', async () => {
  //    const msg = Blockchain.randomPrivateKey()
  //    const encrypted = await Blockchain.aesEncrypt(msg, 'test_pwd')
  //    const result = await Blockchain.aesDecrypt(encrypted, 'test_pwd')

  //    assert.deepEqual(result, msg)
  //  })

  //  it('Should throw error for invalid password.', async () => {
  //    const msg = Blockchain.randomPrivateKey()
  //    const encrypted = await Blockchain.aesEncrypt(msg, 'test_pwd')

  //    let error = null
  //    try {
  //      await Blockchain.aesDecrypt(encrypted, 'wrong_password')
  //    } catch (err) {
  //      error = err
  //    }
  //    assert.typeOf(error, 'Error')
  //    assert.equal(error.message, 'Invalid password')
  //  })
  //})
})
