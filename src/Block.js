import { intToDate } from "./crypto.js"

export class Block {
    
    constructor(blockObj) {
        this.version = blockObj.v
        this.date = intToDate(blockObj.d)
        this.previousHash = blockObj.p
        this.signer = blockObj.s
        this.root = blockObj.r
        this.money = blockObj.m
        this.invests = blockObj.i
        this.total = blockObj.t
        this.hash = blockObj.h
        this.transactions = blockObj.x
    }
}