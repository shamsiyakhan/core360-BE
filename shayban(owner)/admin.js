const app = require('../express.js');
const pool = require('../db.js');

app.get('/getTeam/:id' , async (req  ,res)=>{
    const connection=await pool.getConnection()
    try{
        const orgId=req.params.id
        await connection.beginTransaction()
        const response=await connection.execute("select * from user where orgid=?", [orgId])
        res.status(200).send({data:response[0   ]})
        await connection.commit()
    }catch(error){
        await connection.rollback()
        res.status(401).send({error:error})
    }
    finally{
        if(connection) await connection.release()
    }
} )