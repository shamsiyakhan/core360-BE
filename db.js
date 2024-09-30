const mysql=require('mysql2')

const pool=mysql.createPool({
    host:'localhost',
    user:'root',
    password:'',
    database:'core360',
    
})
pool.getConnection((error)=>{
    if(error){
        console.warn('database not connected')
    }
    else{
        console.warn('successfully connected')
    }
})

module.exports=pool;