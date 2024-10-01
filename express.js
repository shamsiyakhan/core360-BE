const express=require('express')
const cors=require('cors')
const app=express() //express start
app.use(express.json())
app.use(cors())

module.exports=app