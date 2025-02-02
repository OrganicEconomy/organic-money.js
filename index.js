const { Base64 } = require('js-base64')
const { sha256 } = require('ethereum-cryptography/sha256')
const { scryptSync } = require("ethereum-cryptography/scrypt");
const { utf8ToBytes, toHex } = require("ethereum-cryptography/utils");
const secp = require('ethereum-cryptography/secp256k1')
const { encrypt, decrypt } = require("ethereum-cryptography/aes");
const { getRandomBytesSync } = require("ethereum-cryptography/random");
const msgpack = require('msgpack-lite')

class Blockchain {
  static get IV () { return utf8ToBytes('thisisnounique') }
  static get REF_HASH () { return 'c1a551ca1c0deea5efea51b1e1dea112ed1dea0a5150f5e11ab1e50c1a15eed5' }
  static get VERSION () { return 1 }

  static get TXTYPE () {
    return {
      MONEY_CREATE: 0,
      INVEST_CREATE: 1,
      PAYMENT: 2,
      MONEY_ENGAGEMENT: 3,
      INVEST_ENGAGEMENT: 4,
      PAY_ORDER: 10,
      ACTOR_SET: 11,
    }
  }

  static randomPrivateKey () {
    return secp.utils.randomPrivateKey()
  }

  static async aesEncrypt (msg, pwd) {
    const key = scryptSync(utf8ToBytes(pwd), utf8ToBytes("salt"), 2048, 8, 1, 16)
    const iv = getRandomBytesSync(16)
    msg = await encrypt(msg, key, iv)
    return { msg, iv, sha: sha256(utf8ToBytes(pwd)) }
  }

  static async aesDecrypt (encrypted, pwd) {
    if (JSON.stringify(sha256(utf8ToBytes(pwd))) !== JSON.stringify(encrypted.sha)) {
      throw new Error('Invalid password')
    }
    const key = scryptSync(utf8ToBytes(pwd), utf8ToBytes("salt"), 2048, 8, 1, 16)
    return await decrypt(encrypted.msg, key, encrypted.iv)
  }

  static publicFromPrivate (privateKey) {
    return secp.getPublicKey(privateKey, true)
  }

  constructor (blocks = []) {
    if (blocks === null) {
      blocks = []
    }
    this.load(blocks)
  }

  /**
   * Load the given blocks into the Blockchain
   * blocks can be Array of blocks
   * or the binary encoded array of blocks
   */
  load (blocks) {
    if (Object.prototype.toString.call(blocks) == '[object Array]') {
      // Here it's directly an Array
      this.bks = blocks
    } else {
      try {
        // Here it's binary
        this.bks = msgpack.decode(blocks)
      } catch (e) {
        // Here it's binary encoded as B64 (for sending)
        const binary = Base64.toUint8Array(blocks)
        this.bks = msgpack.decode(binary)
      }
    }
  }

  isValid () {
    return this.isValidBlockchain(this)
  }

  /**
   * Return the lastly added Transaction
   */
  getLastTx () {
    if (this.getHistory().length === 0) {
      return null
    }
    return this.bks[0].tx[0]
  }

  /**
   * Return true if given blockchain is a valid one :
   * - signatures are ok
   * - created Money are ok
   * - spended Money are ok
   * - referent is known
   * Return false else
   * TODO !
   */
  static isValidBlockchain (bc) {
    return true
  }

  /**
   * Return the level of the Blockchain
   * The level is equal to the number of Money (and Boxes) created
   * each day
   */
  getLevel () {
    if (this.isEmpty() && !this.isValidated()) { return 0 }
    return Math.floor(Math.cbrt(this.bks[0].t)) + 1
  }

  /**
   * If as_percent is true, return the percentage of Money already
   * made before the next level.
   * If Blockchain is invalid, return 0
   */
  getMoneyBeforeNextLevel (asPercent = false) {
    if (this.isEmpty() || !this.isValidated()) { return 0 }
    const level = this.getLevel()
    if (asPercent) {
      return Math.floor(100 * (1 - this.getMoneyBeforeNextLevel() / (Math.pow(level, 3) - Math.pow(level - 1, 3))))
    }
    return Math.pow(level, 3) - this.bks[0].t
  }

  /**
   * Return the amount of Money available in the Blockchain
   * If Blockchain is invalid, return 0
   */
  getAvailableMoneyAmount () {
    if (this.isEmpty() || this.isWaitingValidation()) {
      return 0
    }
    let res = 0
    Object.keys(this.bks[0].g).forEach(key => {
      res += this.bks[0].g[key].length
    })

    return res
  }

  /**
   * Return true if the Blockchain has no block in it
   */
  isEmpty () {
    return this.bks.length === 0
  }

  /**
   * Return true if the Blockchain has only one Block
   * which is a Birth Block
   */
  isWaitingValidation () {
    return this.bks.length === 1 &&
      this.bks[0].ph === Blockchain.REF_HASH
  }

  /**
   * Return true if the Blockchain has been validated by
   * a referent
   */
  isValidated () {
    return !this.isEmpty() && this.bks.length >= 2 &&
      this.bks[this.bks.length - 1].ph === Blockchain.REF_HASH
  }

  /**
   * Return the transaction that creates daily Money for the Blockchain.
   * If d is not given, uses today's date.
   * raise an error if Money has already been created at the given date.
   */
  createDailyMoneyTx (key, d = null) {
    if (this.hasCreatedMoneyToday()) {
      throw new Error('Money already created today')
    }
    d = d || new Date().toISOString().slice(0, 10)
    const amount = this.getLevel()
    const gp = {}
    gp[d] = [...Array(amount).keys()]
    const tx = {
      v: Blockchain.VERSION,
      t: Blockchain.TXTYPE.MONEY_CREATE,
      d: d,
      s: secp.getPublicKey(key, true),
      a: amount,
      gp: gp
    }
    return Blockchain.signtx(tx, key)
  }

  /**
   * Return the list of all available Money
   * If amount > 0, return only this amount of Money
   *
   */
  getAvailableMoney (amount = -1) {
    if (amount < 0) {
      return this.bks[0].g
    }
    const result = {}
    Object.keys(this.bks[0].g).forEach(k => {
      if (this.bks[0].g[k].length <= amount) {
        result[k] = this.bks[0].g[k]
        amount -= this.bks[0].g[k].length
      } else if (amount > 0 && this.bks[0].g[k].length > amount) {
        result[k] = this.bks[0].g[k].slice(0, amount)
        amount = 0
      }
    })
    return result
  }

  /**
   * Remove given money from the available ones.
   * That means those Money have been spended.
   */
  removeMoneyFromAvailable (money) {
    const result = {}
    Object.keys(this.bks[0].g).forEach(k => {
      if (!money[k]) {
        result[k] = this.bks[0].g[k]
      } else if (money[k] && money[k].length < this.bks[0].g[k].length) {
        result[k] = this.bks[0].g[k].slice(money[k].length, this.bks[0].g[k].length)
      }
    })
    return result
  }

  /**
   * Return the transaction holding the payment with :
   *    - key to sign the tx
   *    - target pubkey
   *    - given amount
   * Throws an error if Blockchain can't afford it
   */
  createPaymentTx (key, target, amount, d = null) {
    if (this.getAvailableMoneyAmount() < amount) {
      throw new Error('Insufficient funds')
    }
    d = d || new Date().toISOString().slice(0, 10)
    const tx = {
      a: amount,
      d: d,
      gp: this.getAvailableMoney(amount),
      s: secp.getPublicKey(key, true),
      t: 2,
      tu: target,
      v: Blockchain.VERSION
    }

    return Blockchain.signtx(tx, key)
  }

  /**
   * Add given transaction to the Blockchain
   * and update Blockchain data depending on it
   */
  addTx (tx) {
    if (this.bks[0].s !== undefined) {
      this.newBlock()
    }
    if (tx.t === Blockchain.TXTYPE.MONEY_CREATE) {
      this.bks[0].g = Object.assign(this.bks[0].g, tx.gp)
    }
    if (tx.t === Blockchain.TXTYPE.PAYMENT) {
      const myPrivateKey = this.bks[this.bks.length-1].s
      if (toHex(tx.s) === toHex(myPrivateKey)) {
        this.bks[0].g = this.removeMoneyFromAvailable(tx.gp)
      }
      if (toHex(tx.tu) === toHex(myPrivateKey)) {
        let toadd = 0
        Object.keys(tx.gp).forEach(key => {
          toadd += tx.gp[key].length
        })
        this.bks[0].t += toadd
      }
    }
    this.bks[0].tx.unshift(tx)
  }

  /**
   * Create a new block and add it to the Blockchain
   */
  newBlock () {
    this.bks.unshift({
      v: Blockchain.VERSION,
      ph: this.bks[0].ph,
      g: this.bks[0].g,
      b: this.bks[0].b,
      t: this.bks[0].t,
      tx: []
    })
  }

  /**
   * Return true if Money have already been created today
   */
  hasCreatedMoneyToday () {
    for (let i = 0; i < this.bks.length; i++) {
      if (this.bks[i].d !== undefined && new Date(this.bks[i].d) < new Date()) {
        return false
      }
      if (this.bks[i].tx !== undefined) {
        for (let t = 0; t < this.bks[i].tx.length; t++) {
          if (this.bks[i].tx[t].d === new Date().toISOString().slice(0, 10) && this.bks[i].tx[t].t === Blockchain.TXTYPE.MONEY_CREATE) {
            return true
          }
        }
      }
    }
    return null
  }

  /**
   * Return true if the last Transaction added made the Blockchain
   * level up
   */
  hasLevelUpOnLastTx () {
    if (this.getLastTx() === null) {
      return null
    }
    if (this.getLastTx().t != Blockchain.TXTYPE.PAYMENT) {
      return false
    }
    return Math.floor(Math.cbrt(this.bks[0].t - this.getLastTx().a)) + 1 < this.getLevel()
  }

  /**
   * Return the blocks of the Blockchain as an Uint8Array
   */
  asBinary () {
    return new Uint8Array(msgpack.encode(this.bks))
  }

  /**
   * Return the blocks of the Blockchain as a b64 string
   */
  asB64 () {
    return Base64.fromUint8Array(this.asBinary())
  }

  /**
   * Return the birthblock based on given informations
   */
  static makeBirthBlock (birthdate, privKey) {
    const block = {
      v: Blockchain.VERSION, // Version
      d: birthdate, // User birth date
      ph: Blockchain.REF_HASH, // Previous hash : here 'random'
      s: secp.getPublicKey(privKey, true), // Compressed Signer public key, here the new one created
      g: {},
      b: 0,
      t: 0 // 0 money, 0 boxes, 0 total
    }
    return this.signblock(block, privKey)
  }

  /**
   * Return the hash of given Block
   */
  static hashblock (block) {
    const b = {
      v: block.v,
      d: block.d,
      ph: block.ph,
      s: block.s,
      g: block.g,
      b: block.b,
      t: block.t
    }
    const packedblock = msgpack.encode(b)
    return sha256(packedblock)
  }

  /**
   * Return the hash of given Transaction
   */
  static hashtx (tx) {
    const t = {
      a: tx.a, // amount
      d: tx.d, // date
      gp: tx.gp, // Money
      s: tx.s, // Signer
      t: tx.t, // Transaction Type
      tu: tx.tu, // Target User
      v: tx.v // Version
    }
    const packedtx = msgpack.encode(t)
    return sha256(packedtx)
  }

  /**
   * Sign the given block with given private key
   */
  static signblock (block, privateKey) {
    const hash = Blockchain.hashblock(block)
    const bytes = secp.signSync(hash, privateKey)
    block.h = bytes
    return block
  }

  /**
   * Sign the given transaction with given private key
   */
  static signtx (tx, privateKey) {
    const hash = Blockchain.hashtx(tx)
    const bytes = secp.signSync(hash, privateKey)
    tx.h = bytes
    return tx
  }

  /**
   * Return true if given Block has valid signature
   */
  static verifyBlock (block, pubkey) {
    const hash = this.hashblock(block)
    const hashInBlock = block.h

    return secp.verify(
      hashInBlock,
      hash,
      pubkey
    )
  }

  /**
   * Return true if given Transaction has valid signature
   */
  static verifyTx (tx, pubkey) {
    const hash = this.hashtx(tx)
    const hashInTx = tx.h

    return secp.verify(
      hashInTx,
      hash,
      pubkey
    )
  }

  /**
   * Return true if given Block is a valid Birth one
   */
  static isValidBirthBlock (block) {
    const signature = block.h
    const messageHash = Blockchain.hashblock(block)
    const publicKey = block.s

    return block.ph === Blockchain.REF_HASH &&
      block.v === Blockchain.VERSION &&
      JSON.stringify(block.g) === JSON.stringify({}) &&
      block.b === 0 &&
      block.t === 0 &&
      secp.verify(signature, messageHash, publicKey)
  }

  /**
   * Return true if given Block is a valid Birth one
   */
  static isValidInitializationBlock (block) {
    const signature = block.h
    const messageHash = Blockchain.hashblock(block)
    const publicKey = block.s

    return block.v === Blockchain.VERSION &&
      JSON.stringify(block.g) === JSON.stringify({}) &&
      block.b === 0 &&
      block.t === 0 &&
      secp.verify(signature, messageHash, publicKey)
  }

  /**
   * Return the whole history of transactions
   */
  getHistory () {
    const result = []
    this.bks.forEach(block => {
      if (block.tx) {
        block.tx.forEach(tx => {
          result.push(tx)
        })
      }
    })
    return result
  }

  /**
   * Return a validated Blockchain for given birthblock
   */
  static validateAccount (birthblock, key) {
    let initializationBlock = {
      b: 0,
      d: new Date().toISOString().slice(0, 10),
      g: {},
      ph: birthblock.h,
      s: secp.getPublicKey(key, true),
      t: Blockchain.TXTYPE.MONEY_CREATE,
      v: Blockchain.VERSION
    }
    initializationBlock = Blockchain.signblock(initializationBlock, key)
    return new Blockchain([initializationBlock, birthblock])
  }

  get blocks () {
    return this.bks
  }

  set blocks (b) {
    this.bks = b
  }
}
module.exports = Blockchain
