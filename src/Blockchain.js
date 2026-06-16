import { InvalidTransactionError, UnauthorizedError } from './errors.js'
import { intToDate, dateToInt, infinityDate } from './crypto.js'

import { TXTYPE } from './Transaction.js'
import { Block, BlockMaker, BLOCKTYPE } from './Block.js'

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
		if (!transaction.isValid()) {
			throw new InvalidTransactionError('Invalid transaction')
		}
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

	receiveEarn(earnTx) {
		if (earnTx.type !== TXTYPE.EARN || !earnTx.isValid())
			throw new InvalidTransactionError('Invalid transaction')
		if (earnTx.target !== this.getMyPublicKey())
			throw new InvalidTransactionError('Transaction not targeting this blockchain')
		this.addTransaction(earnTx)
		return earnTx
	}

	export() {
		return this.blocks.map(bk => bk.export())
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
		return tx.date
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

	removeMoney(money) {
		const result = this.lastblock.money.filter(x => !money.includes(x))
		this.lastblock.money = result;
		return result
	}

	removeInvests(invests) {
		const result = this.lastblock.invests.filter(x => !invests.includes(x))
		this.lastblock.invests = result
		return result
	}

	/**
	 * Create a new block and add it to the Blockchain
	 * Copy to this new block some transactions :
	 *   - those with still running engagement
	 */
	_createNewBlock(data) {
		return new Block({ ...data, t: BLOCKTYPE.ECOSYSTEM })
	}

	newBlock() {
		if (!this.lastblock.isSigned()) {
			throw new Error('Previous block not signed.')
		}
		const block = this._createNewBlock({
			v: Blockchain.VERSION,
			d: infinityDate,
			p: this.lastblock.signature,
			m: this.lastblock.money,
			i: this.lastblock.invests,
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
		let result = []
		this.blocks.forEach(block => {
			result = result.concat(block.transactions)
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

}