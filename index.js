const { Base64 } = require('js-base64')
const { sha256 } = require('ethereum-cryptography/sha256')
const { scryptSync } = require("ethereum-cryptography/scrypt");
const { utf8ToBytes, toHex, hexToBytes } = require("ethereum-cryptography/utils");
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
      CREATE: 0,
      PAY: 1,
      ENGAGE: 2
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
      this.blocks = blocks
    } else {
      try {
        // Here it's binary
        this.blocks = msgpack.decode(blocks)
      } catch (e) {
        // Here it's binary encoded as B64 (for sending)
        const binary = Base64.toUint8Array(blocks)
        this.blocks = msgpack.decode(binary)
      }
    }
	if (this.blocks.length === 0 || this.blocks[0].version) {
		return;
	}
    for (let i = 0; i < this.blocks.length; i++) {
		this.blocks[i] = {
			version: this.blocks[i].v,
			closedate: this.blocks[i].d,
			previousHash: this.blocks[i].p,
			signer: this.blocks[i].s,
			merkleroot: this.blocks[i].r,
			total: this.blocks[i].t,
			money: this.blocks[i].m,
			invests: this.blocks[i].i,
			transactions: [] || this.blocks[i].x,
			hash: this.blocks[i].h
		}
		for (let j = 0; j < this.blocks[i].transactions; j++) {
            this.blocks[i].transactions[j] = {
				version: this.blocks[i].transaction[j].v,
				type: this.blocks[i].transaction[j].t,
				date: this.blocks[i].transaction[j].d,
				signer: this.blocks[i].transaction[j].s,
				target: this.blocks[i].transaction[j].t,
				money: this.blocks[i].transaction[j].m,
				invests: this.blocks[i].transaction[j].i
			}
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
    return this.blocks[0].transactions[0]
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
    return Math.floor(Math.cbrt(this.blocks[0].total)) + 1
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
    return Math.pow(level, 3) - this.blocks[0].total
  }

  /**
   * Return the amount of Money available in the Blockchain
   * If Blockchain is invalid, return 0
   */
  getAvailableMoneyAmount () {
    if (this.isEmpty() || this.isWaitingValidation()) {
      return 0
    }
    return this.blocks[0].money.length;
  }

  /**
   * Return true if the Blockchain has no block in it
   */
  isEmpty () {
    return this.blocks.length === 0
  }

  /**
   * Return true if the Blockchain has only one Block
   * which is a Birth Block
   */
  isWaitingValidation () {
    return this.blocks.length === 1 &&
      this.blocks[0].previousHash === Blockchain.REF_HASH
  }

  /**
   * Return true if the Blockchain has been validated by
   * a referent
   */
  isValidated () {
    return !this.isEmpty() && this.blocks.length >= 2 &&
      this.blocks[this.blocks.length - 1].previousHash === Blockchain.REF_HASH
  }

  /**
   * Return the last transaction in the blockchain that have the
   * type CREATE
   */
  getLastCreationTransaction () {
	  for (let block of this.blocks) {
		  for (let tx of block.transactions) {
			  if (tx.type === Blockchain.TXTYPE.CREATE) {
				  return tx;
			  }
		  }
	  }
	  return null;
  }

  /**
   * Add and return the transaction that creates Money for the Blockchain.
   * If d is not given, uses today's date.
   * Creates money from last date it was created until d.
   * if Money has already been created at the given date, create none and return null.
   * Throw an error if d is in the futur. You cannot create futur money.
   *
   */
  createMoney (key, d = new Date()) {
    var lastdate, index;

    const today = new Date();
    if (d.getTime() > today.getTime()) {
      throw new Error('Cannot create futur money, live in the present.')
    }
    const lastCreationTx = this.getLastCreationTransaction();
	if (lastCreationTx) {
		lastdate = new Date(lastCreationTx.date);
		lastdate.setDate(lastdate.getDate() + 1);
		index = lastCreationTx.money[lastCreationTx.money.length - 1] + 1;
	} else {
		lastdate = new Date(d);
		index = 0;
	}
    if (new Date(lastdate) > today) {
        // return null;
	}
    const amount = this.getLevel()
    const moneys = [];

    while (lastdate <= d) {
		for (let i = 0; i < amount; i++) {
		    moneys.push(index);
			index += 1;
		}
		lastdate.setDate(lastdate.getDate() + 1);
	}

    const transaction = {
      version: Blockchain.VERSION,
      type: Blockchain.TXTYPE.CREATE,
      date: d.toISOString().slice(0, 10),
      signer: secp.getPublicKey(key, true),
      target: secp.getPublicKey(key, true),
      money: moneys,
      invests: moneys,
    }
    const result = Blockchain.signtx(transaction, key)
    this.addTx(result);
    return result;
  }

  /**
   * Return the list of all available Money
   * If amount > 0, return only this amount of Money
   *
   */
  getAvailableMoney (amount = -1) {
    if (amount < 0) {
      return this.blocks[0].money
    }
	
    return this.blocks[0].money.slice(0, amount)
  }

  /**
   * Remove given money from the available ones.
   * That means those Money have been spended.
   */
  removeMoneyFromAvailable (money) {
    const result = {}
    Object.keys(this.blocks[0].g).forEach(k => {
      if (!money[k]) {
        result[k] = this.blocks[0].g[k]
      } else if (money[k] && money[k].length < this.blocks[0].g[k].length) {
        result[k] = this.blocks[0].g[k].slice(money[k].length, this.blocks[0].g[k].length)
      }
    })
    return result
  }

  /**
   * Return the transaction holding the payment with :
   *    - key to sign the transaction
   *    - target pubkey
   *    - given amount
   * Throws an error if Blockchain can't afford it
   */
  createPaymentTx (key, target, amount, d = null) {
    if (this.getAvailableMoneyAmount() < amount) {
      throw new Error('Insufficient funds')
    }
    d = d || new Date()
    const transaction = {
      type: Blockchain.TXTYPE.PAYMENT,
      date: d.toISOString().slice(0, 10),
      money: this.getAvailableMoney(amount),
      signer: secp.getPublicKey(key, true),
      invests: [],
      target: target,
      version: Blockchain.VERSION
    }

    return Blockchain.signtx(transaction, key)
  }

  /**
   * Add given transaction to the Blockchain
   * and update Blockchain data depending on it
   * TODO remove check if it's from me as i should be the only one
   * who can spend my money so spending transactions should already
   * be here.
   */
  addTx (transaction) {
    if (this.blocks[0].signer !== undefined) {
      this.newBlock()
    }
    if (transaction.type === Blockchain.TXTYPE.CREATE) {
      this.blocks[0].money = this.blocks[0].money.concat(transaction.money);
      this.blocks[0].invests = this.blocks[0].invests.concat(transaction.invests);
    }
    if (transaction.type === Blockchain.TXTYPE.PAY) {
      const myPrivateKey = this.blocks[this.blocks.length-1].s
      if (toHex(transaction.s) === toHex(myPrivateKey)) {
        this.blocks[0].g = this.removeMoneyFromAvailable(transaction.gp)
      }
      if (toHex(transaction.tu) === toHex(myPrivateKey)) {
        let toadd = 0
        Object.keys(transaction.gp).forEach(key => {
          toadd += transaction.gp[key].length
        })
        this.blocks[0].t += toadd
      }
    }
    this.blocks[0].transactions.unshift(transaction)
  }

  /**
   * Create a new block and add it to the Blockchain
   */
  newBlock () {
    this.blocks.unshift({
      closedate: null,
      version: Blockchain.VERSION,
      previousHash: this.blocks[0].hash,
      money: this.blocks[0].money,
      invests: this.blocks[0].invests,
      total: this.blocks[0].total,
      merkleroot: 0,
      signer: null,
      transactions: []
    })
  }

  /**
   * Return true if the last Transaction added made the Blockchain
   * level up
   */
  hasLevelUpOnLastTx () {
    if (this.getLastTx() === null) {
      return null
    }
    if (this.getLastTx().type != Blockchain.TXTYPE.PAY) {
      return false
    }
    return Math.floor(Math.cbrt(this.blocks[0].total - this.getLastTx().a)) + 1 < this.getLevel()
  }

  asLightChain () {
    const lightchain = [];
    this.blocks.forEach(block => {
		lightchain.push({
		  v: block.version,
		  d: block.closedate,
		  p: block.previousHash,
		  s: block.signer,
		  r: block.merkleroot,
		  m: block.money,
		  i: block.invests,
		  t: block.total,
		  h: block.hash
        })
	});
    return lightchain;
  }

  /**
   * Return the blocks of the Blockchain as an Uint8Array
   */
  // asBinary () {
  //   const lightchain = this.asLightChain();
  //   return new Uint8Array(msgpack.encode(lightchain))
  // }

  /**
   * Return the blocks of the Blockchain as a b64 string
   */
  // asB64 () {
  //   return Base64.fromUint8Array(this.asBinary())
  // }

  /**
   * Return the birthblock based on given informations
   */
  static makeBirthBlock (birthdate, privKey) {
    const block = {
      version: Blockchain.VERSION,
      closedate: birthdate,
      previousHash: Blockchain.REF_HASH, // Previous hash : here 'random'
      signer: secp.getPublicKey(privKey, true), // Compressed Signer public key, here the new one created
      merkleroot: 0,
      money: [],
      invests: [],
      total: 0,
      transactions: []
    }
    return this.signblock(block, privKey)
  }

  /**
   * Return the hash of given Block
   */
  static hashblock (block) {
    const b = {
      v: block.version,
      d: block.closedate,
      p: block.previousHash,
      s: block.signer,
      r: block.merkleroot,
      m: block.money,
      i: block.invests,
      t: block.total
    }
    const packedblock = msgpack.encode(b)
    return sha256(packedblock)
  }

  /**
   * Return the hash of given Transaction
   */
  static hashtx (transaction) {
    const tx = {
      d: transaction.date,
      m: transaction.money,
      i: transaction.invests,
      s: transaction.signer,
      t: transaction.type,
      p: transaction.target,
      v: transaction.version
    }
    const packedtx = msgpack.encode(tx)
    return sha256(packedtx)
  }

  /**
   * Sign the given block with given private key
   */
  static signblock (block, privateKeyAsHex) {
    const privateKey = hexToBytes(privateKeyAsHex)
    const hash = Blockchain.hashblock(block)
    const bytes = secp.signSync(hash, privateKey)
    block.hash = toHex(bytes)
    return block
  }

  /**
   * Sign the given transaction with given private key
   */
  static signtx (transaction, privateKeyAsHex) {
    const privateKey = hexToBytes(privateKeyAsHex)
    const hash = Blockchain.hashtx(transaction)
    const bytes = secp.signSync(hash, privateKey)
    transaction.hash = toHex(bytes)
    return transaction
  }

  /**
   * Return true if given Block has valid signature
   */
  static verifyBlock (block, pubkey) {
    const hash = this.hashblock(block)
    const hashInBlock = block.hash

    return secp.verify(
      hashInBlock,
      hash,
      pubkey
    )
  }

  /**
   * Return true if given Transaction has valid signature
   */
  static verifyTx (transaction, pubkey) {
    const hash = this.hashtx(transaction)
    const hashInTx = transaction.hash

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
    const signature = block.hash
    const messageHash = Blockchain.hashblock(block)
    const publicKey = block.signer

    return block.previousHash === Blockchain.REF_HASH &&
      block.version === Blockchain.VERSION &&
      block.transactions.length === 0 &&
      block.merkleroot === 0 &&
      block.money.length === 0 &&
      block.invests.length === 0 &&
      block.total === 0 &&
      secp.verify(signature, messageHash, publicKey)
  }

  /**
   * Return true if given Block is a valid Birth one
   */
  static isValidInitializationBlock (block) {
    const signature = block.hash
    const messageHash = Blockchain.hashblock(block)
    const publicKey = block.signer

    return block.version === Blockchain.VERSION &&
      block.transactions.length === 0 &&
      block.merkleroot === 0 &&
      block.money.length === 0 &&
      block.invests.length === 0 &&
      block.total === 0 &&
      secp.verify(signature, messageHash, publicKey)
  }

  /**
   * Return the whole history of transactions
   */
  getHistory () {
    const result = []
    this.blocks.forEach(block => {
      if (block.transactions) {
        block.transactions.forEach(tx => {
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
      closedate: new Date().toISOString().slice(0, 10),
      previousHash: birthblock.hash,
      signer: secp.getPublicKey(key, true),
      merkleroot: 0,
      money: [],
      invests: [],
      total: 0,
      transactions: [],
      version: Blockchain.VERSION
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
