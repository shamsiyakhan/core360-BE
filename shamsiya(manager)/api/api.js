console.warn('api func called')
 //import express section
const pool=require('../../db.js'); //relative path (.. means->current folder se bhar(now on shamsi folder),..again now core360be)
const app=require('../../express.js')

app.get('/',(req,res)=>{
    res.send({data:'api created'})
})

app.post('/forgot',(req,res)=>{
    console.warn(req.body.email)
    pool.query('select * from user where email=?',[req.body.email],(error,result)=>{
        console.warn(result)
        if(!result.length>0){
            res.send({error:'couldnt find account'})
        }else{
            res.send({data:'otp successfully'})
        }
    })
   
})

app.listen('3000',()=>{
    console.warn('api is ruuning on 3000')
})
