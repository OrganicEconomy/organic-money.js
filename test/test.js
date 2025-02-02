const { describe, it } = require('mocha')
const Blockchain = require('../index')
const secp = require('ethereum-cryptography/secp256k1')
const { hexToBytes, toHex } = require("ethereum-cryptography/utils");
const assert = require('chai').assert

const privateKey1 = hexToBytes('ed945716dddb7af2c9774939e9946f1fee31f5ec0a3c6ec96059f119c396912f')
const privateKey2 = hexToBytes('e68955130b2c4adc6165b0bae6e6b8f4bcce1879dbf0c6f91b3acc69479ef272')

const validBirthBlock = () => {
  return {
    b: 0,
    d: '28/11/1989',
    g: {},
    h: hexToBytes('3045022100f5f0e37b8db1c72e42442a795cb69379d9671bbad25e6013fcea9c7be8a445540220485365844c4416533541b27d0a284bb5b7eaee139f8f919f55723c29c04e6f17'),
    ph: Blockchain.REF_HASH,
    s: hexToBytes('02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3'),
    t: 0,
    v: 1
  }
}

const validInitBlock = () => {
  return {
    b: 0,
    d: '21/09/2021',
    g: {},
    h: hexToBytes('3044022062d8fcad8687b5b7d3d2a00e342ad6b39b4d54b3eb699a66243f38594afafabb022047a70fb55cac435b1a7ea91931dbe1ec9fdce1a6aa50b09899fa9cc86f939926'),
    ph: hexToBytes('3045022100f5f0e37b8db1c72e42442a795cb69379d9671bbad25e6013fcea9c7be8a445540220485365844c4416533541b27d0a284bb5b7eaee139f8f919f55723c29c04e6f17'),
    s: hexToBytes('02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3'),
    t: 0,
    v: 1
  }
}

const validBlockchain = () => {
  return new Blockchain([validInitBlock(), validBirthBlock()])
}

describe('blockchain', () => {

  describe('asBinary', () => {
    it('Should return binary blockchain... Yes !', () => {
      const bc = validBlockchain()

      const expected = hexToBytes('9288a16200a164aa32312f30392f32303231a16780a168c746123044022062d8fcad8687b5b7d3d2a00e342ad6b39b4d54b3eb699a66243f38594afafabb022047a70fb55cac435b1a7ea91931dbe1ec9fdce1a6aa50b09899fa9cc86f939926a27068c747123045022100f5f0e37b8db1c72e42442a795cb69379d9671bbad25e6013fcea9c7be8a445540220485365844c4416533541b27d0a284bb5b7eaee139f8f919f55723c29c04e6f17a173c7211202c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3a17400a1760188a16200a164aa32382f31312f31393839a16780a168c747123045022100f5f0e37b8db1c72e42442a795cb69379d9671bbad25e6013fcea9c7be8a445540220485365844c4416533541b27d0a284bb5b7eaee139f8f919f55723c29c04e6f17a27068d94063316135353163613163306465656135656665613531623165316465613131326564316465613061353135306635653131616231653530633161313565656435a173c7211202c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3a17400a17601')

      const result = bc.asBinary()

      assert.deepEqual(result, expected)
    })
  })

  describe('asB64', () => {
    it('Should return b64 encoded blockchain...', () => {
      const bc = validBlockchain()

      const expected = 'koihYgChZKoyMS8wOS8yMDIxoWeAoWjHRhIwRAIgYtj8rYaHtbfT0qAONCrWs5tNVLPraZpmJD84WUr6+rsCIEenD7VcrENbGn6pGTHb4eyf3OGmqlCwmJn6nMhvk5kmonBox0cSMEUCIQD18ON7jbHHLkJEKnlctpN52WcbutJeYBP86px76KRFVAIgSFNlhExEFlM1QbJ9CihLtbfq7hOfj5GfVXI8KcBObxehc8chEgLIXk5EjWeo3HJMYg8/59Kjo8zp/pBbkY9xI5a0+O/8s6F0AKF2AYihYgChZKoyOC8xMS8xOTg5oWeAoWjHRxIwRQIhAPXw43uNsccuQkQqeVy2k3nZZxu60l5gE/zqnHvopEVUAiBIU2WETEQWUzVBsn0KKEu1t+ruE5+PkZ9VcjwpwE5vF6JwaNlAYzFhNTUxY2ExYzBkZWVhNWVmZWE1MWIxZTFkZWExMTJlZDFkZWEwYTUxNTBmNWUxMWFiMWU1MGMxYTE1ZWVkNaFzxyESAsheTkSNZ6jcckxiDz/n0qOjzOn+kFuRj3EjlrT47/yzoXQAoXYB'
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
      bc.addTx(bc.createDailyMoneyTx(privateKey1, '2021-09-25'))
      const lastTx = bc.createDailyMoneyTx(privateKey1, '2021-09-26')
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
      delete block.h

      const expected = {
        v: 1,
        d: birthdate,
        ph: Blockchain.REF_HASH,
        s: secp.getPublicKey(privateKey1, true),
        g: {},
        b: 0,
        t: 0
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
        v: 1,
        d: '28/11/1989',
        ph: Blockchain.REF_HASH,
        s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
        g: {},
        b: 0,
        t: 0
      }

      const expected = hexToBytes('ff44d337f401ae1d4398e55f468809f7b14de2995f7d6b20aef2316a576ec19c')

      const result = Blockchain.hashblock(block)

      assert.deepEqual(result, expected)
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

      const expected = hexToBytes('ff44d337f401ae1d4398e55f468809f7b14de2995f7d6b20aef2316a576ec19c')

      const result = Blockchain.hashblock(block)

      assert.deepEqual(result, expected)
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

      const expected = hexToBytes('c5a203d4341ed5e55457208b325db896a8d258811491a2e98b2544852b43dc14')

      const result = Blockchain.hashtx(tx)

      assert.deepEqual(result, expected)
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

      const expected = hexToBytes('c5a203d4341ed5e55457208b325db896a8d258811491a2e98b2544852b43dc14')

      const result = Blockchain.hashtx(tx)

      assert.deepEqual(result, expected)
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
        h: new Uint8Array([48,69,2,33,0,250,143,166,211,148,87,100,155,162,28,202,18,158,198,195,180,27,178,219,180,36,125,212,122,84,145,203,53,103,250,213,211,2,32,67,78,247,7,183,160,68,224,86,70,165,100,68,90,39,158,79,250,183,176,10,150,73,232,162,215,252,225,101,195,168,173])
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

      delete result.blocks[0].h
      console.log(toHex(result.blocks[0].ph))

      const expectedInitializationBlock = {
        b: 0,
        d: new Date().toISOString().slice(0, 10),
        g: {},
        ph: hexToBytes('3045022100f5f0e37b8db1c72e42442a795cb69379d9671bbad25e6013fcea9c7be8a445540220485365844c4416533541b27d0a284bb5b7eaee139f8f919f55723c29c04e6f17'),
        s: hexToBytes('03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46'),
        t: 0,
        v: 1
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

    it('Should return 2 for t=1 to 3', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 1
      assert.equal(bc.getLevel(), 2)
      bc.blocks[0].t = 2
      assert.equal(bc.getLevel(), 2)
      bc.blocks[0].t = 3
      assert.equal(bc.getLevel(), 2)
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
      bc.blocks[0].t = 11
      const result = bc.getMoneyBeforeNextLevel()

      assert.equal(result, 16)
    })

    it('Should return percent if as_percent is true', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 11

      const result = bc.getMoneyBeforeNextLevel(true)

      assert.equal(result, 15)
    })
  })

  describe('getAvailableMoneyAmount', () => {
    it('Should return 0 for empty blockchain', () => {
      const bc = new Blockchain()
      const result = bc.getAvailableMoneyAmount()

      assert.equal(result, 0)
    })

    it('Should return 0 for created blockchain', () => {
      const bc = new Blockchain([])
      const result = bc.getAvailableMoneyAmount()

      assert.equal(result, 0)
    })

    it('Should return 0 for validation waiting blockchain', () => {
      const bc = new Blockchain([validBirthBlock()])
      const result = bc.getAvailableMoneyAmount()

      assert.equal(result, 0)
    })

    it('Should return last block g for valid blockchain', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      bc.addTx(bc.createDailyMoneyTx(privateKey1, '2021-09-25'))
      bc.addTx(bc.createDailyMoneyTx(privateKey1, '2021-09-26'))
      const result = bc.getAvailableMoneyAmount()

      assert.equal(result, 8)
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
  })

  describe('isWaitingValidation', () => {
    it('Should return false for empty blockchain', () => {
      const bc = new Blockchain()
      const result = bc.isWaitingValidation()

      assert.isNotOk(result)
    })

    it('Should return false for only created blockchain', () => {
      const bc = new Blockchain([])
      const result = bc.isWaitingValidation()

      assert.isNotOk(result)
    })

    it('Should return false totally valid blockchain', () => {
      const bc = new Blockchain([validBirthBlock(), validBirthBlock()])
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

    it('Should return false for only created blockchain', () => {
      const bc = new Blockchain([])
      const result = bc.isValidated()

      assert.isNotOk(result)
    })

    it('Should return false if the first block is not a birth one', () => {
      const bc = new Blockchain([validInitBlock()])
      const result = bc.isValidated()

      assert.isNotOk(result)
    })

    it('Should return true totally valid blockchain', () => {
      const bc = validBlockchain()
      const result = bc.isValidated()

      assert.ok(result)
    })
  })

  describe('createDailyMoneyTx', () => {
    it('Should throw error if Money have already been created today.', () => {
      const bc = validBlockchain()
      bc.addTx(bc.createDailyMoneyTx(privateKey1))

      assert.throws(() => { bc.createDailyMoneyTx(privateKey1) }, 'Money already created today')
    })

    it('Should return blockchain in OK case.', () => {
      const bc = validBlockchain()
      bc.addTx(bc.createDailyMoneyTx(privateKey1))
      const result = bc.blocks[0].tx[0]

      assert.ok(Blockchain.verifyTx(result, secp.getPublicKey(privateKey1)))
      delete result.h

      const d = new Date().toISOString().slice(0, 10)
      const expectedGP = {}
      expectedGP[d] = [0]
      const expected = {
        v: 1,
        t: 0,
        d: d,
        s: hexToBytes('02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3'),
        a: 1,
        gp: expectedGP
      }

      assert.deepEqual(result, expected)
    })

    it('Should create 1+Total^(1/3) Money.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27 // => 3 +1 Money/day
      bc.addTx(bc.createDailyMoneyTx(privateKey1))
      const result = bc.blocks[0].tx[0]

      assert.ok(Blockchain.verifyTx(result, secp.getPublicKey(privateKey1)))
      delete result.h

      const d = new Date().toISOString().slice(0, 10)
      const expectedGP = {}
      expectedGP[d] = [0, 1, 2, 3]
      const expected = {
        v: 1,
        t: 0,
        d: d,
        s: hexToBytes('02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3'),
        a: 4,
        gp: expectedGP
      }

      assert.deepEqual(result, expected)
    })
  })

  describe('getAvailableMoney', () => {
    it('Should return {} for new Blockchain.', () => {
      const bc = validBlockchain()
      const result = bc.getAvailableMoney()

      const expected = {}

      assert.deepEqual(result, expected)
    })

    it('Should return each index.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      bc.addTx(bc.createDailyMoneyTx(privateKey1, '2021-09-25'))
      const result = bc.getAvailableMoney()

      const expected = { '2021-09-25': [0, 1, 2, 3] }

      assert.deepEqual(result, expected)
    })

    it('Should return each date.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d1))
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d2))
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d3))
      const result = bc.getAvailableMoney()

      const expected = {}
      expected[d1] = [0, 1, 2, 3]
      expected[d2] = [0, 1, 2, 3]
      expected[d3] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })

    it('Should return only given amount if given.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      const d = '2021-09-25'
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d))
      const result = bc.getAvailableMoney(2)

      const expected = {}
      expected[d] = [0, 1]

      assert.deepEqual(result, expected)
    })

    it('Should return only given amount for complexe cases.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d1))
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d2))
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d3))
      const result = bc.getAvailableMoney(7)

      const expected = {}
      expected[d1] = [0, 1, 2, 3]
      expected[d2] = [0, 1, 2]

      assert.deepEqual(result, expected)
    })

    it('Should return only unspent Money.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d1))
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d2))
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d3))
      bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 7))
      const result = bc.getAvailableMoney()

      const expected = {}
      expected[d2] = [3]
      expected[d3] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })
  })

  describe('createPaymentTx', () => {
    it('Should make valid transaction.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      bc.addTx(bc.createDailyMoneyTx(privateKey1, '2021-09-25'))
      bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 3, '2021-09-25'))
      const result = bc.blocks[0].tx[0]

      assert.ok(Blockchain.verifyTx(result, secp.getPublicKey(privateKey1)))
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
    it('Should increase g of the block for tx of type guzi creation.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      const d = '2021-09-25'
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d))
      const result = bc.blocks[0].g
      const expected = {}
      expected[d] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })

    it('Should decrease g of the block for tx of type payment.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d1))
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d2))
      bc.addTx(bc.createDailyMoneyTx(privateKey1, d3))
      bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 7))
      const result = bc.blocks[0].g
      const expected = {}
      expected[d2] = [3]
      expected[d3] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })

    it('Should increase my total if target is me.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 27
      bc.addTx(bc.createDailyMoneyTx(privateKey1, '2021-09-23'))
      // TODO : public key must be Uint Array
      bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey1, true), 2))
      const result = bc.blocks[0].t
      const expected = 29

      assert.deepEqual(result, expected)
    })
  })

  describe('hasLevelUpOnLastTx', () => {
    it('Should return false if there is no transaction.', () => {
      const bc = validBlockchain()

      const result = bc.hasLevelUpOnLastTx()

      assert.isNotOk(result)
    })

    it('Should return false if last Transaction did not change level.', () => {
      const bc = validBlockchain()
      bc.addTx(bc.createDailyMoneyTx(privateKey1, '2021-09-23'))

      const result = bc.hasLevelUpOnLastTx()

      assert.isNotOk(result)
    })

    it('Should return true after passed from 26 to 27 Total.', () => {
      const bc = validBlockchain()
      bc.blocks[0].t = 26
      bc.addTx(bc.createDailyMoneyTx(privateKey1, '2021-09-23'))
      bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey1, true), 1))

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
})
