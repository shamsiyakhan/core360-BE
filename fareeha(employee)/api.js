console.warn('api func called')
 //import express section
const pool=require('../db.js'); //relative path (.. means->current folder se bhar(now on shamsi folder),..again now core360be)
const app=require('../express.js')

app.get('/',(req,res)=>{
    res.send({data:'api created'})
})

app.post('/login',async (req,res)=>{
    console.warn(req.body.email)
    const connection = await pool.getConnection(); 
    console.warn(connection);
    try {
        await connection.beginTransaction();
        const [result]=await connection.execute('select * from user where email=? and password=?',[req.body.email,req.body.password])
            console.warn(result)
            if(result.length==0){
                res.send({error:'Invalid Credential'})
            }else{
                res.send({data:result[0]})
            }
       

        await connection.commit();

  
    } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        res.status(500).send({ error: 'Transaction failed' });
    } finally {
        if (connection) connection.release();
    }
   
})


