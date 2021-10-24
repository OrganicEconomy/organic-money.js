const { describe, it } = require('mocha')
const Blockchain = require('../lib/index')
const secp = require('ethereum-cryptography/secp256k1')
const assert = require('assert')

const privateKey1 = 'ed945716dddb7af2c9774939e9946f1fee31f5ec0a3c6ec96059f119c396912f'
const privateKey2 = 'e68955130b2c4adc6165b0bae6e6b8f4bcce1879dbf0c6f91b3acc69479ef272'

const validBirthBlock = () => {
  return {
    b: 0,
    d: '28/11/1989',
    g: {},
    h: '3046022100a79541ba6261790d13bfaf2d4177a0a645a3baade652bbc31daf0e2b6801300c022100de8f9ad1842e5634dd8027c1e4c90026303f201a00322df4a76e6330943702bb',
    ph: Blockchain.REF_HASH,
    s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
    t: 0,
    v: 1
  }
}

const validInitBlock = () => {
  return {
    b: 0,
    d: '21/09/2021',
    g: {},
    h: '304502202422e7ba167cbe7289051886fd7e9a6957676cde7abba34e3f4ccfa1c7d76437022100bd824547e46638a6d70cbbbaf1f276d639bbb4354ca2461cef1c74db34542c12',
    ph: '3046022100a79541ba6261790d13bfaf2d4177a0a645a3baade652bbc31daf0e2b6801300c022100de8f9ad1842e5634dd8027c1e4c90026303f201a00322df4a76e6330943702bb',
    s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
    t: 0,
    v: 1
  }
}

const validBlockchain = () => {
  return [validInitBlock(), validBirthBlock()]
}

describe('blockchain', () => {
  describe('makeBirthBlock', () => {
    it('Should return corectly filled block', () => {
      const birthdate = '12/12/2002'
      const publicHexKey = '000000000000000000000000000000000000000000000000000000000000000000'

      const block = Blockchain.makeBirthBlock(birthdate, publicHexKey)

      const expected = {
        v: 1,
        d: birthdate,
        ph: Blockchain.REF_HASH,
        s: publicHexKey,
        g: {},
        b: 0,
        t: 0
      }

      assert.deepEqual(block, expected)
    })
  })

  describe('hashblock', () => {
    it('Should make valid hash', () => {
      const block = {
        v: 1,
        d: '28/11/1989',
        ph: Blockchain.REF_HASH,
        s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
        g: {},
        b: 0,
        t: 0
      }

      const expected = 'ff44d337f401ae1d4398e55f468809f7b14de2995f7d6b20aef2316a576ec19c'

      const result = Blockchain.hashblock(block)

      assert.equal(result, expected)
    })

    it('Should ignore existing hash', () => {
      const block = {
        v: 1,
        d: '28/11/1989',
        ph: Blockchain.REF_HASH,
        s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
        g: {},
        b: 0,
        t: 0,
        h: 12
      }

      const expected = 'ff44d337f401ae1d4398e55f468809f7b14de2995f7d6b20aef2316a576ec19c'

      const result = Blockchain.hashblock(block)

      assert.equal(result, expected)
    })
  })

  describe('hashtx', () => {
    it('Should make valid hash', () => {
      const tx = {
        v: 1,
        t: 0,
        d: '2010-12-21',
        s: '02e31267fc0e24e6a3da9e40fedb23f98c750bddb3278a1873ab49c601f3bbd66b',
        a: 1
      }

      const expected = 'c5a203d4341ed5e55457208b325db896a8d258811491a2e98b2544852b43dc14'

      const result = Blockchain.hashtx(tx)

      assert.equal(result, expected)
    })

    it('Should ignore existing hash', () => {
      const tx = {
        v: 1,
        t: 0,
        d: '2010-12-21',
        s: '02e31267fc0e24e6a3da9e40fedb23f98c750bddb3278a1873ab49c601f3bbd66b',
        a: 1,
        h: 12
      }

      const expected = 'c5a203d4341ed5e55457208b325db896a8d258811491a2e98b2544852b43dc14'

      const result = Blockchain.hashtx(tx)

      assert.equal(result, expected)
    })
  })

  describe('signblock', () => {
    it('Should make valid signature', () => {
      const block = {
        v: 1,
        d: '28/11/1989',
        ph: Blockchain.REF_HASH,
        s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
        g: 0,
        b: 0,
        t: 0
      }

      const expected = {
        v: 1,
        d: '28/11/1989',
        ph: Blockchain.REF_HASH,
        s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
        g: 0,
        b: 0,
        t: 0,
        // h: 'cd46dbbf4deef70d7519f3e5dc825311bd0935c958571f87e399a860d1aac5cd',
        h: '3045022100fa8fa6d39457649ba21cca129ec6c3b41bb2dbb4247dd47a5491cb3567fad5d30220434ef707b7a044e05646a564445a279e4ffab7b00a9649e8a2d7fce165c3a8ad'
      }

      const signedBlock = Blockchain.signblock(block, privateKey1)

      assert.deepEqual(signedBlock, expected)
    })
  })

  describe('isValidInitializationBlock', () => {
    it('Should return true for valid block', () => {
      const result = Blockchain.isValidInitializationBlock(validBirthBlock())

      assert.ok(result)
    })
  })

  describe('validateAccount', () => {
    it('Should return a 2 blocks long Blockchain', async () => {
      const result = Blockchain.validateAccount(validBirthBlock(), privateKey2)

      assert.equal(result.length, 2)
    })

    it('Should return unmodified birth block', () => {
      const bb = validBirthBlock()
      const result = Blockchain.validateAccount(bb, privateKey2)

      assert.equal(result[1], bb)
    })

    it('Should return a valid initialization block', async () => {
      const result = Blockchain.validateAccount(validBirthBlock(), privateKey2)

      assert.ok(secp.verify(Blockchain.hashblock(result[0]), result[0].h, secp.getPublicKey(privateKey2, true)))

      delete result[0].h

      const expectedInitializationBlock = {
        b: 0,
        d: new Date().toISOString().slice(0, 10),
        g: {},
        ph: '3046022100a79541ba6261790d13bfaf2d4177a0a645a3baade652bbc31daf0e2b6801300c022100de8f9ad1842e5634dd8027c1e4c90026303f201a00322df4a76e6330943702bb',
        s: '03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46',
        t: 0,
        v: 1
      }

      assert.deepEqual(result[0], expectedInitializationBlock)
    })
  })

  describe('getLevel', () => {
    it('Should return 0 for empty blockchain', () => {
      const bc = new Blockchain()
      const result = bc.getLevel()

      assert.equal(result, 0)
    })
    it('Should return 2 for t=1 to 3', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 1
      assert.equal(bc.getLevel(), 2)
      bc.blocks[0].t = 2
      assert.equal(bc.getLevel(), 2)
      bc.blocks[0].t = 3
      assert.equal(bc.getLevel(), 2)
    })
  })

  describe('getGuzisBeforeNextLevel', () => {
    it('Should return 0 for empty blockchain', () => {
      const bc = new Blockchain()
      const result = bc.getGuzisBeforeNextLevel()

      assert.equal(result, 0)
    })

    it('Should return 16 for total at 11 (target is 27)', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 11
      const result = bc.getGuzisBeforeNextLevel()

      assert.equal(result, 16)
    })

    it('Should return percent if as_percent is true', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 11

      const result = bc.getGuzisBeforeNextLevel(true)

      // TODO
      assert.equal(result, 15)
    })
  })

  describe('getGuzis', () => {
    it('Should return 0 for empty blockchain', () => {
      const bc = new Blockchain()
      const result = bc.getGuzis()

      assert.equal(result, 0)
    })

    it('Should return 0 for created blockchain', () => {
      const bc = new Blockchain([])
      const result = bc.getGuzis()

      assert.equal(result, 0)
    })

    it('Should return 0 for validation waiting blockchain', () => {
      const bc = new Blockchain([validBirthBlock()])
      const result = bc.getGuzis()

      assert.equal(result, 0)
    })

    it('Should return last block g for valid blockchain', async () => {
      const bc = new Blockchain([validInitBlock(), validBirthBlock()])
      bc.blocks[0].t = 27
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, '2021-09-25'))
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, '2021-09-26'))
      const result = bc.getGuzis()

      assert.equal(result, 8)
    })
  })

  describe('isEmpty', () => {
    it('Should return false for empty array', () => {
      const bc = new Blockchain([])
      const result = bc.isEmpty()

      assert.false(result)
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
  })

  describe('isCreated', () => {
    it('Should return false for null blockchain', () => {
      const bc = new Blockchain()
      const result = bc.isCreated()

      assert.false(result)
    })

    it('Should return false for blockchain waiting for validation', () => {
      const bc = new Blockchain([validBirthBlock()])
      const result = bc.isCreated()

      assert.false(result)
    })

    it('Should return true for valid blockchain', () => {
      const bc = new Blockchain([])
      const result = bc.isCreated()

      assert.ok(result)
    })
  })

  describe('isWaitingValidation', () => {
    it('Should return false for empty blockchain', () => {
      const bc = new Blockchain()
      const result = bc.isWaitingValidation()

      assert.false(result)
    })

    it('Should return false for only created blockchain', () => {
      const bc = new Blockchain([])
      const result = bc.isWaitingValidation()

      assert.false(result)
    })

    it('Should return false totally valid blockchain', () => {
      const bc = new Blockchain([validBirthBlock(), validBirthBlock()])
      const result = bc.isWaitingValidation()

      assert.false(result)
    })

    it('Should return false if the block is not a birth one', () => {
      const bc = new Blockchain([validInitBlock()])
      const result = bc.isWaitingValidation()

      assert.false(result)
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

      assert.false(result)
    })

    it('Should return false for only created blockchain', () => {
      const bc = new Blockchain([])
      const result = bc.isValidated()

      assert.false(result)
    })

    it('Should return false if the first block is not a birth one', () => {
      const bc = new Blockchain([validInitBlock(), validInitBlock()])
      const result = bc.isValidated()

      assert.false(result)
    })

    it('Should return true totally valid blockchain', () => {
      const bc = new Blockchain([validInitBlock(), validBirthBlock()])
      const result = bc.isValidated()

      assert.ok(result)
    })
  })

  describe('createDailyGuzis', () => {
    it('Should return null if Guzis have already been created today.', async () => {
      const bc = new Blockchain(validBlockchain())
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1))
      const result = await bc.createDailyGuzisTx(privateKey1)

      assert.notOk(result)
    })

    it('Should return blockchain in OK case.', async () => {
      const bc = new Blockchain(validBlockchain())
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1))
      const result = bc.blocks[0].tx[0]

      assert.ok(secp.verify(Blockchain.hashtx(result), result.h, secp.getPublicKey(privateKey1)))
      delete result.h

      const d = new Date().toISOString().slice(0, 10)
      const expectedGP = {}
      expectedGP[d] = [0]
      const expected = {
        v: 1,
        t: 0,
        d: d,
        s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
        a: 1,
        gp: expectedGP
      }

      assert.deepEqual(result, expected)
    })

    it('Should create 1+Total^(1/3) Guzis.', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27 // => 3 +1 Guzi/day
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1))
      const result = bc.blocks[0].tx[0]

      assert.ok(secp.verify(Blockchain.hashtx(result), result.h, secp.getPublicKey(privateKey1)))
      delete result.h

      const d = new Date().toISOString().slice(0, 10)
      const expectedGP = {}
      expectedGP[d] = [0, 1, 2, 3]
      const expected = {
        v: 1,
        t: 0,
        d: d,
        s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
        a: 4,
        gp: expectedGP
      }

      assert.deepEqual(result, expected)
    })
  })

  describe('getAvailableGuzis', () => {
    it('Should return {} for new Blockchain.', async () => {
      const bc = new Blockchain(validBlockchain())
      const result = bc.getAvailableGuzis()

      const expected = {}

      assert.deepEqual(result, expected)
    })

    it('Should return each index.', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, '2021-09-25'))
      const result = bc.getAvailableGuzis()

      const expected = { '2021-09-25': [0, 1, 2, 3] }

      assert.deepEqual(result, expected)
    })

    it('Should return each date.', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d1))
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d2))
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d3))
      const result = bc.getAvailableGuzis()

      const expected = {}
      expected[d1] = [0, 1, 2, 3]
      expected[d2] = [0, 1, 2, 3]
      expected[d3] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })

    it('Should return only given amount if given.', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d = '2021-09-25'
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d))
      const result = bc.getAvailableGuzis(2)

      const expected = {}
      expected[d] = [0, 1]

      assert.deepEqual(result, expected)
    })

    it('Should return only given amount for complexe cases.', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d1))
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d2))
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d3))
      const result = bc.getAvailableGuzis(7)

      const expected = {}
      expected[d1] = [0, 1, 2, 3]
      expected[d2] = [0, 1, 2]

      assert.deepEqual(result, expected)
    })

    it('Should return only unspent Guzis.', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d1))
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d2))
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d3))
      const contacts = [{ id: 0, key: secp.getPublicKey(privateKey1, true) }]
      await bc.addTx(await bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 7), contacts)
      const result = bc.getAvailableGuzis()

      const expected = {}
      expected[d2] = [3]
      expected[d3] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })
  })

  describe('createPaymentTx', () => {
    it('Should make valid transaction.', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, '2021-09-25'))
      const contacts = [{ id: 0, key: secp.getPublicKey(privateKey1, true) }]
      await bc.addTx(await bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 3, '2021-09-25'), contacts)
      const result = bc.blocks[0].tx[0]

      assert.ok(secp.verify(Blockchain.hashtx(result), result.h, secp.getPublicKey(privateKey1)))
      delete result.h

      const expected = {
        a: 3,
        d: '2021-09-25',
        gp: { '2021-09-25': [0, 1, 2] },
        s: secp.getPublicKey(privateKey1, true),
        t: Blockchain.TXTYPE.PAYMENT,
        tu: secp.getPublicKey(privateKey2, true),
        v: Blockchain.VERSION
      }

      assert.deepEqual(result, expected)
    })
  })

  describe('addTx', () => {
    it('Should increase g of the block for tx of type guzi creation.', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d = '2021-09-25'
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d))
      const result = bc.blocks[0].g
      const expected = {}
      expected[d] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })

    it('Should decrease g of the block for tx of type payment.', async () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d1))
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d2))
      await bc.addTx(await bc.createDailyGuzisTx(privateKey1, d3))
      const contacts = [{ id: 0, key: secp.getPublicKey(privateKey1, true) }]
      await bc.addTx(await bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 7), contacts)
      const result = bc.blocks[0].g
      const expected = {}
      expected[d2] = [3]
      expected[d3] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })
  })
})
