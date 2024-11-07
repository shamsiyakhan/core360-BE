console.warn('api func called')
//import express section
const pool = require('../db.js'); //relative path (.. means->current folder se bhar(now on shamsi folder),..again now core360be)
const app = require('../express.js')
const jwt=require('jsonwebtoken')
const secretkey='12345@core360'
app.get('/', (req, res) => {
    res.send({ data: 'api created' })
})

app.post('/login', async (req, res) => {
    console.warn(req.body.email)
    const connection = await pool.getConnection();
    console.warn(connection);
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute('select * from user where email=? and password=?', [req.body.email, req.body.password])
        console.warn(result[0])
        if (result.length == 0) {
            res.send({ error: 'Invalid Credential' })
        } else {
            res.send({ data: await generateToken(result[0]) })
            
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

app.post('/addTask', async (req, res) => {



        const connection = await pool.getConnection();
        const date = new Date();
        try {
            const taskid = await generateUniqueTaskId();
            await connection.beginTransaction();
            const response = await connection.execute(
                `INSERT INTO task (taskid, taskname, assignedby, assignedat, deadline, taskstatus, hourstracked, starttime, endtime, userid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    taskid,
                    req.body.taskname,
                    req.body.assignedby,
                    date,
                    req.body.deadline,
                    req.body.taskstatus,
                    req.body.hourstracked,
                    req.body.starttime,
                    req.body.endtime,
                    req.body.userid,
                ]
            );
            await connection.commit();
            res.status(200).send({
                data: "Task added successfully"
            });
        } catch (error) {
            await connection.rollback();
            res.status(401).send({
                data: "Task addition failed"
            });
        } finally {
            if (connection) {
                connection.release();
            }
        }
   
});


app.get('/getTask/:id', async (req, res) => {
    const connection = await pool.getConnection()
    try {
    const userid=req.params.id
    await connection.beginTransaction() 
    const response=await connection.execute('select * from task where userid=?',[userid])
    res.status(200).send({
        data:response[0]
    })
    await connection.commit()
    }
    catch(error)
    {
        await connection.rollback()
        res.status(410).send(
            {
                errror:"Not Found"
            }
        )
    }
    finally{
        if(connection) 
        {
            connection.release()
        }
    }
})
function generateUniqueId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
async function generateUniqueTaskId() {
    let taskid = generateUniqueId();
    let exists = true;

    while (exists) {
        const [rows] = await pool.query('SELECT * FROM task WHERE taskid = ?', [taskid]);
        if (rows.length === 0) {
            exists = false;
        } else {
            taskid = generateUniqueId();
        }
    }
    return taskid;
}


function generateToken(user){
    const jwtToken=jwt.sign({username:user.username , userid:user.userid , orgid:user.orgid} , secretkey , {expiresIn:'1h'})
    user={...user , jwt:jwtToken}
    return user;
}
