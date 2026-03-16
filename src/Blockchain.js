import { InvalidTransactionError, UnauthorizedError } from './errors.js'
import { intToDate, dateToInt } from './crypto.js'

import { PayTransaction, TXTYPE } from './Transaction.js'
import { Block, BlockMaker } from './Block.js'

export class Blockchain {
	/***********************************************************************
	 *                              CONSTANTS
	 **********************************************************************/
	static get VERSION() { return 1 }

	/***********************************************************************
	 *                      BASE METHODS AND GETTERS
	 **********************************************************************/

	constructor(blocks = []) {
		blocks = blocks || []
		this.bks = []

		for (let i = 0; i < blocks.length; i++) {
			this.bks.push(BlockMaker.make(blocks[i]))
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

	get lastClosedBlock() {
		for (let block of this.blocks) {
			if (block.isSigned()) {
				return block
			}
		}
		return null
	}

	get money() {
		return this.lastblock.money
	}

	get invests() {
		return this.lastblock.invests
	}

	/***********************************************************************
	 *                            UTILS METHODS
	 **********************************************************************/

	addBlock(block) {
		if (!this.isEmpty() && !this.lastblock.isSigned()) {
			throw new UnauthorizedError('Cannot add block if previous is not signed.')
		}
		this.blocks.unshift(block)
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
		if (this.lastClosedBlock.closedate > transaction.date) {
			throw new InvalidTransactionError('Invalid date')
		}
		this.lastblock.add(transaction)
	}

	/**
	 * Add the given transaction as a paper cash to the blockchain
	 * Then return it.
	 */
	cashPaper(tx) {
		if (!(tx.type === TXTYPE.PAPER && tx.isValid())) {
			throw new InvalidTransactionError('Invalid Transaction')
		}

		const papersHandler = this.lastblock.getPapersHandler()
		if (papersHandler !== null && papersHandler !== tx.target) {
			throw new InvalidTransactionError('Multiple papers target')
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
		return this.lastblock.getAvailableMoneyAmount()
	}

	getAvailableMoney(amount = -1) {
		return this.lastblock.getAvailableMoney(amount)
	}

	/**
	 * Return the list of invest identifiers already engaged
	 * If date is given, return those of this day engaged
	 */
	getEngagedInvests(date = null) {
		return this.lastblock.getEngagedInvests(date)
	}

	/**
	 * Return the list of money identifiers already engaged
	 * If date is given, return those of this day engaged
	 */
	getEngagedMoney(date = null) {
		return this.lastblock.getEngagedMoney(date)
	}

	/**
	 * Return the date of the lastly added transaction
	 */
	getLastTransactionDate() {
		const tx = this.lastTransaction
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
	 * Remove given money from the available ones.
	 * That means those Money have been spended.
	 */
	removeMoney(money) {
		const result = this.lastblock.money.filter(x => !money.includes(x))
		this.lastblock.money = result;
		return result
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

		const date = new Date(this.lastblock.closedate)
		date.setDate(date.getDate() + 1)
		for (let tx of this.lastblock.transactions) {
			if (tx.isEngagedForDate(date)) {
				block.transactions.push(tx)
			}
		}
		this.blocks.unshift(block)
	}

	/**
	 * Sign the last block of the Blockchain
	 * // TODO : rename to closeLasttBlock
	 */
	closeLastBlock(privateKey, date=new Date()) {
		return this.lastblock.sign(privateKey, date)
	}

	/**
	 * Return the whole history of transactions
	 * @param {number} [limit=0] the max number of blocks to look in
	 */
	getHistory(limit = 0) {
		let i = 0
		const result = []
		this.blocks.forEach(block => {
			// TODO : go to Block
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
	 * Return the public key of the owner of the blockchain
	 */
	getMyPublicKey() {
		let pk = null
		for (let block of this.blocks) {
			pk = block.getMyPublicKey()
			if (pk !== null) {
				return pk
			}
		}
		return null
	}

	/***********************************************************************
	 *                           MAIN METHODS
	 **********************************************************************/

	/**
	 * Add and return the transaction holding the payment with :
	 *    - mySk to sign the transaction
	 *    - target pubkey
	 *    - given amount
	 *    - given date or today
	 * Throws an error if Blockchain can't afford it
	 */
	pay(mySk, targetPk, amount, d = new Date()) {
		const money = this.getAvailableMoney(amount);
		if (money.length === 0) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		const transaction = new PayTransaction (mySk, targetPk, d, money)

		this.addTransaction(transaction)
		// TODO : go to Block
		this.removeMoney(money)

		if (targetPk === this.getMyPublicKey()) {
			this.lastblock.total += transaction.money.length
		}
		return transaction
	}
}