const { describe, it } = require('mocha')
const Blockchain = require('../index')
const secp = require('ethereum-cryptography/secp256k1')
const assert = require('chai').assert

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

function hexToBytes (hex) {
  const bytes = []
  for (let c = 0; c < hex.length; c += 2) { bytes.push(parseInt(hex.substr(c, 2), 16)) }
  return Uint8Array.from(bytes)
}

describe('blockchain', () => {

  describe('asBinary', () => {
    it('Should return binary blockchain... Yes !', () => {
      const bc = new Blockchain(validBlockchain())

      const expected = new Uint8Array([146, 136, 161, 98, 0, 161, 100, 170, 50, 49, 47, 48, 57, 47, 50, 48, 50, 49, 161, 103, 128, 161, 104, 217, 142, 51, 48, 52, 53, 48, 50, 50, 48, 50, 52, 50, 50, 101, 55, 98, 97, 49, 54, 55, 99, 98, 101, 55, 50, 56, 57, 48, 53, 49, 56, 56, 54, 102, 100, 55, 101, 57, 97, 54, 57, 53, 55, 54, 55, 54, 99, 100, 101, 55, 97, 98, 98, 97, 51, 52, 101, 51, 102, 52, 99, 99, 102, 97, 49, 99, 55, 100, 55, 54, 52, 51, 55, 48, 50, 50, 49, 48, 48, 98, 100, 56, 50, 52, 53, 52, 55, 101, 52, 54, 54, 51, 56, 97, 54, 100, 55, 48, 99, 98, 98, 98, 97, 102, 49, 102, 50, 55, 54, 100, 54, 51, 57, 98, 98, 98, 52, 51, 53, 52, 99, 97, 50, 52, 54, 49, 99, 101, 102, 49, 99, 55, 52, 100, 98, 51, 52, 53, 52, 50, 99, 49, 50, 162, 112, 104, 217, 144, 51, 48, 52, 54, 48, 50, 50, 49, 48, 48, 97, 55, 57, 53, 52, 49, 98, 97, 54, 50, 54, 49, 55, 57, 48, 100, 49, 51, 98, 102, 97, 102, 50, 100, 52, 49, 55, 55, 97, 48, 97, 54, 52, 53, 97, 51, 98, 97, 97, 100, 101, 54, 53, 50, 98, 98, 99, 51, 49, 100, 97, 102, 48, 101, 50, 98, 54, 56, 48, 49, 51, 48, 48, 99, 48, 50, 50, 49, 48, 48, 100, 101, 56, 102, 57, 97, 100, 49, 56, 52, 50, 101, 53, 54, 51, 52, 100, 100, 56, 48, 50, 55, 99, 49, 101, 52, 99, 57, 48, 48, 50, 54, 51, 48, 51, 102, 50, 48, 49, 97, 48, 48, 51, 50, 50, 100, 102, 52, 97, 55, 54, 101, 54, 51, 51, 48, 57, 52, 51, 55, 48, 50, 98, 98, 161, 115, 217, 66, 48, 50, 99, 56, 53, 101, 52, 101, 52, 52, 56, 100, 54, 55, 97, 56, 100, 99, 55, 50, 52, 99, 54, 50, 48, 102, 51, 102, 101, 55, 100, 50, 97, 51, 97, 51, 99, 99, 101, 57, 102, 101, 57, 48, 53, 98, 57, 49, 56, 102, 55, 49, 50, 51, 57, 54, 98, 52, 102, 56, 101, 102, 102, 99, 98, 51, 161, 116, 0, 161, 118, 1, 136, 161, 98, 0, 161, 100, 170, 50, 56, 47, 49, 49, 47, 49, 57, 56, 57, 161, 103, 128, 161, 104, 217, 144, 51, 48, 52, 54, 48, 50, 50, 49, 48, 48, 97, 55, 57, 53, 52, 49, 98, 97, 54, 50, 54, 49, 55, 57, 48, 100, 49, 51, 98, 102, 97, 102, 50, 100, 52, 49, 55, 55, 97, 48, 97, 54, 52, 53, 97, 51, 98, 97, 97, 100, 101, 54, 53, 50, 98, 98, 99, 51, 49, 100, 97, 102, 48, 101, 50, 98, 54, 56, 48, 49, 51, 48, 48, 99, 48, 50, 50, 49, 48, 48, 100, 101, 56, 102, 57, 97, 100, 49, 56, 52, 50, 101, 53, 54, 51, 52, 100, 100, 56, 48, 50, 55, 99, 49, 101, 52, 99, 57, 48, 48, 50, 54, 51, 48, 51, 102, 50, 48, 49, 97, 48, 48, 51, 50, 50, 100, 102, 52, 97, 55, 54, 101, 54, 51, 51, 48, 57, 52, 51, 55, 48, 50, 98, 98, 162, 112, 104, 217, 64, 99, 49, 97, 53, 53, 49, 99, 97, 49, 99, 48, 100, 101, 101, 97, 53, 101, 102, 101, 97, 53, 49, 98, 49, 101, 49, 100, 101, 97, 49, 49, 50, 101, 100, 49, 100, 101, 97, 48, 97, 53, 49, 53, 48, 102, 53, 101, 49, 49, 97, 98, 49, 101, 53, 48, 99, 49, 97, 49, 53, 101, 101, 100, 53, 161, 115, 217, 66, 48, 50, 99, 56, 53, 101, 52, 101, 52, 52, 56, 100, 54, 55, 97, 56, 100, 99, 55, 50, 52, 99, 54, 50, 48, 102, 51, 102, 101, 55, 100, 50, 97, 51, 97, 51, 99, 99, 101, 57, 102, 101, 57, 48, 53, 98, 57, 49, 56, 102, 55, 49, 50, 51, 57, 54, 98, 52, 102, 56, 101, 102, 102, 99, 98, 51, 161, 116, 0, 161, 118, 1])
      const result = bc.asBinary()

      assert.deepEqual(result, expected)
    })
  })

  describe('asB64', () => {
    it('Should return b64 encoded blockchain...', () => {
      const bc = new Blockchain(validBlockchain())

      const expected = 'koihYgChZKoyMS8wOS8yMDIxoWeAoWjZjjMwNDUwMjIwMjQyMmU3YmExNjdjYmU3Mjg5MDUxODg2ZmQ3ZTlhNjk1NzY3NmNkZTdhYmJhMzRlM2Y0Y2NmYTFjN2Q3NjQzNzAyMjEwMGJkODI0NTQ3ZTQ2NjM4YTZkNzBjYmJiYWYxZjI3NmQ2MzliYmI0MzU0Y2EyNDYxY2VmMWM3NGRiMzQ1NDJjMTKicGjZkDMwNDYwMjIxMDBhNzk1NDFiYTYyNjE3OTBkMTNiZmFmMmQ0MTc3YTBhNjQ1YTNiYWFkZTY1MmJiYzMxZGFmMGUyYjY4MDEzMDBjMDIyMTAwZGU4ZjlhZDE4NDJlNTYzNGRkODAyN2MxZTRjOTAwMjYzMDNmMjAxYTAwMzIyZGY0YTc2ZTYzMzA5NDM3MDJiYqFz2UIwMmM4NWU0ZTQ0OGQ2N2E4ZGM3MjRjNjIwZjNmZTdkMmEzYTNjY2U5ZmU5MDViOTE4ZjcxMjM5NmI0ZjhlZmZjYjOhdAChdgGIoWIAoWSqMjgvMTEvMTk4OaFngKFo2ZAzMDQ2MDIyMTAwYTc5NTQxYmE2MjYxNzkwZDEzYmZhZjJkNDE3N2EwYTY0NWEzYmFhZGU2NTJiYmMzMWRhZjBlMmI2ODAxMzAwYzAyMjEwMGRlOGY5YWQxODQyZTU2MzRkZDgwMjdjMWU0YzkwMDI2MzAzZjIwMWEwMDMyMmRmNGE3NmU2MzMwOTQzNzAyYmKicGjZQGMxYTU1MWNhMWMwZGVlYTVlZmVhNTFiMWUxZGVhMTEyZWQxZGVhMGE1MTUwZjVlMTFhYjFlNTBjMWExNWVlZDWhc9lCMDJjODVlNGU0NDhkNjdhOGRjNzI0YzYyMGYzZmU3ZDJhM2EzY2NlOWZlOTA1YjkxOGY3MTIzOTZiNGY4ZWZmY2IzoXQAoXYB'
      const result = bc.asB64()

      assert.deepEqual(result, expected)
    })
  })

  describe('getLastTx', () => {
    it('Should return the lastly added Transaction', () => {
      const bc = new Blockchain(validBlockchain())
      bc.addTx(bc.createDailyGuzisTx(privateKey1, '2021-09-25'))
      const lastTx = bc.createDailyGuzisTx(privateKey1, '2021-09-26')
      bc.addTx(lastTx)

      const result = bc.getLastTx()

      assert.deepEqual(result, lastTx)
    })
  })

  describe('load', () => {
    it('Should load directly from object', () => {
      const bc = new Blockchain()
      const blocks = validBlockchain()

      bc.load(blocks)

      assert.deepEqual(bc.blocks, blocks)
    })

    it('Should load correctly from binary', () => {
      const bc = new Blockchain(validBlockchain())
      const bc2 = new Blockchain()
      const bin = bc.asBinary()

      bc2.load(bin)

      assert.deepEqual(bc2.blocks, bc.blocks)
    })

    it('Should load correctly from b64', () => {
      const bc = new Blockchain(validBlockchain())
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

  describe('isValidInitializationBlock', () => {
    it('Should return true for valid block', () => {
      const result = Blockchain.isValidInitializationBlock(validBirthBlock())

      assert.ok(result)
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

      const expectedInitializationBlock = {
        b: 0,
        d: new Date().toISOString().slice(0, 10),
        g: {},
        ph: '3046022100a79541ba6261790d13bfaf2d4177a0a645a3baade652bbc31daf0e2b6801300c022100de8f9ad1842e5634dd8027c1e4c90026303f201a00322df4a76e6330943702bb',
        s: '03cbe4edbfbbc99dfbae83e8c591fafdd6a82d61589be6f60775e3fe2a4677ef46',
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

    it('Should return percent if as_percent is true', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 11

      const result = bc.getGuzisBeforeNextLevel(true)

      assert.equal(result, 15)
    })
  })

  describe('getAvailableGuziAmount', () => {
    it('Should return 0 for empty blockchain', () => {
      const bc = new Blockchain()
      const result = bc.getAvailableGuziAmount()

      assert.equal(result, 0)
    })

    it('Should return 0 for created blockchain', () => {
      const bc = new Blockchain([])
      const result = bc.getAvailableGuziAmount()

      assert.equal(result, 0)
    })

    it('Should return 0 for validation waiting blockchain', () => {
      const bc = new Blockchain([validBirthBlock()])
      const result = bc.getAvailableGuziAmount()

      assert.equal(result, 0)
    })

    it('Should return last block g for valid blockchain', () => {
      const bc = new Blockchain([validInitBlock(), validBirthBlock()])
      bc.blocks[0].t = 27
      bc.addTx(bc.createDailyGuzisTx(privateKey1, '2021-09-25'))
      bc.addTx(bc.createDailyGuzisTx(privateKey1, '2021-09-26'))
      const result = bc.getAvailableGuziAmount()

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
      const bc = new Blockchain([validInitBlock(), validInitBlock()])
      const result = bc.isValidated()

      assert.isNotOk(result)
    })

    it('Should return true totally valid blockchain', () => {
      const bc = new Blockchain([validInitBlock(), validBirthBlock()])
      const result = bc.isValidated()

      assert.ok(result)
    })
  })

  describe('createDailyGuzisTx', () => {
    it('Should throw error if Guzis have already been created today.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.addTx(bc.createDailyGuzisTx(privateKey1))

      assert.throws(() => { bc.createDailyGuzisTx(privateKey1) }, 'Guzis already created today')
    })

    it('Should return blockchain in OK case.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.addTx(bc.createDailyGuzisTx(privateKey1))
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
        s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
        a: 1,
        gp: expectedGP
      }

      assert.deepEqual(result, expected)
    })

    it('Should create 1+Total^(1/3) Guzis.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27 // => 3 +1 Guzi/day
      bc.addTx(bc.createDailyGuzisTx(privateKey1))
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
        s: '02c85e4e448d67a8dc724c620f3fe7d2a3a3cce9fe905b918f712396b4f8effcb3',
        a: 4,
        gp: expectedGP
      }

      assert.deepEqual(result, expected)
    })
  })

  describe('getAvailableGuzis', () => {
    it('Should return {} for new Blockchain.', () => {
      const bc = new Blockchain(validBlockchain())
      const result = bc.getAvailableGuzis()

      const expected = {}

      assert.deepEqual(result, expected)
    })

    it('Should return each index.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      bc.addTx(bc.createDailyGuzisTx(privateKey1, '2021-09-25'))
      const result = bc.getAvailableGuzis()

      const expected = { '2021-09-25': [0, 1, 2, 3] }

      assert.deepEqual(result, expected)
    })

    it('Should return each date.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d1))
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d2))
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d3))
      const result = bc.getAvailableGuzis()

      const expected = {}
      expected[d1] = [0, 1, 2, 3]
      expected[d2] = [0, 1, 2, 3]
      expected[d3] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })

    it('Should return only given amount if given.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d = '2021-09-25'
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d))
      const result = bc.getAvailableGuzis(2)

      const expected = {}
      expected[d] = [0, 1]

      assert.deepEqual(result, expected)
    })

    it('Should return only given amount for complexe cases.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d1))
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d2))
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d3))
      const result = bc.getAvailableGuzis(7)

      const expected = {}
      expected[d1] = [0, 1, 2, 3]
      expected[d2] = [0, 1, 2]

      assert.deepEqual(result, expected)
    })

    it('Should return only unspent Guzis.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d1))
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d2))
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d3))
      bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 7))
      const result = bc.getAvailableGuzis()

      const expected = {}
      expected[d2] = [3]
      expected[d3] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })
  })

  describe('createPaymentTx', () => {
    it('Should make valid transaction.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      bc.addTx(bc.createDailyGuzisTx(privateKey1, '2021-09-25'))
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
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d = '2021-09-25'
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d))
      const result = bc.blocks[0].g
      const expected = {}
      expected[d] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })

    it('Should decrease g of the block for tx of type payment.', () => {
      const bc = new Blockchain(validBlockchain())
      bc.blocks[0].t = 27
      const d1 = '2021-09-23'
      const d2 = '2021-09-24'
      const d3 = '2021-09-25'
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d1))
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d2))
      bc.addTx(bc.createDailyGuzisTx(privateKey1, d3))
      bc.addTx(bc.createPaymentTx(privateKey1, secp.getPublicKey(privateKey2, true), 7))
      const result = bc.blocks[0].g
      const expected = {}
      expected[d2] = [3]
      expected[d3] = [0, 1, 2, 3]

      assert.deepEqual(result, expected)
    })
  })
})
