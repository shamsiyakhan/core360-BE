console.warn('api func called')
 //import express section
const pool=require('../../db.js'); //relative path (.. means->current folder se bhar(now on shamsi folder),..again now core360be)
const app=require('../../express.js')

app.get('/',(req,res)=>{
    res.send({data:'api created'})
})

app.post('/forgot',async (req,res)=>{
    console.warn(req.body.email)


    const connection = await pool.getConnection(); 
    console.warn(connection);
    try {
        await connection.beginTransaction();
        const [result]=await connection.execute('select * from user where email=?',[req.body.email])
            console.warn(result)
            if(result.length==0){
                res.send({error:'couldnt find account'})
            }else{
                res.send({data:'otp successfully'})
            }
       

        await connection.commit();

        console.log('Organization and User inserted successfully');
        res.status(200).send({ data: "Organization and User inserted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        res.status(500).send({ error: 'Transaction failed' });
    } finally {
        if (connection) connection.release();
    }

   
})

app.listen('3000',()=>{
    console.warn('api is ruuning on 3000')
})
