import { Blockchain } from './Blockchain.js'
import { InvalidTransactionError, UnauthorizedError, InvalidBlockchainError } from './errors.js'
import { randomPrivateKey, dateToInt, buildInvestIndexes, buildMoneyIndexes } from './crypto.js'
import { CitizenBlock, BirthBlock, InitializationBlock, BLOCKTYPE } from './Block.js'
import {
	CreateTransaction, EngageTransaction, PaperTransaction, PayTransaction, PayerOrderTransaction,
	SetAdminTransaction, UnsetAdminTransaction, SetActorTransaction, UnsetActorTransaction,
	SetPayerTransaction, UnsetPayerTransaction, TXTYPE
} from './Transaction.js'

export class CitizenBlockchain extends Blockchain {

	get experience() {
		return this.lastblock.experience
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
		this._assertOwner(privateKey)
		const myPublicKey = this.getMyPublicKey()
		let startdate = new Date(date)

		const today = new Date();
		if (date > today) {
			throw new InvalidTransactionError('Cannot create futur money, live the moment.')
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

		const transaction = new CreateTransaction(privateKey, money, invests, date)
		this._addTransaction(transaction);
		return transaction;
	}

	/**
	 * Add and return the transaction that engage invests of the BLockchain.
	 */
	engageInvests(myPrivateKey, targetPublicKey, dailyAmount, days, date = new Date()) {
		this._assertOwner(myPrivateKey)
		const myPublicKey = this.getMyPublicKey()
		if (dailyAmount > this.getAffordableInvestAmount(date)) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		const invests = this.#buildEngageIndexes(days, date, dailyAmount, buildInvestIndexes, this.getEngagedInvests)
		const tx = new EngageTransaction(myPrivateKey, targetPublicKey, invests, [], date)
		this._addTransaction(tx)
		return tx
	}

	/**
	 * Add and return the transaction that engage money of the BLockchain.
	 */
	engageMoney(myPrivateKey, targetPublicKey, dailyAmount, days, date = new Date()) {
		this._assertOwner(myPrivateKey)
		const myPublicKey = this.getMyPublicKey()
		if (dailyAmount > this.getAffordableMoneyAmount(date)) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		const money = this.#buildEngageIndexes(days, date, dailyAmount, buildMoneyIndexes, this.getEngagedMoney)
		const tx = new EngageTransaction(myPrivateKey, targetPublicKey, [], money, date)
		this._addTransaction(tx)
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

	receivePay(payTx) {
		if (payTx.type !== TXTYPE.PAY || !payTx.isValid())
			throw new InvalidTransactionError('Invalid transaction')
		if (payTx.target !== this.getMyPublicKey())
			throw new InvalidTransactionError('Transaction not targeting this citizen')
		this._addTransaction(payTx)
		this.lastblock.experience += payTx.money.length
		return payTx
	}

	receiveEarn(earnTx) {
		super.receiveEarn(earnTx)
		this.lastblock.experience += earnTx.money.length
		return earnTx
	}

	cashPaper(tx) {
		if (tx.signer === this.getMyPublicKey())
			throw new InvalidTransactionError('Cannot cash a paper you signed yourself.')
		super.cashPaper(tx)
		this.lastblock.experience += tx.money.length
		return tx
	}

	_createNewBlock(data) {
		return new CitizenBlock({ ...data, t: BLOCKTYPE.CITIZEN, e: this.lastblock.experience })
	}

	payerOrder(mySk, ecosystemPk, supplierPk, invests, date = new Date()) {
		this._assertOwner(mySk)
		const tx = new PayerOrderTransaction(mySk, supplierPk, invests, ecosystemPk, date)
		this._addTransaction(tx)
		return tx
	}

	#assertValidRatio(ratio) {
		if (!Number.isInteger(ratio) || ratio < 0)
			throw new InvalidTransactionError('Ratio must be a non-negative integer.')
	}

	#assertValidCap(cap) {
		if (!Number.isInteger(cap) || cap < -1)
			throw new InvalidTransactionError('Cap must be a non-negative integer.')
	}

	setAdmin(mySk, ecosystemPk, targetPk, date = new Date()) {
		this._assertOwner(mySk)
		const tx = new SetAdminTransaction(mySk, targetPk, ecosystemPk, date)
		this._addTransaction(tx)
		return tx
	}

	unsetAdmin(mySk, ecosystemPk, targetPk, date = new Date()) {
		this._assertOwner(mySk)
		const tx = new UnsetAdminTransaction(mySk, targetPk, ecosystemPk, date)
		this._addTransaction(tx)
		return tx
	}

	setActor(mySk, ecosystemPk, targetPk, ratio, date = new Date()) {
		this._assertOwner(mySk)
		this.#assertValidRatio(ratio)
		const tx = new SetActorTransaction(mySk, targetPk, ratio, ecosystemPk, date)
		this._addTransaction(tx)
		return tx
	}

	unsetActor(mySk, ecosystemPk, targetPk, date = new Date()) {
		this._assertOwner(mySk)
		const tx = new UnsetActorTransaction(mySk, targetPk, ecosystemPk, date)
		this._addTransaction(tx)
		return tx
	}

	setPayer(mySk, ecosystemPk, targetPk, cap, date = new Date()) {
		this._assertOwner(mySk)
		this.#assertValidCap(cap)
		const tx = new SetPayerTransaction(mySk, targetPk, cap, ecosystemPk, date)
		this._addTransaction(tx)
		return tx
	}

	unsetPayer(mySk, ecosystemPk, targetPk, date = new Date()) {
		this._assertOwner(mySk)
		const tx = new UnsetPayerTransaction(mySk, targetPk, ecosystemPk, date)
		this._addTransaction(tx)
		return tx
	}

	pay(mySk, targetPk, amount, d = new Date()) {
		this._assertOwner(mySk)
		const money = this.getAvailableMoney(amount)
		if (money.length === 0) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		const transaction = new PayTransaction(mySk, targetPk, d, money)
		this._addTransaction(transaction)
		this.removeMoney(money)
		if (targetPk === this.getMyPublicKey()) {
			this.lastblock.experience += money.length
		}
		return transaction
	}

	/**
	 * Add to last block and return a transaction creating a paper of given amount
	 *
	 * Throws an error if amount is not affordable
	 * Throws an error if given date is before last transaction date
	 */
	generatePaper(myPrivateKey, amount, referentPublicKey, date = new Date()) {
		this._assertOwner(myPrivateKey)
		const money = this.getAvailableMoney(amount);
		if (money.length === 0) {
			throw new InvalidTransactionError('Unsufficient funds.')
		}
		if (date < this.getLastTransactionDate()) {
			throw new InvalidTransactionError('Invalid date')
		}
		const transaction = new PaperTransaction(myPrivateKey, referentPublicKey, money, date)
		this._addTransaction(transaction)
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
		return Math.floor(Math.cbrt(this.experience)) + 1
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
		return Math.pow(level, 3) - this.experience
	}

	/**
	 * Return true if the last Transaction added made the Blockchain
	 * level up
	 */
	hasLevelUpOnLastTx() {
		const lastTx = this.lastTransaction;
		const experienceTxTypes = [TXTYPE.PAY, TXTYPE.EARN, TXTYPE.PAPER]
		if (lastTx === null || !experienceTxTypes.includes(lastTx.type)) {
			return false
		}
		return Math.floor(Math.cbrt(this.experience - lastTx.money.length)) + 1 < this.getLevel()
	}

	/**
	 * Replays each block's transactions (oldest to newest within the block) to verify:
	 *   - CREATE transactions mint exactly the amount implied by the level of the
	 *     experience accumulated so far
	 *   - the block's stored experience matches the running total after replay
	 *     (i.e. the experience carried forward from the previous block, plus
	 *     whatever PAY/EARN/PAPER targeting this citizen added)
	 * The oldest block in the checked range has no predecessor to replay from, so
	 * it's skipped — its own genesis invariants are covered by Block.isValid().
	 */
	isValid(depth = 0) {
		try {
			this.assertIsValid(depth)
			return true
		} catch {
			return false
		}
	}

	assertIsValid(depth = 0) {
		super.assertIsValid(depth)

		const blocksToCheck = depth > 0 ? this.blocks.slice(0, depth) : this.blocks
		const ownerKey = this.getMyPublicKey()

		const seenCreateMoney = new Set()
		const seenCreateInvests = new Set()

		for (let i = 0; i < blocksToCheck.length; i++) {
			const block = blocksToCheck[i]

			for (const tx of block.transactions) {
				if (tx.type !== TXTYPE.CREATE) continue
				for (const id of tx.money) {
					if (seenCreateMoney.has(id)) throw new InvalidBlockchainError(`Duplicate CREATE money id ${id} across the chain.`)
					seenCreateMoney.add(id)
				}
				for (const id of tx.invests) {
					if (seenCreateInvests.has(id)) throw new InvalidBlockchainError(`Duplicate CREATE invest id ${id} across the chain.`)
					seenCreateInvests.add(id)
				}
			}

			if (i === blocksToCheck.length - 1) continue
			const olderBlock = blocksToCheck[i + 1]

			let runningExperience = olderBlock.experience
			const chronological = block.transactions.slice().reverse()
			for (const tx of chronological) {
				if (tx.type === TXTYPE.CREATE) {
					const level = Math.floor(Math.cbrt(runningExperience)) + 1
					if (tx.money.length !== level || tx.invests.length !== level)
						throw new InvalidBlockchainError(`CREATE transaction at block index ${i} mints the wrong amount of money/invests for the level implied by accumulated experience.`)
				}
				if (tx.type === TXTYPE.PAY && tx.target === ownerKey) runningExperience += tx.money.length
				if (tx.type === TXTYPE.EARN && tx.target === ownerKey) runningExperience += tx.money.length
				if (tx.type === TXTYPE.PAPER && tx.signer !== ownerKey) runningExperience += tx.money.length
			}

			if (runningExperience !== block.experience)
				throw new InvalidBlockchainError(`Block at index ${i} experience does not match the experience replayed from its transactions.`)
		}
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