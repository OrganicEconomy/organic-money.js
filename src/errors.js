export class InvalidTransactionError extends Error {
	constructor(message) {
		super(message);
		this.name = "InvalidTransactionError";
	}
}

export class UnauthorizedError extends Error {
	constructor(message) {
		super(message);
		this.name = "UnauthorizedError";
	}
}