const jwtMiddleware = require('./jwt');
const express=require('express')
const cors=require('cors')
const app=express() //express start

app.use(express.json())
app.use(cors())
app.use(jwtMiddleware); 

app.listen('3000',()=>{
    console.warn('api is ruuning on 3000')
})

module.exports=app