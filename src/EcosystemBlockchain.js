import { InvalidTransactionError, UnauthorizedError} from './errors.js'
import { Blockchain } from './Blockchain.js'
import { randomPrivateKey, aesEncrypt, aesDecrypt, publicFromPrivate, 
	dateToInt, intToDate, intToIndex, formatMoneyIndex, formatInvestIndex,
	buildInvestIndexes, buildMoneyIndexes } from './crypto.js'

export class EcosystemBlockchain extends Blockchain {
	/**
	 * Return true if the Blockchain has only one Block
	 * which is a Birth Block
	 */
	isWaitingValidation() {
		return this.blocks.length === 1 &&
			this.lastblock.previousHash === Blockchain.ECOREF_HASH
	}

	/**
	 * Return true if the Blockchain has been validated by
	 * a referent
	 */
	isValidated() {
		return !this.isEmpty() && this.blocks.length >= 2 &&
			this.blocks[this.blocks.length - 1].previousHash === Blockchain.ECOREF_HASH
	}

	/**
	 * Return the birthblock based on given informations
	 */
	makeBirthBlock(privateKey, adminKey, name, date = new Date()) {
		const publicKey = publicFromPrivate(privateKey)
		let block = {
			version: Blockchain.VERSION,
			closedate: dateToInt(date),
			previousHash: Blockchain.ECOREF_HASH,
			signer: publicKey,
			merkleroot: 0,
			money: [],
			invests: [],
			total: 0,
			transactions: [
				Blockchain.signtx({
					version: Blockchain.VERSION,
					date: dateToInt(date),
					source: publicKey,
					target: name,
					signer: 0,
					money: [],
					invests: [],
					type: Blockchain.TXTYPE.INIT
				}, privateKey),
				Blockchain.signtx({
					version: Blockchain.VERSION,
					date: dateToInt(date),
					source: publicKey,
					target: adminKey,
					signer: 0,
					money: [],
					invests: [],
					type: Blockchain.TXTYPE.SETADMIN
				}, privateKey)
			]
		}
		block = Blockchain.signblock(block, privateKey)
		this.addBlock(block)
		return block
	}

	/**
	 * Initalize Blockchain and return its private key
	 * If no newPrivateKey is given, make one
	 * If no date is given, use today
	 */
	startBlockchain(name, signerPrivateKey, adminKey, newPrivateKey = null, date = new Date()) {
		newPrivateKey = newPrivateKey || randomPrivateKey()
		const birthblock = this.makeBirthBlock(newPrivateKey, adminKey, name, date)
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