import { Blockchain } from './Blockchain.js'
import { InvalidTransactionError } from './errors.js'
import { randomPrivateKey, publicFromPrivate, 
	dateToInt, intToDate, formatMoneyIndex, formatInvestIndex,
	buildInvestIndexes, buildMoneyIndexes } from './crypto.js'

export class CitizenBlockchain extends Blockchain {
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
		if (date.getTime() > today.getTime()) {
			throw new Error('Cannot create futur money, live in the present.')
		}
		const lastCreationTx = this.getLastCreationTransaction();
		if (lastCreationTx) {
			lastdate = intToDate(lastCreationTx.date);
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
			tmpInvests = buildInvestIndexes(lastdate, level)
			filteredInvests = tmpInvests.filter(x => !this.getEngagedInvests(lastdate).includes(x))
			invests = invests.concat(filteredInvests);

			tmpMoney = buildMoneyIndexes(lastdate, level)
			filteredMoney = tmpMoney.filter(x => !this.getEngagedMoney(lastdate).includes(x))
			moneys = moneys.concat(filteredMoney);

			lastdate.setDate(lastdate.getDate() + 1);
		}

		const transaction = {
			version: Blockchain.VERSION,
			type: Blockchain.TXTYPE.CREATE,
			date: dateToInt(date),
			source: publicFromPrivate(privateKey),
			target: publicFromPrivate(privateKey),
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
		const tx = {
			version: Blockchain.VERSION,
			type: Blockchain.TXTYPE.ENGAGE,
			date: dateToInt(date),
			source: publicFromPrivate(myPrivateKey),
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
		const tx = {
			version: Blockchain.VERSION,
			type: Blockchain.TXTYPE.ENGAGE,
			date: dateToInt(date),
			source: publicFromPrivate(myPrivateKey),
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
	generatePaper(myPrivateKey, amount, referentPublicKey, date = new Date()) {
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
			date: dateToInt(date),
			money: money,
			invests: [],
			source: publicFromPrivate(myPrivateKey),
			target: 0,
			signer: referentPublicKey
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
	getLevel() {
		if (this.isEmpty() && !this.isValidated()) { return 0 }
		return Math.floor(Math.cbrt(this.lastblock.total)) + 1
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
		return Math.pow(level, 3) - this.lastblock.total
	}

	/**
	 * Return true if the last Transaction added made the Blockchain
	 * level up
	 */
	hasLevelUpOnLastTx() {
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
	isWaitingValidation() {
		return this.blocks.length === 1 &&
			this.lastblock.previousHash === Blockchain.REF_HASH
	}

	/**
	 * Return true if the Blockchain has been validated by
	 * a referent
	 */
	isValidated() {
		return !this.isEmpty() && this.blocks.length >= 2 &&
			this.blocks[this.blocks.length - 1].previousHash === Blockchain.REF_HASH
	}

	/**
	 * Return the birthblock based on given informations
	 */
	makeBirthBlock(secretKey, birthdate, name, date = new Date()) {
		const publicKey = publicFromPrivate(secretKey)
		let block = {
			version: Blockchain.VERSION,
			closedate: dateToInt(date),
			previousHash: Blockchain.REF_HASH, // Previous hash : here 'random'
			signer: publicKey, // Compressed Signer public key, here the new one created
			merkleroot: 0,
			money: [formatMoneyIndex(date, 0)],
			invests: [formatInvestIndex(date, 0)],
			total: 0,
			transactions: [
				Blockchain.signtx({
					version: Blockchain.VERSION,
					date: dateToInt(birthdate),
					source: publicKey,
					target: name,
					signer: 0,
					money: [],
					invests: [],
					type: Blockchain.TXTYPE.INIT
				}, secretKey),
				Blockchain.signtx({
					version: Blockchain.VERSION,
					date: dateToInt(date),
					source: publicKey,
					target: publicKey,
					signer: 0,
					money: [formatMoneyIndex(date, 0)],
					invests: [formatInvestIndex(date, 0)],
					type: Blockchain.TXTYPE.CREATE
				}, secretKey)
			]
		}
		block = Blockchain.signblock(block, secretKey)
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

	/**
	 * Return a validated Blockchain
	 */
	validateAccount(privateKey, date = new Date()) {
		let initializationBlock = {
			closedate: dateToInt(date),
			previousHash: this.lastblock.hash,
			signer: publicFromPrivate(privateKey),
			merkleroot: 0,
			money: this.lastblock.money,
			invests: this.lastblock.invests,
			total: 0,
			transactions: [],
			version: Blockchain.VERSION
		}
		initializationBlock = Blockchain.signblock(initializationBlock, privateKey)
		this.addBlock(initializationBlock)
		return initializationBlock
	}
}