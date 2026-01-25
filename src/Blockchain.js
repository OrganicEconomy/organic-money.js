import { Base64 } from 'js-base64'
import { sha256 } from 'ethereum-cryptography/sha256.js'
import { toHex, hexToBytes } from 'ethereum-cryptography/utils.js'
import { signSync, verify } from 'ethereum-cryptography/secp256k1.js'
import { encode, decode } from 'msgpack-lite'
import { InvalidTransactionError, UnauthorizedError } from './errors.js'
import { publicFromPrivate, dateToInt, intToDate } from './crypto.js'

import { Transaction } from './Transaction.js'
import { Block } from './Block.js'

export class Blockchain {
	/***********************************************************************
	 *                              CONSTANTS
	 **********************************************************************/
	static get REF_HASH() { return 'c1a551ca1c0deea5efea51b1e1dea112ed1dea0a5150f5e11ab1e50c1a15eed5' }
	static get ECOREF_HASH() { return 'ec051c1a551ca1c0deea5efea51b1e1dea112ed1dea0a5150f5e11ab1e50c1a1' }
	static get VERSION() { return 1 }

	/***********************************************************************
	 *                           STATIC METHODS
	 **********************************************************************/

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
		blocks = blocks || []
		this.bks = []

		for (let i = 0; i < blocks.length; i++) {
			this.bks.push(new Block(blocks[i]))
		}
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

	get lastTransaction() {
		for (let block of this.blocks) {
			if (block.hasTransactions()) {
				return block.lastTransaction
			}
		}
		return null;
	}

	/***********************************************************************
	 *                            UTILS METHODS
	 **********************************************************************/

	add(block) {
		if (!this.isEmpty() && !this.lastblock.isSigned()) {
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
						if (intToDate(invest).getDate() === date.getDate()) {
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
						if (intToDate(m).getDate() === date.getDate()) {
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
	 * Return the date of the lastly added transaction
	 */
	getLastTransactionDate() {
		const tx = this.getLastTransaction()
		return intToDate(tx.date)
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
		if (this.lastblock.isSigned()) {
			this.newBlock()
		}
		if (this.getHistory(3).filter(element => element.signature === transaction.signature).length > 0) {
			throw new InvalidTransactionError('Transaction duplicate ' + transaction.signature)
		}
		this.lastblock.add(transaction)
	}

	/**
	 * Create a new block and add it to the Blockchain
	 * Copy to this new block some transactions :
	 *   - those with still running engagement
	 */
	newBlock() {
		if (!this.lastblock.isSigned()) {
			throw new Error('Previous block not signed.')
		}
		const block = new Block ({
			v: Blockchain.VERSION,
			d: null,
			p: this.lastblock.signature,
			m: this.lastblock.money,
			i: this.lastblock.invests,
			t: this.lastblock.total,
			r: 0,
			s: null,
			h: null,
			x: []
		})
		const date = intToDate(this.lastblock.closedate)
		date.setDate(date.getDate() + 1)
		for (let tx of this.lastblock.transactions) {
			if (tx.type === Blockchain.TXTYPE.ENGAGE) {
				for (let money of tx.money) {
					if (intToDate(money).getTime() === date.getTime()) {
						block.transactions.push(tx)
						break
					}
				}
				for (let invest of tx.invests) {
					if (intToDate(invest).getTime() === date.getTime()) {
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
	 */
	sealLastBlock(privateKey) {
		return this.lastblock.sign(privateKey)
	}

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
		const transaction = new Transaction ({
			type: Blockchain.TXTYPE.PAY,
			date: dateToInt(d),
			money: money,
			source: publicFromPrivate(myPrivateKey),
			invests: [],
			target: targetPublicKey,
			signer: 0,
			version: Blockchain.VERSION
		})

		const result = transaction.sign(myPrivateKey)
		this.addTransaction(result)
		this.removeMoney(money);
		if (targetPublicKey === this.getMyPublicKey()) {
			this.lastblock.total += result.money.length
		}
		return result;
	}
}