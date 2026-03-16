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
const myBlockchain = new CitizenBlockchain()
const mySecretKey = myBlockchain.startBlockchain('Gus', new Date('28/11/1989'), referentSecretKey)
```

Then, each day (or any day, holes will be filled), I create my money :
```
myBlockchain.createMoneyAndInvests(mySecretKey)
```

To pay another citizen, I create a payment transaction and he or she incomes it :
```
const amount = 12
// First I create the transaction (what adds it to my blockchain)
const transaction = myBlockchain.pay(mySecretKey, targetPublicKey, amount)

// Then target blockchain can income it :
otherBlockchain.addTransaction(transaction)
```

# Technical informations

## Hex

Every information in blocks and transactions is in hex format.

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
  v / version: 1,      // The current version of the protocol
  d / date: 20120527,  // The date of the transaction as an Integer formated as YYYYMMDD
  t / type: 2,         // An Integer representing the type of transaction
  p / target: XXXXX,   // The public key of the target of the transaction
  s / signer: XXXXX,   // The public key of the signer of the transaction
  m / money: [],       // The list of the money ids involved in the transaction
  i / invests: [],     // The list of the invests ids involved in the transaction
  h / hash: XXXXX      // The signed hash of the transaction
}
```

## About dates

* Dates are stored in int format : YYYYMMDD.
  * Month MM and Day DD start from 1.
  * So the 1st of July 2016 is the int 20160601

Utils functions to use one or the other :

```js
const d = new date()
const intDate = dateToint(d)
const backToDate = intToDate(intDate)
```

## About peremption dates

* A transaction can be added only if its creation date is after last closed block.
* In a block, transactions can have variable dates, even in disorder :
  * Exaaple : a citizen can cash a paper at the end of the month while he had some digital payments before.
* But a block cannot contain a transaction with a date BEFORE the close date of previous block.
* Block cannot either contain a transaction with a date AFTER it's own close date.

### Paper

A Paper is a transaction which represents a printed currency.
As we don't know in advance the target of the Paper, it's *target* field is filled with the public key of the local ecosystem in charge of papers handling.
The *source* field is always the creator citizen public key.

## Blocks

A block has ALWAYS this content :
```
{
  v / version: 1,           // The current version of the protocol
  d / closedate: 20120527,  // The date when the block was sealed
  p / previousHash: xxx,    // The hash of the previous block
  s / signer: xxx,          // The public key of the person who signed the block
  m / money: [],            // The currently available money
  i / invests: [],          // The currently available invests
  t / total: 0,             // The currently total (i.e economic experience)
  r / merkleroot: xxx,      // The merkle root made of the block's transactions hashes
  h / signature: xxx,       // The signed hash of the block
  x / transactions: []      // The list of transactions of the block
}
```

# Some phylosophical thoughts

## About papers

The organic money always **MUST be compatible between numeric and printed paper**.
It MUST be possible for someone to use only one or both of those approaches.

When a citizen creates a Paper, he or she defines the 3rd part key in the target of the Paper.
Then, when another citizen or ecosystem wants to income the Paper, he must have the container block signed by this particular 3rd part.

This is logical when you understand that papers are for local use only.
So, the 3rd part should be a common ecosystem.
