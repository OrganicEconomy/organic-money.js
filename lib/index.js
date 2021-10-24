const { sha256 } = require('ethereum-cryptography/sha256')
const secp = require('ethereum-cryptography/secp256k1')
const msgpack = require('msgpack-lite')

class Blockchain {
  static get REF_HASH () { return 'c1a551ca1c0deea5efea51b1e1dea112ed1dea0a5150f5e11ab1e50c1a15eed5' }
  static get VERSION () { return 1 }
  static get MSG () {
    return {
      VALIDATION_DEMAND: 'dv',
      VALIDATION_ACCEPT: 'av',
      PAYMENT: 'p',
      PAYMENT_REFUSED: 'pr',
      SIGN_DEMAND: 'ds',
      SIGN_ACCEPT: 'as'
    }
  }

  static get TXTYPE () {
    return {
      GUZI_CREATE: 0,
      GUZIBOX_CREATE: 1,
      PAYMENT: 2,
      GUZI_ENGAGEMENT: 3,
      GUZIBOX_ENGAGEMENT: 4,
      REFUSAL: 5,
      OWNER_SET: 10,
      ADMIN_SET: 11,
      WORKER_SET: 12,
      PAYER_SET: 13,
      PAY_ORDER: 14,
      LEAVE_ORDER: 15
    }
  }

  constructor (blocks=[]) {
    this.blocks = blocks
  }

  load (blocks) {
    this.blocks = blocks
  }

  /**
   * Return true if the blockchain is a valid one
   * Return false else
   */
  isValid () {
    return true
  }

  getLevel () {
    if (!this.isCreated() && !this.isValidated()) { return 0 }
    return Math.floor(Math.cbrt(this.blocks[0].t)) + 1
  }

  /**
   * If as_percent is true, return the percentage of Guzis already
   * made before the next level.
   */
  getGuzisBeforeNextLevel (asPercent = false) {
    if (!this.isCreated() && !this.isValidated()) { return 0 }
    const level = this.getLevel()
    if (asPercent) {
      return Math.floor(100 * (1 - this.getGuzisBeforeNextLevel() / (Math.pow(level, 3) - Math.pow(level - 1, 3))))
    }
    return Math.pow(level, 3) - this.blocks[0].t
  }

  getGuzis () {
    if (this.isEmpty() || this.isCreated() || this.isWaitingValidation()) {
      return 0
    }
    let res = 0
    Object.keys(this.blocks[0].g).forEach(key => {
      res += this.blocks[0].g[key].length
    })

    return res
  }

  isEmpty () {
    return this.length === undefined
  }

  isCreated () {
    return !this.isEmpty() && this.length === 0
  }

  isWaitingValidation () {
    return !this.isEmpty() && this.length === 1 &&
      this.blocks[0].ph === Blockchain.REF_HASH
  }

  isValidated () {
    return !this.isEmpty() && this.length >= 2 &&
      this.blocks[this.length - 1].ph === Blockchain.REF_HASH
  }

  async createDailyGuzisTx (key, d = null) {
    if (this.hasCreatedGuzisToday()) {
      throw new Error('Guzis already created today')
    }
    d = d || new Date().toISOString().slice(0, 10)
    const amount = this.getLevel()
    const gp = {}
    gp[d] = [...Array(amount).keys()]
    const tx = {
      v: Blockchain.VERSION,
      t: Blockchain.TXTYPE.GUZI_CREATE,
      d: d,
      s: secp.getPublicKey(key, true),
      a: amount,
      gp: gp
    }
    return await this.signtx(tx, key)
  }

  getAvailableGuzis (amount = -1) {
    if (amount < 0) {
      return this.blocks[0].g
    }
    const result = {}
    Object.keys(this.blocks[0].g).forEach(k => {
      if (this.blocks[0].g[k].length <= amount) {
        result[k] = this.blocks[0].g[k]
        amount -= this.blocks[0].g[k].length
      } else if (amount > 0 && this.blocks[0].g[k].length > amount) {
        result[k] = this.blocks[0].g[k].slice(0, amount)
        amount = 0
      }
    })
    return result
  }

  removeGuzisFromAvailable (guzis) {
    const result = {}
    Object.keys(this.blocks[0].g).forEach(k => {
      if (!guzis[k]) {
        result[k] = this.blocks[0].g[k]
      } else if (guzis[k] && guzis[k].length < this.blocks[0].g[k].length) {
        result[k] = this.blocks[0].g[k].slice(guzis[k].length, this.blocks[0].g[k].length)
      }
    })
    return result
  }

  async createPaymentTx (key, target, amount, d = null) {
    if (this.getGuzis() < amount) {
      throw new Error('Insufficient funds')
    }
    d = d || new Date().toISOString().slice(0, 10)
    const tx = {
      a: amount,
      d: d,
      gp: this.getAvailableGuzis(amount),
      s: secp.getPublicKey(key, true),
      t: 2,
      tu: target,
      v: Blockchain.VERSION
    }

    return await this.signtx(tx, key)
  }

  addTx (tx, contacts) {
    if (this.blocks[0].s !== undefined) {
      this.newBlock()
    }
    if (tx.t === Blockchain.TXTYPE.GUZI_CREATE) {
      this.blocks[0].g = Object.assign(this.blocks[0].g, tx.gp)
    }
    if (tx.t === Blockchain.TXTYPE.PAYMENT) {
      const me = contacts.find(c => c.id === 0)
      if (tx.s === me.key) {
        this.blocks[0].g = this.removeGuzisFromAvailable(tx.gp)
      }
      if (tx.tu === me.key) {
        let toadd = 0
        Object.keys(tx.gp).forEach(key => {
          toadd += tx.gp[key].length
        })
        this.blocks[0].t += toadd
      }
    }
    this.blocks[0].tx.unshift(tx)
  }

  newBlock () {
    this.blocks.unshift({
      v: Blockchain.VERSION,
      ph: this.blocks[0].ph,
      g: this.blocks[0].g,
      b: this.blocks[0].b,
      t: this.blocks[0].t,
      tx: []
    })
  }

  hasCreatedGuzisToday () {
    for (let i = 0; i < this.length; i++) {
      if (this.blocks[i].d !== undefined && new Date(this.blocks[i].d) < new Date()) {
        return false
      }
      if (this.blocks[i].tx !== undefined) {
        for (let t = 0; t < this.blocks[i].tx.length; t++) {
          if (this.blocks[i].tx[t].d === new Date().toISOString().slice(0, 10) && this.blocks[i].tx[t].t === Blockchain.TXTYPE.GUZI_CREATE) {
            return true
          }
        }
      }
    }
    return null
  }

  toHexString (byteArray) {
    return Array.from(byteArray, function (byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2)
    }).join('')
  }

  hexToBytes (hex) {
    const bytes = []
    for (let c = 0; c < hex.length; c += 2) { bytes.push(parseInt(hex.substr(c, 2), 16)) }
    return bytes
  }

  hexToJson (hex) {
    const bytes = this.hexToBytes(hex)
    return msgpack.decode(bytes)
  }

  static makeBirthBlock (birthdate, publicHexKey) {
    return {
      v: Blockchain.VERSION, // Version
      d: birthdate, // User birth date
      ph: Blockchain.REF_HASH, // Previous hash : here 'random'
      s: publicHexKey, // Compressed Signer public key, here the new one created
      g: {},
      b: 0,
      t: 0 // 0 guzis, 0 boxes, 0 total
    }
  }

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

  static hashtx (tx) {
    const t = {
      a: tx.a, // amount
      d: tx.d, // date
      gp: tx.gp, // Guzis
      s: tx.s, // Signer
      t: tx.t, // Transaction Type
      tu: tx.tu, // Target User
      v: tx.v // Version
    }
    const packedtx = msgpack.encode(t)
    return sha256(packedtx)
  }

  static signblock (block, privateKey) {
    const hash = Blockchain.hashblock(block)
    block.h = secp.signSync(hash, privateKey)
    return block
  }

  signtx (tx, privateKey) {
    const hash = Blockchain.hashtx(tx)
    tx.h = secp.signSync(hash, privateKey)
    return tx
  }

  static isValidInitializationBlock (block) {
    const signature = block.h
    const messageHash = Blockchain.hashblock(block)
    const publicKey = block.s

    return block.ph === Blockchain.REF_HASH &&
      block.v === 1 &&
      JSON.stringify(block.g) === JSON.stringify({}) &&
      block.b === 0 &&
      block.t === 0 &&
      secp.verify(signature, messageHash, publicKey)
  }

  // TODO : make a 'history' method
  async showHistoryModal () {
    const result = []
    this.blocks.forEach(block => {
      if (block.tx) {
        block.tx.forEach(tx => {
          result.append(tx)
        })
      }
    })
    return result
  }

  static validateAccount (birthblock, key) {
    let initializationBlock = {
      b: 0,
      d: new Date().toISOString().slice(0, 10),
      g: {},
      ph: birthblock.h,
      s: secp.getPublicKey(key, true),
      t: Blockchain.TXTYPE.GUZI_CREATE,
      v: Blockchain.VERSION
    }
    initializationBlock = Blockchain.signblock(initializationBlock, key)
    return [initializationBlock, birthblock]
  }

  get blocks () {
    return this.bks
  }
  
  set blocks(b) {
    this.bks = b
  }
}
module.exports = Blockchain
