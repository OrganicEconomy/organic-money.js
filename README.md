# organic-money.js
A javascript library to use Organic money features

# Getting started
```js
npm install
npm test
```

## Build

```js
npm run build
```

# Usage

Create a brand new Citizen Blockchain :
```
const myBc = new CitizenBlockchain()
const myNewPrivateKey = myBc.startBlockchain('Gus', new Date('28/11/1989'))
```

Then, each day (or any day, holes will be filled), I can create my money :
```
myBc.createMoneyAndInvests(myNewPrivateKey)
```

To pay another citizen, I create a payment transaction and he or she incomes it :
```
const amount = 12
const newTransaction = myBc.pay(myNewPrivateKey, targetPublicKey, amount)

// Then target blockchain can income it :
otherBlockchain.income(newTransaction)
```

# Technical informations

## Hex or binary ?

Every information in blocks and transactions is in hex format.
The only moments the format changes is :
* when exporting blockchain to b64 or bytes
* before importing blockchain from b64 or bytes

## Money and Invests ids

Money Id has this format : ```YYYYMMDDXXX```
For example, the third money unit created on the 6th of november in 2015 would hase id : ```20151106003```

Invest Id has this format : ```YYYYMMDD9XXX```
For example, the fourth invest unit created on the 12th of november in 2025 would hase id : ```202511129004```

This way, you can always follow the limit date of use and also know if its a money or an invest.

## Transactions

There are 11 types of transaction :
* INIT: 0, // Initialization transaction
* CREATE: 1, // Money and Invest creation
* PAY: 2, // Payment
* ENGAGE: 3, // Engagement
* PAPER: 4, // Paper creation or income
* SETADMIN: 5, // Ecosystem admin set
* SETACTOR: 6, // Ecosystem actor set
* SETPAYER: 7, // Ecosystem payer set
* UNSETADMIN: 8, // Ecosystem admin unset
* UNSETACTOR: 9, // Ecosystem actor unset
* UNSETPAYER: 10, // Ecosystem payer unset

A transaction has ALWAYS this content :
```
{
  version: 1, // The current version of the protocol
  date: 20120527, // The date of the transaction as an Integer formated as YYYYMMDD
  type: 2, // An Integer representing the type of transaction
  source: XXXXX, // The public key of source or the transaction
  target: XXXXX, // The public key of the target of the transaction
  signer: 0, // The signer, 0 means it is the same as the source
  money: [], // The list of the money ids involved in the transaction
  invests: [], // The list of the invests ids involved in the transaction
  hash: 0 // The signed hash of the transaction
}
```

## Blocks

A block has ALWAYS this content :
```
{
  version: 1, // The current version of the protocol
  closedate: 20120527, // The date when the block was sealed
  previousHash: xxx, // The hash of the previous block
  signer: xxx, // The public key of the person who signed the block
  money: [], // The currently available money
  invests: [], // The currently available invests
  total: 0, // The currently total (i.e economic experiment)
  merkleroot: xxx, // The merkle root made of the block's transactions hashes
  transactions: [] // The list of transactions of the block
}
```

# Some phylosophical thoughts

## About papers

The organic money always **MUST be compatible between numeric and printed paper**.
It MUST be possible for someone to use only one or both of those approaches.

When a citizen creates a Paper, he or she defines the 3rd part key in the target of the Paper.
Then, when another citizen or ecosystem incomes the Paper, he must have the block signed by this particular 3rd part.

This is logical when you understand that papers are for local use only.
So, the 3rd part should be a common ecosystem.
