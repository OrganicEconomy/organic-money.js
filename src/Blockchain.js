import { Base64 } from 'js-base64'
import { sha256 } from 'ethereum-cryptography/sha256.js'
import { scryptSync } from 'ethereum-cryptography/scrypt.js'
import { utf8ToBytes, toHex, hexToBytes } from 'ethereum-cryptography/utils.js'
import { utils, getPublicKey, signSync, verify } from 'ethereum-cryptography/secp256k1.js'
import { encrypt, decrypt } from 'ethereum-cryptography/aes.js'
import { getRandomBytesSync } from 'ethereum-cryptography/random.js'
import { encode, decode } from 'msgpack-lite'
import { MerkleTree } from 'merkletreejs'
import { InvalidTransactionError, UnauthorizedError} from './errors.js'

export class Blockchain {
	/***********************************************************************
	 *                              CONSTANTS
	 **********************************************************************/
	static get REF_HASH() { return 'c1a551ca1c0deea5efea51b1e1dea112ed1dea0a5150f5e11ab1e50c1a15eed5' }
	static get ECOREF_HASH() { return 'ec051c1a551ca1c0deea5efea51b1e1dea112ed1dea0a5150f5e11ab1e50c1a1' }
	static get VERSION() { return 1 }

	static get TXTYPE() {
		return {
			INIT: 0,
			CREATE: 1,
			PAY: 2,
			ENGAGE: 3,
			PAPER: 4,
			SETADMIN: 5,
			SETACTOR: 6,
			SETPAYER: 7
		}
	}

	/***********************************************************************
	 *                           STATIC METHODS
	 **********************************************************************/
	static randomPrivateKey() {
		return toHex(utils.randomPrivateKey())
	}

	static async aesEncrypt(msg, pwd) {
		const key = scryptSync(utf8ToBytes(pwd), utf8ToBytes("salt"), 2048, 8, 1, 16)
		const iv = getRandomBytesSync(16)
		msg = await encrypt(msg, key, iv)
		return { msg, iv, sha: sha256(utf8ToBytes(pwd)) }
	}

	static async aesDecrypt(encrypted, pwd) {
		if (JSON.stringify(sha256(utf8ToBytes(pwd))) !== JSON.stringify(encrypted.sha)) {
			throw new Error('Invalid password')
		}
		const key = scryptSync(utf8ToBytes(pwd), utf8ToBytes("salt"), 2048, 8, 1, 16)
		return await decrypt(encrypted.msg, key, encrypted.iv)
	}

	static publicFromPrivate(privateKey) {
		return toHex(getPublicKey(privateKey, true))
	}

	static dateToInt(date) {
		return +('' + date.getFullYear() + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2))
	}

	static intToDate(dateint) {
		const datestr = '' + dateint
		return new Date(datestr.slice(0, 4) + '-' + datestr.slice(4, 6) + '-' + datestr.slice(6, 8))
	}

	static intToIndex(dateint) {
		const datestr = '' + dateint
		return +datestr.slice(-3)
	}

	static formatMoneyIndex(date, index) {
		return +('' + Blockchain.dateToInt(date) + ("00" + index).slice(-3))
	}

	static formatInvestIndex(date, index) {
		return +('' + Blockchain.dateToInt(date) + '9' + ("00" + index).slice(-3))
	}

	static buildInvestIndexes(date, level) {
		const result = []
		for (let i = 0; i < level; i++) {
			result.push(Blockchain.formatInvestIndex(date, i))
		}
		return result
	}

	static buildMoneyIndexes(date, level) {
		const result = []
		for (let i = 0; i < level; i++) {
			result.push(Blockchain.formatMoneyIndex(date, i))
		}
		return result
	}

	/**
	 * Return the hash of given Block
	 */
	static hashblock(block) {
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
		const packedblock = encode(b)
		return sha256(packedblock)
	}

	/**
	 * Return the hash of given Transaction
	 */
	static hashtx(transaction) {
		const tx = {
			d: transaction.date,
			m: transaction.money,
			i: transaction.invests,
			s: transaction.signer,
			t: transaction.type,
			p: transaction.target,
			v: transaction.version
		}
		const packedtx = encode(tx)
		return sha256(packedtx)
	}

	/**
	 * Calculate the merkle root of the given block and updates it
	 * Return the block
	 */
	static merkleBlock(block) {
		const leaves = block.transactions.map(x => x.hash)
		const tree = new MerkleTree(leaves, sha256)
		const root = tree.getRoot().toString('hex')
		block.merkleroot = root
		return block
	}

	/**
	 * Sign the given block with given private key
	 */
	static signblock(block, privateKeyAsHex) {
		const privateKey = hexToBytes(privateKeyAsHex)
		const hash = Blockchain.hashblock(block)
		const bytes = signSync(hash, privateKey)
		block.hash = toHex(bytes)
		return block
	}

	/**
	 * Sign the given transaction with given private key
	 * Return the transaction
	 */
	static signtx(transaction, privateKeyAsHex) {
		const privateKey = hexToBytes(privateKeyAsHex)
		const hash = Blockchain.hashtx(transaction)
		const bytes = signSync(hash, privateKey)
		transaction.hash = toHex(bytes)
		return transaction
	}

	/**
	 * Return true if given Block has valid signature
	 * Return false else
	 */
	static isValidBlock(block, pk = null) {
		pk = pk || block.signer || block.source
		const hash = this.hashblock(block)
		const signature = block.hash

		return verify(
			signature,
			hash,
			pk
		)
	}

	/**
	 * Return true if given Block is a valid Birth one
	 */
	static isValidBirthBlock(block) {
		const signature = block.hash
		const messageHash = Blockchain.hashblock(block)
		const publicKey = block.signer

		for (let t of block.transactions) {
			if (!Blockchain.isValidTransaction(t)) {
				return false;
			}
		}

		return block.previousHash === Blockchain.REF_HASH &&
			block.version === Blockchain.VERSION &&
			block.transactions.length === 2 &&
			block.merkleroot === 0 &&
			block.money.length === 1 &&
			block.invests.length === 1 &&
			block.total === 0 &&
			verify(signature, messageHash, publicKey)
	}

	/**
	 * Return true if given Block is a valid Initialization one
	 */
	static isValidInitializationBlock(block) {
		const signature = block.hash
		const messageHash = Blockchain.hashblock(block)
		const publicKey = block.signer

		return block.version === Blockchain.VERSION &&
			block.transactions.length === 0 &&
			block.merkleroot === 0 &&
			block.money.length === 1 &&
			block.invests.length === 1 &&
			block.total === 0 &&
			verify(signature, messageHash, publicKey)
	}

	/**
	 * Return true if given transaction has all it's fields
	 * and is correctly signed
	 * Return false else
	 */
	static isValidTransaction(tx) {
		const txHash = Blockchain.hashtx(tx)

		if (!tx.source) {
			return false
		}

		return tx.version === Blockchain.VERSION &&
			tx.date > 0 &&
			tx.source.length === 66 &&
			Object.prototype.toString.call(tx.money) == '[object Array]' &&
			Object.prototype.toString.call(tx.invests) == '[object Array]' &&
			Object.values(Blockchain.TXTYPE).indexOf(tx.type) > -1 &&
			verify(tx.hash, txHash, tx.source)
	}

	/***********************************************************************
	 *                      BASE METHODS AND GETTERS
	 **********************************************************************/

	constructor(blocks = []) {
		if (blocks === null) {
			blocks = []
		}
		this.load(blocks)
	}

	get blocks() {
		return this.bks
	}

	set blocks(b) {
		this.bks = b
	}

	get lastblock() {
		return this.bks[0]
	}

	/***********************************************************************
	 *                            UTILS METHODS
	 **********************************************************************/

	addBlock(block) {
		if (!this.isEmpty() && !Blockchain.isValidBlock(this.lastblock)) {
			throw new UnauthorizedError('Cannot add block if previous is not signed.')
		}
		this.blocks.unshift(block)
	}

	/**
	 * Add the given transaction as a paper cash to the blockchain
	 * Then return it.
	 */
	cashPaper(tx) {
		if (tx.target !== 0) {
			throw new InvalidTransactionError('Target is != 0')
		} else if (!tx.version) {
			throw new InvalidTransactionError('Missing version ' + tx.hash)
		} else if (!tx.date > 0) {
			throw new InvalidTransactionError('Wrong date ' + tx.hash)
		} else if (!tx.source || tx.source.length !== 66) {
			throw new InvalidTransactionError('Wrong source format ' + tx.hash)
		} else if (!tx.money || !Object.prototype.toString.call(tx.money) == '[object Array]') {
			throw new InvalidTransactionError('Wrong money format ' + tx.hash)
		} else if (tx.money.length === 0) {
			throw new InvalidTransactionError('Empty paper (no money) ' + tx.hash)
		} else if (!tx.invests
			|| !Object.prototype.toString.call(tx.invests) == '[object Array]'
			|| tx.invests.length > 0) {
			throw new InvalidTransactionError('Wrong invests format ' + tx.hash)
		} else if (tx.type !== Blockchain.TXTYPE.PAPER) {
			throw new InvalidTransactionError('Wrong transaction type ' + tx.hash)
		} else if (!Blockchain.isValidTransaction(tx)) {
			throw new InvalidTransactionError('Wrong signature ' + tx.hash)
		}

		this.addTransaction(tx)
		this.lastblock.total += tx.money.length
		return tx
	}

	/**
	 * 
	 * @param {*} blocks 
	 * @returns decoded blocks as json
	 */
	decodeBlocks(blocks) {
		if (Object.prototype.toString.call(blocks) == '[object Array]') {
			return blocks
		} else {
			try {
				// Here it's binary
				return decode(blocks)
			} catch (e) {
				// Here it's binary encoded as B64 (for sending)
				const binary = Base64.toUint8Array(blocks)
				return decode(binary)
			}
		}
	}

	/**
	 * Return the level of the blockchain, minus the already engaged
	 * amount of invest
	 */
	getAffordableInvestAmount(date) {
		const result = this.getLevel() - this.getEngagedInvests(date).length
		return result
	}

	/**
	 * Return the amount of Money available in the Blockchain
	 * If Blockchain is invalid, return 0
	 */
	getAvailableMoneyAmount() {
		if (this.isEmpty() || this.isWaitingValidation()) {
			return 0
		}
		return this.lastblock.money.length;
	}

	/**
	 * Return the list of all available Money
	 * If amount > 0, return only this amount of Money
	 * If amount is not affordable, return empty array []
	 */
	getAvailableMoney(amount = -1) {
		if (amount < 0) {
			return this.lastblock.money
		}

		if (amount > this.lastblock.money.length) {
			return []
		}

		return this.lastblock.money.slice(0, amount)
	}

	/**
	 * Return the list of invest identifiers already engaged
	 * If date is given, return those of this day engaged
	 */
	getEngagedInvests(date = null) {
		const result = []
		for (let tx of this.lastblock.transactions) {
			if (tx.type === Blockchain.TXTYPE.ENGAGE) {
				for (let invest of tx.invests) {
					if (date !== null) {
						if (Blockchain.intToDate(invest).getDate() === date.getDate()) {
							result.push(invest)
						}
					} else {
						result.push(invest)
					}
				}
			}
		}
		return result
	}

	/**
	 * Return the list of money identifiers already engaged
	 * If date is given, return those of this day engaged
	 */
	getEngagedMoney(date = null) {
		const result = []
		for (let tx of this.lastblock.transactions) {
			if (tx.type === Blockchain.TXTYPE.ENGAGE) {
				for (let m of tx.money) {
					if (date !== null) {
						if (Blockchain.intToDate(m).getDate() === date.getDate()) {
							result.push(m)
						}
					} else {
						result.push(m)
					}
				}
			}
		}
		return result
	}

	/**
	 * Return the lastly added Transaction
	 */
	getLastTransaction() {
		for (let block of this.blocks) {
			if (block.transactions.length > 0) {
				return block.transactions[0];
			}
		}
		return null;
	}

	/**
	 * Return the date of the lastly added transaction
	 */
	getLastTransactionDate() {
		const tx = this.getLastTransaction()
		return Blockchain.intToDate(tx.date)
	}

	/**
	 * @returns true if the Blockchain has no block in it
	 */
	isEmpty() {
		return this.blocks.length === 0
	}

	isValid() {
		return true
	}

	/**
	 * @returns true if blocks are in light format (v instead of version, d instead of closedate, etc)
	 */
	isLightBlocks(blocks) {
		return !(blocks.length === 0 || !!blocks[0].version)
	}

	/**
	 * Load the given blocks into the Blockchain
	 * blocks can be Array of blocks
	 * or the binary encoded array of blocks
	 */
	load(blocks) {
		blocks = this.decodeBlocks(blocks)

		if (this.isLightBlocks(blocks)) {
			this.loadLightBlocks(blocks)
		} else {
			this.blocks = blocks
		}
	}

	/**
	 * 
	 * @param {} blocks
	 */
	loadLightBlocks(blocks) {
		this.blocks = []
		for (let i = 0; i < blocks.length; i++) {
			this.blocks[i] = {
				version: blocks[i].v,
				closedate: blocks[i].d,
				previousHash: blocks[i].p,
				signer: blocks[i].s,
				merkleroot: blocks[i].r,
				total: blocks[i].t,
				money: blocks[i].m,
				invests: blocks[i].i,
				transactions: [] || blocks[i].x,
				hash: blocks[i].h
			}
			for (let j = 0; j < blocks[i].transactions; j++) {
				this.blocks[i].transactions[j] = {
					version: blocks[i].transaction[j].v,
					type: blocks[i].transaction[j].t,
					date: blocks[i].transaction[j].d,
					signer: blocks[i].transaction[j].s,
					target: blocks[i].transaction[j].t,
					money: blocks[i].transaction[j].m,
					invests: blocks[i].transaction[j].i
				}
			}
		}
	}

	/**
	 * Remove given money from the available ones.
	 * That means those Money have been spended.
	 */
	removeMoney(money) {
		const result = this.lastblock.money.filter(x => !money.includes(x))
		this.lastblock.money = result;
		return result
	}

	/**
	 * Add given transaction to the Blockchain
	 */
	addTransaction(transaction) {
		if (this.lastblock.hash) { // TODO: use isSigned(block)
			this.newBlock()
		}
		if (this.getHistory(3).filter(element => element.hash === transaction.hash).length > 0) {
			throw new InvalidTransactionError('Transaction duplicate ' + transaction.hash)
		}
		this.lastblock.transactions.unshift(transaction)
	}

	/**
	 * Create a new block and add it to the Blockchain
	 * Copy to this new block some transactions :
	 *   - those with still running engagement
	 */
	newBlock() {
		if (!Blockchain.isValidBlock(this.lastblock)) {
			throw new Error('Previous block not signed.')
		}
		const block = {
			closedate: null,
			version: Blockchain.VERSION,
			previousHash: this.lastblock.hash,
			money: this.lastblock.money,
			invests: this.lastblock.invests,
			total: this.lastblock.total,
			merkleroot: 0,
			signer: null,
			transactions: []
		}
		const date = Blockchain.intToDate(this.lastblock.closedate)
		date.setDate(date.getDate() + 1)
		for (let tx of this.lastblock.transactions) {
			if (tx.type === Blockchain.TXTYPE.ENGAGE) {
				for (let money of tx.money) {
					if (Blockchain.intToDate(money).getTime() === date.getTime()) {
						block.transactions.push(tx)
						break
					}
				}
				for (let invest of tx.invests) {
					if (Blockchain.intToDate(invest).getTime() === date.getTime()) {
						block.transactions.push(tx)
						break
					}
				}
			}
		}
		this.blocks.unshift(block)
	}

	/**
	 * Sign the last block of the Blockchain
	 * If there is at least one Paper cashed in the block, raise an error if the block
	 * signer is not the Paper signer.
	 * 
	 * TODO: throw error if last block is already signed
	 * TODO: add method "isSigned(block)"
	 * TODO: add MerkleRoot
	 * TODO: Add signer (based on privatekey)
	 * TODO: Add closedate
	 */
	sealLastBlock(privateKey) {
		const myPublicKey = this.getMyPublicKey()
		for (let tx of this.lastblock.transactions) {
			if (tx.type === Blockchain.TXTYPE.PAPER && Blockchain.publicFromPrivate(privateKey) !== tx.signer) {
				throw new UnauthorizedError('Only Paper signer can seal a block with it.')
			}
		}
		return Blockchain.signblock(this.lastblock, privateKey)
	}

	// asLightChain () {
	// 	const lightchain = [];
	// 	this.blocks.forEach(block => {
	// 		lightchain.push({
	// 			v: block.version,
	// 			d: block.closedate,
	// 			p: block.previousHash,
	// 			s: block.signer,
	// 			r: block.merkleroot,
	// 			m: block.money,
	// 			i: block.invests,
	// 			t: block.total,
	// 			h: block.hash
	// 		})
	// 	});
	// 	return lightchain;
	// }

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
	 * Return the whole history of transactions
	 * @param {number} [limit=0] the max number of blocks to look in
	 */
	getHistory(limit = 0) {
		let i = 0
		const result = []
		this.blocks.forEach(block => {
			if (block.transactions) {
				block.transactions.forEach(tx => {
					result.push(tx)
				})
			}
			i++
			if (limit > 0 && i >= limit) {
				return result
			}
		})
		return result
	}

	/**
	 * Return the public key written in the last creation block or in the
	 * initialization block
	 */
	getMyPublicKey() {
		for (let block of this.blocks) {
			if (block.previousHash === Blockchain.REF_HASH) {
				// Case 1: Birth block
				return block.signer
			} else if (block.transactions.length > 0) {
				// Case 2: Standard block => look in transactions
				for (let tx of block.transactions) {
					if (tx.type === Blockchain.TXTYPE.CREATE) {
						return tx.source
					}
				}
			}
		}
		return null
	}

	/***********************************************************************
	 *                           MAIN METHODS
	 **********************************************************************/

	/**
	 * Add and return the given Income transaction to the blockchain
	 * and add the funds to total
	 * Throws an error if target is not blockchain owner
	 * Throws an error if transaction is invalid
	 */
	income(transaction) {
		const myPublicKey = this.getMyPublicKey()
		if (transaction.target !== myPublicKey ||
			transaction.type !== Blockchain.TXTYPE.PAY ||
			!Blockchain.isValidTransaction(transaction)
		) {
			throw new Error('Invalid transaction')
		}
		this.addTransaction(transaction)
		this.lastblock.total += transaction.money.length

		return transaction
	}

	/**
	 * Add and return the transaction holding the payment with :
	 *    - myPrivateKey to sign the transaction
	 *    - target pubkey
	 *    - given amount
	 *    - given date or today
	 * Throws an error if Blockchain can't afford it
	 */
	pay(myPrivateKey, targetPublicKey, amount, d = new Date()) {
		const money = this.getAvailableMoney(amount);
		if (money.length === 0) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		const transaction = {
			type: Blockchain.TXTYPE.PAY,
			date: Blockchain.dateToInt(d),
			money: money,
			source: Blockchain.publicFromPrivate(myPrivateKey),
			invests: [],
			target: targetPublicKey,
			signer: 0,
			version: Blockchain.VERSION
		}

		const result = Blockchain.signtx(transaction, myPrivateKey)
		this.addTransaction(result)
		this.removeMoney(money);
		if (targetPublicKey === this.getMyPublicKey()) {
			this.lastblock.total += result.money.length
		}
		return result;
	}
}