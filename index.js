const { Base64 } = require('js-base64')
const { sha256 } = require('ethereum-cryptography/sha256')
const { scryptSync } = require("ethereum-cryptography/scrypt");
const { utf8ToBytes, toHex, hexToBytes } = require("ethereum-cryptography/utils");
const secp = require('ethereum-cryptography/secp256k1')
const { encrypt, decrypt } = require("ethereum-cryptography/aes");
const { getRandomBytesSync } = require("ethereum-cryptography/random");
const msgpack = require('msgpack-lite')

class InvalidTransactionError extends Error {
	constructor(message) {
        super(message);
        this.name = "InvalidTransactionError";
    }
}

class UnauthorizedError extends Error {
	constructor(message) {
        super(message);
        this.name = "UnauthorizedError";
    }
}

class Blockchain {
	/***********************************************************************
	 *                              CONSTANTS
	 **********************************************************************/
	static get REF_HASH () { return 'c1a551ca1c0deea5efea51b1e1dea112ed1dea0a5150f5e11ab1e50c1a15eed5' }
	static get VERSION () { return 1 }

	static get TXTYPE () {
		return {
			INIT: 0,
			CREATE: 1,
			PAY: 2,
			ENGAGE: 3,
			PAPER: 4
		}
	}

	/***********************************************************************
	 *                           STATIC METHODS
	 **********************************************************************/
	static randomPrivateKey () {
		return toHex(secp.utils.randomPrivateKey())
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

	static dateToInt(date) {
		return +('' + date.getFullYear() + ("0" + (date.getMonth() + 1)).slice(-2) + ("0" + date.getDate()).slice(-2))
	}

	static intToDate(dateint) {
		const datestr = '' + dateint
		return new Date(datestr.slice(0,4) + '-' + datestr.slice(4,6) + '-' + datestr.slice(6,8))
	}

	static intToIndex(dateint) {
		const datestr = '' + dateint
		return +datestr.slice(-3)
	}

	static formatMoneyIndex(date, index) {
		return +(''+Blockchain.dateToInt(date) + ("00" + index).slice(-3))
	}

	static formatInvestIndex(date, index) {
		return +(''+Blockchain.dateToInt(date) + '9' + ("00" + index).slice(-3))
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
	 * TODO : calculate merkle root
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
	 * Return false else
	 */
	static isValidBlock (block, pubkey=null) {
		pubkey = pubkey || block.signer || block.source
		const hash = this.hashblock(block)
		const signature = block.hash
		
		return secp.verify(
			signature,
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
			block.transactions.length === 2 &&
			block.merkleroot === 0 &&
			block.money.length === 1 &&
			block.invests.length === 1 &&
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
	 * Return true if given transaction has all it's fields
	 * and is correctly signed
	 * Return false else
	 */
	static isValidTransaction (tx) {
		const txHash = Blockchain.hashtx(tx)

		if (! tx.source) {
			return false
		}

		return tx.version === Blockchain.VERSION &&
			tx.date > 0 &&
			tx.source.length === 66 &&
			Object.prototype.toString.call(tx.money) == '[object Array]' &&
			Object.prototype.toString.call(tx.invests) == '[object Array]' &&
			Object.values(Blockchain.TXTYPE).indexOf(tx.type) > -1 &&
			secp.verify(tx.hash, txHash, tx.source)
	}

	/***********************************************************************
	 *                      BASE METHODS AND GETTES
	 **********************************************************************/

	constructor (blocks = []) {
		if (blocks === null) {
			blocks = []
		}
		this.load(blocks)
	}

	get blocks () {
		return this.bks
	}

	set blocks (b) {
		this.bks = b
	}

	get lastblock () {
		return this.bks[0]
	}

	/***********************************************************************
	 *                            UTILS METHODS
	 **********************************************************************/

	addBlock (block) {
		if (! this.isEmpty() && ! Blockchain.isValidBlock(this.lastblock)) {
			throw new UnauthorizedError('Cannot add block if previous is not signed.')
		}
		this.blocks.unshift(block)
	}

	/**
	 * Return the level of the blockchain, minus the already engaged
	 * amount of invest
	 */
	getAffordableInvestAmount (date) {
		const result = this.getLevel() - this.getEngagedInvests(date).length
		return result
	}

	/**
	 * Return the amount of Money available in the Blockchain
	 * If Blockchain is invalid, return 0
	 */
	getAvailableMoneyAmount () {
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
	getAvailableMoney (amount = -1) {
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
	getEngagedInvests (date = null) {
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
	getEngagedMoney (date = null) {
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
	getLastTransaction () {
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
	getLastTransactionDate () {
		const tx = this.getLastTransaction()
		return Blockchain.intToDate(tx.date)
	}

	/**
	 * Return true if the Blockchain has no block in it
	 */
	isEmpty () {
		return this.blocks.length === 0
	}

	isValid () {
		return true
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
		if (this.blocks.length === 0 || this.lastblock.version) {
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

	/**
	 * Remove given money from the available ones.
	 * That means those Money have been spended.
	 */
	removeMoney (money) {
		const result = this.lastblock.money.filter(x => !money.includes(x))
		this.lastblock.money = result;
		return result
	}

	/**
	 * Add given transaction to the Blockchain
	 */
	addTransaction (transaction) {
		if (this.lastblock.hash) {
			this.newBlock()
		}
		this.lastblock.transactions.unshift(transaction)
	}

	/**
	 * Create a new block and add it to the Blockchain
	 * Copy to this new block some transactions :
	 *   - those with still running engagement
	 */
	newBlock () {
		if (! Blockchain.isValidBlock(this.lastblock)) {
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
	 */
	sealLastBlock (privateKey) {
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
	 * Return the public key written in the last creation block or in the
	 * initialization block
	 */
	getMyPublicKey () {
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
	income (transaction) {
		const myPublicKey = this.getMyPublicKey()
		if (transaction.target !== myPublicKey ||
			transaction.type !== Blockchain.TXTYPE.PAY ||
			! Blockchain.isValidTransaction(transaction)
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
	pay (myPrivateKey, targetPublicKey, amount, d = new Date()) {
		const money = this.getAvailableMoney(amount);
		if (money.length === 0) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		const transaction = {
			type: Blockchain.TXTYPE.PAY,
			date: Blockchain.dateToInt(d),
			money: money,
			source: secp.getPublicKey(myPrivateKey, true),
			invests: [],
			target: targetPublicKey,
			signer: 0,
			version: Blockchain.VERSION
		}

		const result = Blockchain.signtx(transaction, myPrivateKey)
		this.addTransaction(result)
		this.removeMoney(money);
		return result;
	}
}


class CitizenBlockchain extends Blockchain {
	/**
	 * And and return the given transaction as a paper cash
	 */
	cashPaper (tx) {
		if (tx.target !== 0) {
			throw new InvalidTransactionError('Target is != 0')
		} else if (! tx.version) {
			throw new InvalidTransactionError('Missing version ' + tx.hash)
		} else if (! tx.date > 0) {
			throw new InvalidTransactionError('Wrong date ' + tx.hash)
		} else if (! tx.source || tx.source.length !== 66) {
			throw new InvalidTransactionError('Wrong source format ' + tx.hash)
		} else if (! tx.money || ! Object.prototype.toString.call(tx.money) == '[object Array]') {
			throw new InvalidTransactionError('Wrong money format ' + tx.hash)
		} else if (tx.money.length === 0) {
			throw new InvalidTransactionError('Empty paper (no money) ' + tx.hash)
		} else if (! tx.invests 
			|| ! Object.prototype.toString.call(tx.invests) == '[object Array]'
			|| tx.invests.length > 0) {
			throw new InvalidTransactionError('Wrong invests format ' + tx.hash)
		} else if (tx.type !== Blockchain.TXTYPE.PAPER) {
			throw new InvalidTransactionError('Wrong transaction type ' + tx.hash)
		} else if (! Blockchain.isValidTransaction(tx)) {
			throw new InvalidTransactionError('Wrong signature ' + tx.hash)
		}

		this.addTransaction(tx)
		this.lastblock.total += tx.money.length
		return tx
	}

	/**
	 * Add and return the transaction that creates Money for the Blockchain.
	 * If date is not given, uses today's date.
	 * Creates money from last date it was created until given date or today.
	 * if Money has already been created at the given date, create nothing and return null.
	 * Throw an error if date is in the futur as one cannot create futur money.
	 */
	createMoneyAndInvests (privateKey, date = new Date()) {
		var lastdate = date

		const today = new Date();
		if (date.getTime() > today.getTime()) {
			throw new Error('Cannot create futur money, live in the present.')
		}
		const lastCreationTx = this.getLastCreationTransaction();
		if (lastCreationTx) {
			lastdate = Blockchain.intToDate(lastCreationTx.date);
			lastdate.setDate(lastdate.getDate() + 1);
		}
		if (lastdate > date) {
			return null;
		}
		const level = this.getLevel()
		let moneys = [];
		let invests = [];
		let tmpMoney, tmpInvests, filteredInvests, filteredMoney

		while (lastdate <= date) {
			tmpInvests = Blockchain.buildInvestIndexes(lastdate, level)
			filteredInvests = tmpInvests.filter(x => !this.getEngagedInvests(lastdate).includes(x))
			invests = invests.concat(filteredInvests);

			tmpMoney = Blockchain.buildMoneyIndexes(lastdate, level)
			filteredMoney = tmpMoney.filter(x => !this.getEngagedMoney(lastdate).includes(x))
			moneys = moneys.concat(filteredMoney);

			lastdate.setDate(lastdate.getDate() + 1);
		}

		const transaction = {
			version: Blockchain.VERSION,
			type: Blockchain.TXTYPE.CREATE,
			date: Blockchain.dateToInt(date),
			source: secp.getPublicKey(privateKey, true),
			target: secp.getPublicKey(privateKey, true),
			signer: 0,
			money: moneys,
			invests: invests,
		}
		const result = Blockchain.signtx(transaction, privateKey)
		this.addTransaction(result);
		this.lastblock.money = this.lastblock.money.concat(moneys);
		this.lastblock.invests = this.lastblock.invests.concat(invests);
		return result;
	}

	/**
	 * Add and return the transaction that engage invests of the BLockchain.
	 */
	engageInvests (myPrivateKey, targetPublicKey, dailyAmount, days, date = new Date()) {
		if (dailyAmount > this.getAffordableInvestAmount(date)) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}

		let invests = []
		const level = this.getLevel()
		const dateIndex = new Date(date)
		let tmpInvests, filteredInvests
		for (let d = 0; d < days; d++) {
			tmpInvests = Blockchain.buildInvestIndexes(dateIndex, level)
			filteredInvests = tmpInvests.filter(x => !this.getEngagedInvests(dateIndex).includes(x))
			invests = invests.concat(filteredInvests.slice(0, dailyAmount))

			dateIndex.setDate(dateIndex.getDate() + 1)
		}
		const tx = {
			version: Blockchain.VERSION,
			type: Blockchain.TXTYPE.ENGAGE,
			date: Blockchain.dateToInt(date),
			source: Blockchain.publicFromPrivate(myPrivateKey),
			target: targetPublicKey,
			money: [],
			invests: invests,
			signer: 0
		}
		const result = Blockchain.signtx(tx, myPrivateKey)
		this.addTransaction(result)
		return result
	}

	/**
	 * Add and return the transaction that engage money of the BLockchain.
	 */
	engageMoney (myPrivateKey, targetPublicKey, dailyAmount, days, date = new Date()) {
		if (dailyAmount > this.getAffordableMoneyAmount(date)) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}

		let money = []
		const level = this.getLevel()
		const dateIndex = new Date(date)
		let tmpMoney, filteredMoney
		for (let d = 0; d < days; d++) {
			tmpMoney = Blockchain.buildMoneyIndexes(dateIndex, level)
			filteredMoney = tmpMoney.filter(x => !this.getEngagedMoney(dateIndex).includes(x))
			money = money.concat(filteredMoney.slice(0, dailyAmount))

			dateIndex.setDate(dateIndex.getDate() + 1)
		}
		const tx = {
			version: Blockchain.VERSION,
			type: Blockchain.TXTYPE.ENGAGE,
			date: Blockchain.dateToInt(date),
			source: Blockchain.publicFromPrivate(myPrivateKey),
			target: targetPublicKey,
			money: money,
			invests: [],
			signer: 0
		}
		const result = Blockchain.signtx(tx, myPrivateKey)
		this.addTransaction(result)
		return result
	}

	/**
	 * Add to last block and return a transaction creating a paper of given amount
	 *
	 * Throws an error if amount is not affordable
	 * Throws an error if given date is before last transaction date
	 */
	generatePaper (myPrivateKey, amount, date=new Date()) {
		const money = this.getAvailableMoney(amount);
		if (money.length === 0) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		if (date < this.getLastTransactionDate()) {
			throw new Error('Invalid date')
		}

		const transaction = {
			version: Blockchain.VERSION,
			type: Blockchain.TXTYPE.PAPER,
			date: Blockchain.dateToInt(date),
			money: money,
			invests: [],
			source: Blockchain.publicFromPrivate(myPrivateKey),
			target: 0,
			signer: 0
		}

		const result = Blockchain.signtx(transaction, myPrivateKey)
		this.addTransaction(result)
		this.removeMoney(money);
		return transaction
	}

	/**
	 * Return the level of the blockchain, minus the already engaged
	 * amount of money
	 */
	getAffordableMoneyAmount (date) {
		const result = this.getLevel() - this.getEngagedMoney(date).length
		return result
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
	 * Return the level of the Blockchain
	 * The level is equal to the number of Money (and Boxes) created
	 * each day
	 */
	getLevel () {
		if (this.isEmpty() && !this.isValidated()) { return 0 }
		return Math.floor(Math.cbrt(this.lastblock.total)) + 1
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
			return Math.floor(100 * (1- (this.getMoneyBeforeNextLevel() / Math.pow(level, 3))))
		}
		return Math.pow(level, 3) - this.lastblock.total
	}

	/**
	 * Return true if the last Transaction added made the Blockchain
	 * level up
	 */
	hasLevelUpOnLastTx () {
		const lastTx = this.getLastTransaction();
		if (lastTx === null || lastTx.type != Blockchain.TXTYPE.PAY) {
			return false
		}
		return Math.floor(Math.cbrt(this.lastblock.total - lastTx.money.length)) + 1 < this.getLevel()
	}

	/**
	 * Return true if the Blockchain has only one Block
	 * which is a Birth Block
	 */
	isWaitingValidation () {
		return this.blocks.length === 1 &&
			this.lastblock.previousHash === Blockchain.REF_HASH
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
	 * Return the birthblock based on given informations
	 */
	makeBirthBlock (privateKey, birthdate, name, date=new Date()) {
		const publicKey = Blockchain.publicFromPrivate(privateKey)
		let block = {
			version: Blockchain.VERSION,
			closedate: Blockchain.dateToInt(date),
			previousHash: Blockchain.REF_HASH, // Previous hash : here 'random'
			signer: publicKey, // Compressed Signer public key, here the new one created
			merkleroot: 0,
			money: [Blockchain.formatMoneyIndex(date, 0)],
			invests: [Blockchain.formatMoneyIndex(date, 0)],
			total: 0,
			transactions: [
				Blockchain.signtx({
					version: Blockchain.VERSION,
					date: Blockchain.dateToInt(birthdate),
					source: publicKey,
					target: name,
					signer: 0,
					money: [],
					invests: [],
					type: Blockchain.TXTYPE.INIT
				}, privateKey),
				Blockchain.signtx({
					version: Blockchain.VERSION,
					date: Blockchain.dateToInt(date),
					source: publicKey,
					target: publicKey,
					signer: 0,
					money: [Blockchain.formatMoneyIndex(date, 0)],
					invests: [Blockchain.formatMoneyIndex(date, 0)],
					type: Blockchain.TXTYPE.CREATE
				}, privateKey)
			]
		}
		block =  Blockchain.signblock(block, privateKey)
		this.addBlock(block)
		return block
	}

	/**
	 * Initalize and return a ready to go brand new Blockchain
	 * If no newPrivateKey is given, make one
	 * If no date is given, use today
	 */
	startBlockchain(name, birthdate, signerPrivateKey, newPrivateKey=null, date=new Date()) {
		newPrivateKey = newPrivateKey || Blockchain.randomPrivateKey()
		const birthblock = this.makeBirthBlock(newPrivateKey, birthdate, name, date)
		this.validateAccount(signerPrivateKey, date)
		return newPrivateKey
	}

	/**
	 * Return a validated Blockchain
	 */
	validateAccount (privateKey, date=new Date()) {
		let initializationBlock = {
			closedate: Blockchain.dateToInt(date),
			previousHash: this.lastblock.hash,
			signer: Blockchain.publicFromPrivate(privateKey),
			merkleroot: 0,
			money: [],
			invests: [],
			total: 0,
			transactions: [],
			version: Blockchain.VERSION
		}
		initializationBlock = Blockchain.signblock(initializationBlock, privateKey)
		this.addBlock(initializationBlock)
		return initializationBlock
	}
}

class EcosystemBlockchain extends Blockchain {
}

module.exports = { Blockchain, CitizenBlockchain, EcosystemBlockchain, InvalidTransactionError, UnauthorizedError }
