import { Blockchain } from './Blockchain.js'
import { InvalidTransactionError } from './errors.js'
import { randomPrivateKey, publicFromPrivate, 
	dateToInt, buildInvestIndexes, buildMoneyIndexes } from './crypto.js'
import { BirthBlock, InitializationBlock } from './Block.js'
import { CreateTransaction, EngageTransaction, PaperTransaction, TXTYPE } from './Transaction.js'

export class CitizenBlockchain extends Blockchain {

	get total() {
		return this.lastblock.total
	}

	addTransaction(transaction) {
		super.addTransaction(transaction)
		const myself = this.getMyPublicKey()
		if (transaction.type === TXTYPE.PAY && transaction.target === myself) {
			this.lastblock.total += transaction.money.length
		}
	}

	makeFilteredMoneyIndexes(level, fromdate, toDate) {
		let result = []
		let money
		const engagedMoney = this.getEngagedMoney()
		while (fromdate <= toDate) {
			money = buildMoneyIndexes(fromdate, level)
			result = result.concat(money)
			fromdate.setDate(fromdate.getDate() + 1)
		}
		result = result.filter(x => !engagedMoney.includes(x))
		return result
	}

	makeFilteredInvestsIndexes(level, fromdate, toDate) {
		let result = []
		let invests
		const engagedInvests = this.getEngagedInvests()
		while (fromdate <= toDate) {
			invests = buildInvestIndexes(fromdate, level)
			result = result.concat(invests)
			fromdate.setDate(fromdate.getDate() + 1)
		}
		result = result.filter(x => !engagedInvests.includes(x))
		return result
	}

	/**
	 * Add and return the transaction that creates Money for the Blockchain.
	 * If date is not given, uses today's date.
	 * Creates money from last date it was created until given date or today.
	 * if Money has already been created at the given date, create nothing and return null.
	 * Throw an error if date is in the futur as one cannot create futur money.
	 */
	createMoneyAndInvests(privateKey, date = new Date()) {
		var lastdate = date

		const today = new Date();
		if (date > today) {
			throw new Error('Cannot create futur money, live the moment.')
		}
		const lastCreationTx = this.getLastCreationTransaction();
		if (lastCreationTx) {
			lastdate = lastCreationTx.date;
			lastdate.setDate(lastdate.getDate() + 1);
		}
		if (lastdate > date) {
			return null;
		}
		const level = this.getLevel()
		const money = this.makeFilteredMoneyIndexes(level, new Date(lastdate), date)
		const invests = this.makeFilteredInvestsIndexes(level, new Date(lastdate), date)

		const transaction = new CreateTransaction({
			d: dateToInt(date),
			s: publicFromPrivate(privateKey),
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
		if (dailyAmount > this.getAffordableInvestAmount(date)) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}

		let invests = []
		const level = this.getLevel()
		const dateIndex = new Date(date)
		let tmpInvests, filteredInvests
		for (let d = 0; d < days; d++) {
			tmpInvests = buildInvestIndexes(dateIndex, level)
			filteredInvests = tmpInvests.filter(x => !this.getEngagedInvests(dateIndex).includes(x))
			invests = invests.concat(filteredInvests.slice(0, dailyAmount))

			dateIndex.setDate(dateIndex.getDate() + 1)
		}
		const tx = new EngageTransaction({
			d: dateToInt(date),
			p: targetPublicKey,
			i: invests,
			s: publicFromPrivate(myPrivateKey),
		})
		tx.sign(myPrivateKey)
		this.addTransaction(tx)
		return tx
	}

	/**
	 * Add and return the transaction that engage money of the BLockchain.
	 */
	engageMoney(myPrivateKey, targetPublicKey, dailyAmount, days, date = new Date()) {
		if (dailyAmount > this.getAffordableMoneyAmount(date)) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}

		let money = []
		const level = this.getLevel()
		const dateIndex = new Date(date)
		let tmpMoney, filteredMoney
		for (let d = 0; d < days; d++) {
			tmpMoney = buildMoneyIndexes(dateIndex, level)
			filteredMoney = tmpMoney.filter(x => !this.getEngagedMoney(dateIndex).includes(x))
			money = money.concat(filteredMoney.slice(0, dailyAmount))

			dateIndex.setDate(dateIndex.getDate() + 1)
		}
		const tx = new  EngageTransaction({
			d: dateToInt(date),
			p: targetPublicKey,
			m: money,
			s: publicFromPrivate(myPrivateKey)
		})
		tx.sign(myPrivateKey)
		this.addTransaction(tx)
		return tx
	}

	/**
	 * Add to last block and return a transaction creating a paper of given amount
	 *
	 * Throws an error if amount is not affordable
	 * Throws an error if given date is before last transaction date
	 */
	generatePaper(myPrivateKey, amount, referentPublicKey, date = new Date()) {
		const money = this.getAvailableMoney(amount);
		if (money.length === 0) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		if (date < this.getLastTransactionDate()) {
			throw new Error('Invalid date')
		}
		const transaction = new PaperTransaction(myPrivateKey, referentPublicKey, money, date)
		transaction.sign(myPrivateKey)

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
		if (this.isEmpty() && !this.isValidated()) { return 0 }
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
		if (lastTx === null || lastTx.toString() != "[PayTransaction]") {
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
			this.lastblock.toString() === "[BirthBlock]"
	}

	/**
	 * Return true if the Blockchain has been validated by
	 * a referent
	 */
	isValidated() {
		return this.blocks.length >= 2
		&& this.blocks[this.blocks.length - 2].toString() === "[InitializationBlock]"
		&& this.blocks[this.blocks.length - 1].toString() === "[BirthBlock]"
	}

	/**
	 * Return the birthblock based on given informations
	 */
	makeBirthBlock(secretKey, birthdate, name, date = new Date()) {
		const block = new BirthBlock(secretKey, birthdate, name, date)
		this.addBlock(block)
		return block
	}

	/**
	 * Initalize Blockchain and return its private key
	 * If no newPrivateKey is given, make one
	 * If no date is given, use today
	 */
	startBlockchain(name, birthdate, signerPrivateKey, newPrivateKey = null, date = new Date()) {
		newPrivateKey = newPrivateKey || randomPrivateKey()
		const birthblock = this.makeBirthBlock(newPrivateKey, birthdate, name, date)
		this.validateAccount(signerPrivateKey, date)
		return newPrivateKey
	}

	validateAccount(secretKey, date = new Date()) {		
		const block = new InitializationBlock(secretKey, this.lastblock, date)
		this.addBlock(block)
		return block
	}
}