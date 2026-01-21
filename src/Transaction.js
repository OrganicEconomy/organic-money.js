import { intToDate } from "./crypto.js"

export class Transaction {
    
    constructor(txObj) {
        this.version = txObj.v
        this.date = intToDate(txObj.d)
        this.signer = txObj.s
        this.target = txObj.p
        this.money = txObj.m
        this.invests = txObj.i
        this.type = txObj.t
        this.hash = txObj.h
    }
}