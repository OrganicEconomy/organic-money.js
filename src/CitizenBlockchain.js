import { Blockchain } from './Blockchain.js'
import { InvalidTransactionError, UnauthorizedError } from './errors.js'
import { randomPrivateKey, publicFromPrivate, 
	dateToInt, buildInvestIndexes, buildMoneyIndexes } from './crypto.js'
import { BirthBlock, InitializationBlock } from './Block.js'
import { CreateTransaction, EngageTransaction, PaperTransaction, PayTransaction, PayerOrderTransaction, TXTYPE } from './Transaction.js'

export class CitizenBlockchain extends Blockchain {

	get total() {
		return this.lastblock.total
	}

	makeFilteredMoneyIndexes(level, fromdate, toDate) {
		return this.#makeFilteredIndexes(level, fromdate, toDate, buildMoneyIndexes, this.getEngagedMoney)
	}

	makeFilteredInvestsIndexes(level, fromdate, toDate) {
		return this.#makeFilteredIndexes(level, fromdate, toDate, buildInvestIndexes, this.getEngagedInvests)
	}

	#makeFilteredIndexes(level, fromdate, toDate, buildFn, getEngagedFn) {
		const engaged = getEngagedFn.call(this)
		let result = []
		const current = new Date(fromdate)
		while (current <= toDate) {
			result = result.concat(buildFn(current, level))
			current.setDate(current.getDate() + 1)
		}
		return result.filter(x => !engaged.includes(x))
	}

	/**
	 * Add and return the transaction that creates Money for the Blockchain.
	 * If date is not given, uses today's date.
	 * Creates money from last date it was created until given date or today.
	 * if Money has already been created at the given date, create nothing and return null.
	 * Throw an error if date is in the futur as one cannot create futur money.
	 */
	createMoneyAndInvests(privateKey, date = new Date()) {
		const myPublicKey = publicFromPrivate(privateKey)
		if (myPublicKey !== this.getMyPublicKey()) {
			throw new UnauthorizedError('Private key does not match blockchain owner.')
		}
		let startdate = new Date(date)

		const today = new Date();
		if (date > today) {
			throw new Error('Cannot create futur money, live the moment.')
		}
		const lastCreationTx = this.getLastCreationTransaction();
		if (lastCreationTx) {
			startdate = new Date(lastCreationTx.date);
			startdate.setDate(startdate.getDate() + 1);
		}
		if (startdate > date) {
			return null;
		}
		const level = this.getLevel()
		const money = this.makeFilteredMoneyIndexes(level, startdate, date)
		const invests = this.makeFilteredInvestsIndexes(level, startdate, date)

		const transaction = new CreateTransaction({
			d: dateToInt(date),
			s: myPublicKey,
			m: money,
			i: invests
		})
		transaction.sign(privateKey)
		this.addTransaction(transaction);
		return transaction;
	}

	/**
	 * Add and return the transaction that engage invests of the BLockchain.
	 */
	engageInvests(myPrivateKey, targetPublicKey, dailyAmount, days, date = new Date()) {
		const myPublicKey = publicFromPrivate(myPrivateKey)
		if (myPublicKey !== this.getMyPublicKey()) {
			throw new UnauthorizedError('Private key does not match blockchain owner.')
		}
		if (dailyAmount > this.getAffordableInvestAmount(date)) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		const invests = this.#buildEngageIndexes(days, date, dailyAmount, buildInvestIndexes, this.getEngagedInvests)
		const tx = new EngageTransaction({ d: dateToInt(date), p: targetPublicKey, i: invests, s: myPublicKey })
		tx.sign(myPrivateKey)
		this.addTransaction(tx)
		return tx
	}

	/**
	 * Add and return the transaction that engage money of the BLockchain.
	 */
	engageMoney(myPrivateKey, targetPublicKey, dailyAmount, days, date = new Date()) {
		const myPublicKey = publicFromPrivate(myPrivateKey)
		if (myPublicKey !== this.getMyPublicKey()) {
			throw new UnauthorizedError('Private key does not match blockchain owner.')
		}
		if (dailyAmount > this.getAffordableMoneyAmount(date)) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		const money = this.#buildEngageIndexes(days, date, dailyAmount, buildMoneyIndexes, this.getEngagedMoney)
		const tx = new EngageTransaction({ d: dateToInt(date), p: targetPublicKey, m: money, s: myPublicKey })
		tx.sign(myPrivateKey)
		this.addTransaction(tx)
		return tx
	}

	#buildEngageIndexes(days, date, dailyAmount, buildFn, getEngagedFn) {
		let indexes = []
		const dateIndex = new Date(date)
		for (let d = 0; d < days; d++) {
			const tmp = buildFn(dateIndex, this.getLevel())
			const filtered = tmp.filter(x => !getEngagedFn.call(this, dateIndex).includes(x))
			if (filtered.length < dailyAmount) {
				throw new InvalidTransactionError('Unsufficient funds.')
			}
			indexes = indexes.concat(filtered.slice(0, dailyAmount))
			dateIndex.setDate(dateIndex.getDate() + 1)
		}
		return indexes
	}

	payerOrder(mySk, ecosystemPk, supplierPk, invests, date = new Date()) {
		if (publicFromPrivate(mySk) !== this.getMyPublicKey())
			throw new UnauthorizedError('Private key does not match blockchain owner.')
		const tx = new PayerOrderTransaction(mySk, supplierPk, invests, ecosystemPk, date)
		this.addTransaction(tx)
		return tx
	}

	pay(mySk, targetPk, amount, d = new Date()) {
		const money = this.getAvailableMoney(amount)
		if (money.length === 0) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		const transaction = new PayTransaction(mySk, targetPk, d, money)
		this.addTransaction(transaction)
		this.removeMoney(money)
		return transaction
	}

	/**
	 * Add to last block and return a transaction creating a paper of given amount
	 *
	 * Throws an error if amount is not affordable
	 * Throws an error if given date is before last transaction date
	 */
	generatePaper(myPrivateKey, amount, referentPublicKey, date = new Date()) {
		if (publicFromPrivate(myPrivateKey) !== this.getMyPublicKey()) {
			throw new UnauthorizedError('Private key does not match blockchain owner.')
		}
		const money = this.getAvailableMoney(amount);
		if (money.length === 0) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		if (date < this.getLastTransactionDate()) {
			throw new Error('Invalid date')
		}
		const transaction = new PaperTransaction(myPrivateKey, referentPublicKey, money, date)
		this.addTransaction(transaction)
		this.removeMoney(money);
		return transaction
	}

	/**
	 * Return the level of the blockchain, minus the already engaged
	 * amount of money
	 */
	getAffordableMoneyAmount(date) {
		const result = this.getLevel() - this.getEngagedMoney(date).length
		return result
	}

	/**
	 * Return the last transaction in the blockchain that have the
	 * type CREATE
	 */
	getLastCreationTransaction() {
		for (let block of this.blocks) {
			for (let tx of block.transactions) {
				if (tx.type === TXTYPE.CREATE) {
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
	getLevel() {
		if (this.isEmpty() || !this.isValidated()) { return 0 }
		return Math.floor(Math.cbrt(this.total)) + 1
	}

	/**
	 * If as_percent is true, return the percentage of Money already
	 * made before the next level.
	 * If Blockchain is invalid, return 0
	 */
	getMoneyBeforeNextLevel(asPercent = false) {
		if (this.isEmpty() || !this.isValidated()) { return 0 }
		const level = this.getLevel()
		if (asPercent) {
			return Math.floor(100 * (1 - (this.getMoneyBeforeNextLevel() / Math.pow(level, 3))))
		}
		return Math.pow(level, 3) - this.total
	}

	/**
	 * Return true if the last Transaction added made the Blockchain
	 * level up
	 */
	hasLevelUpOnLastTx() {
		const lastTx = this.lastTransaction;
		if (lastTx === null || lastTx.type !== TXTYPE.PAY) {
			return false
		}
		return Math.floor(Math.cbrt(this.total - lastTx.money.length)) + 1 < this.getLevel()
	}

	/**
	 * Return true if the Blockchain has only one Block
	 * which is a Birth Block
	 */
	isWaitingValidation() {
		return this.blocks.length === 1 &&
			this.lastblock instanceof BirthBlock
	}

	/**
	 * Return true if the Blockchain has been validated by
	 * a referent
	 */
	isValidated() {
		return this.blocks.length >= 2
		&& this.blocks[this.blocks.length - 2] instanceof InitializationBlock
		&& this.blocks[this.blocks.length - 1] instanceof BirthBlock
	}

	/**
	 * Make the birthblock based on given informations
	 * If no secretKey is given, make one
	 * If no date is given, use today
	 * 
	 * Return the secretKey
	 */
	makeBirthBlock(name, birthdate, secretKey = null, date = new Date()) {
		secretKey = secretKey || randomPrivateKey()
		const block = new BirthBlock(secretKey, birthdate, name, date)
		this.addBlock(block)
		return secretKey
	}

	/**
	 * Initalize Blockchain and return its private key
	 * If no secretKey is given, make one
	 * If no date is given, use today
	 * 
	 * Return the secretKey
	 */
	startBlockchain(name, birthdate, signerSecretKey, secretKey = null, date = new Date()) {
		secretKey = this.makeBirthBlock(name, birthdate, secretKey, date)
		this.validateAccount(signerSecretKey, date)
		return secretKey
	}

	/**
	 * Add an InitializationBlock signed by secretKey to validate the account.
	 * Authorization is delegated to the caller — any key is accepted here.
	 */
	validateAccount(secretKey, date = new Date()) {
		const block = new InitializationBlock(secretKey, this.lastblock, date)
		this.addBlock(block)
		return block
	}
}